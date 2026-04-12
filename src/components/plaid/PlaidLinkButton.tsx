'use client';

import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Landmark, Loader2, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface PlaidAccount {
  id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  currency: string;
}

interface PlaidItem {
  id: string;
  institution_name: string;
  last_synced_at: string | null;
  plaid_accounts: PlaidAccount[];
}

interface PlaidLinkButtonProps {
  onConnected?: () => void;
}

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export function PlaidLinkButton({ onConnected }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ added: number; modified: number } | null>(null);

  const fetchItems = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;

    const res = await fetch('/api/plaid/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
    setItemsLoaded(true);
  }, []);

  // Load items on mount
  useState(() => {
    fetchItems();
  });

  const getLinkToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Non authentifié');

      const res = await fetch('/api/plaid/link-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur Plaid');
      setLinkToken(data.link_token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Non authentifié');

        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ public_token, metadata }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur de connexion');

        // Auto-sync after connecting
        await handleSync();
        await fetchItems();
        onConnected?.();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setLinkToken(null);
      }
    },
    onExit: () => {
      setLinkToken(null);
      setLoading(false);
    },
  });

  // Open Plaid Link when token is ready
  useState(() => {
    if (linkToken && ready) {
      open();
    }
  });

  const handleConnect = async () => {
    await getLinkToken();
  };

  // Effect to open when ready
  if (linkToken && ready) {
    open();
  }

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Non authentifié');

      const res = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de synchronisation');

      setSyncResult({ added: data.added, modified: data.modified });
      await fetchItems();
      onConnected?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (itemId: string) => {
    if (!confirm('Déconnecter ce compte bancaire ? Les transactions synchronisées seront conservées.')) return;
    const token = await getAuthToken();
    if (!token) return;

    await fetch(`/api/plaid/items/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchItems();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {syncResult && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
          <CheckCircle2 size={15} />
          Synchronisation terminée — {syncResult.added} ajoutées, {syncResult.modified} modifiées
        </div>
      )}

      {/* Connected institutions */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    <Landmark size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.institution_name}</p>
                    {item.last_synced_at && (
                      <p className="text-xs text-gray-400">
                        Dernière sync: {new Date(item.last_synced_at).toLocaleDateString('fr-CA')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync()}
                    disabled={syncing}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-tenir-600 bg-tenir-50 hover:bg-tenir-100 rounded-lg transition-colors"
                  >
                    {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Sync
                  </button>
                  <button
                    onClick={() => handleDisconnect(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Déconnecter"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {item.plaid_accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm text-gray-800">{acc.name}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {acc.subtype || acc.type}
                        {acc.mask && ` ····${acc.mask}`}
                      </p>
                    </div>
                    {acc.current_balance !== null && (
                      <p className="text-sm font-semibold text-gray-900">
                        {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: acc.currency || 'CAD' }).format(acc.current_balance)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect button */}
      <Button
        onClick={handleConnect}
        disabled={loading || syncing}
        variant="primary"
        icon={loading ? <Loader2 size={16} className="animate-spin" /> : <Landmark size={16} />}
        className="w-full"
      >
        {loading ? 'Connexion…' : items.length > 0 ? 'Connecter un autre compte' : 'Connecter votre banque'}
      </Button>

      {items.length > 0 && (
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          icon={syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          className="w-full"
        >
          {syncing ? 'Synchronisation…' : 'Synchroniser toutes les transactions'}
        </Button>
      )}
    </div>
  );
}
