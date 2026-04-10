'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatDate, formatPercent, cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import {
  Plus, TrendingUp, DollarSign, ArrowUpRight, ArrowDownLeft, Trash2, Edit2,
  Building2, Home, ChevronDown, ChevronRight, Users, MapPin, Link2, Unlink,
  CheckCircle, AlertCircle, RefreshCw, Wifi, WifiOff, Search, X, Loader2,
  Landmark, Receipt, PercentCircle,
} from 'lucide-react';
import type { QuoteResult } from '@/app/api/investments/quote/route';
import type { SymbolSuggestion } from '@/app/api/investments/search/route';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = 'portfolio' | 'realestate';

interface Investment {
  id: string;
  organization_id: string;
  symbol: string;
  name: string;
  type: string;
  shares: number;
  purchase_price: number;
  purchase_date: string;
  adjusted_cost_base: number | null;
  current_price: number | null;
  currency: string;
  account_type: string | null;
  notes: string | null;
  sold: boolean;
  sale_price: number | null;
  sale_date: string | null;
}

interface DividendRecord {
  id: string;
  organization_id: string;
  investment_id: string | null;
  amount: number;
  dividend_type: 'eligible' | 'non_eligible' | 'capital' | 'foreign';
  date: string;
  payer: string | null;
  currency: string;
  withholding_tax: number | null;
}

interface RentalProperty {
  id: string;
  organization_id: string;
  address: string;
  city: string;
  province: string;
  postal_code: string | null;
  nickname: string | null;
  property_type: string;
  purchase_price: number | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  // Mortgage fields
  mortgage_lender: string | null;
  mortgage_original_amount: number | null;
  mortgage_balance: number | null;
  mortgage_interest_rate: number | null;
  mortgage_amortization_years: number | null;
  mortgage_term_years: number | null;
  mortgage_start_date: string | null;
  mortgage_payment_frequency: string | null;
  mortgage_payment_amount: number | null;
  building_value_pct: number | null;
}

interface RentalUnit {
  id: string;
  property_id: string;
  unit_number: string;
  tenant_name: string | null;
  tenant_email: string | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number;
  is_vacant: boolean;
  notes: string | null;
}

interface RentTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  vendor: string | null;
  property_id: string | null;
  category: string;
}

interface ExpenseTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  vendor: string | null;
  property_id: string | null;
  category: string;
  type: string;
}

// ─── Investment Modal ─────────────────────────────────────────────────────────

interface InvestmentFormData {
  symbol: string; name: string; type: string; shares: number;
  purchase_price: number; purchase_date: string; current_price: number;
  currency: string; account_type: string; notes: string;
}

const YTYPE_TO_APP: Record<string, string> = {
  EQUITY: 'stock', ETF: 'etf', MUTUALFUND: 'mutual_fund',
  INDEX: 'other', FUTURE: 'other', CURRENCY: 'other',
};

function SymbolSearch({ value, locked, onSelect, onClear }: {
  value: string;
  locked: boolean;
  onSelect: (s: SymbolSuggestion, price: number, currency: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery]         = useState(value);
  const [results, setResults]     = useState<SymbolSuggestion[]>([]);
  const [open, setOpen]           = useState(false);
  const [searching, setSearching] = useState(false);
  const [fetching, setFetching]   = useState(false);
  const [dropPos, setDropPos]     = useState<{ top: number; left: number; width: number } | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);   // ref on the portaled dropdown

  // Close dropdown only when click is outside BOTH the input wrapper AND the portaled dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      const inWrap = wrapRef.current?.contains(e.target as Node);
      const inDrop = dropRef.current?.contains(e.target as Node);
      if (!inWrap && !inDrop) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Compute portal position from input rect
  function updatePos() {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }

  // Debounced search
  useEffect(() => {
    if (locked || query.length < 1) { setResults([]); setOpen(false); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/investments/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const list: SymbolSuggestion[] = data.results ?? [];
        setResults(list);
        if (list.length > 0) { updatePos(); setOpen(true); }
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [query, locked]);

  async function handlePick(s: SymbolSuggestion) {
    setOpen(false);
    setQuery(s.symbol);
    setFetching(true);
    try {
      const res  = await fetch(`/api/investments/quote?symbols=${s.symbol}`);
      const data = await res.json();
      const q    = data[s.symbol];
      onSelect(s, q?.price ?? 0, q?.currency ?? 'CAD');
    } catch {
      onSelect(s, 0, 'CAD');
    } finally { setFetching(false); }
  }

  if (locked) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1.5">Symbole</p>
        <div className="flex items-center gap-2 px-3 py-2 bg-tenir-50 border border-tenir-200 rounded-xl">
          <span className="font-bold text-tenir-700 text-sm">{value}</span>
          {fetching && <Loader2 size={12} className="animate-spin text-tenir-400" />}
          <button type="button" onClick={onClear} className="ml-auto text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  // Portaled dropdown — escapes modal's overflow-y-auto
  const dropdown = open && results.length > 0 && dropPos
    ? createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden"
        >
          {results.map((s) => (
            <button
              key={s.symbol}
              type="button"
              onClick={() => handlePick(s)}   // onClick (not onMouseDown) — fires after mousedown bubbles
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-tenir-50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{s.symbol}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">{s.typeLabel}</span>
                  {s.exchange && <span className="text-xs text-gray-400">{s.exchange}</span>}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{s.shortName}</p>
              </div>
            </button>
          ))}
          <p className="text-[10px] text-gray-400 px-4 py-2 border-t border-gray-50 bg-gray-50">
            Sélectionnez un résultat pour verrouiller le symbole et charger le cours en temps réel
          </p>
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={wrapRef} className="relative">
      <p className="text-xs font-medium text-gray-600 mb-1.5">Symbole <span className="text-red-400">*</span></p>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) { updatePos(); setOpen(true); } }}
          placeholder="Rechercher RY.TO, AAPL, Banque Royale…"
          className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400 transition-all"
        />
        {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>
      {dropdown}
    </div>
  );
}

function InvestmentModal({ isOpen, onClose, onSubmit, initialData }: {
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: InvestmentFormData) => void;
  initialData?: InvestmentFormData & { id?: string };
}) {
  const t = useTranslations('investments');
  const commonT = useTranslations('common');

  const blank: InvestmentFormData = {
    symbol: '', name: '', type: 'stock', shares: 0,
    purchase_price: 0, purchase_date: new Date().toISOString().split('T')[0],
    current_price: 0, currency: 'CAD', account_type: '', notes: '',
  };

  const [fd, setFd]         = useState<InvestmentFormData>(initialData ?? blank);
  const [locked, setLocked] = useState(!!initialData?.symbol);

  // Reset when modal opens/closes or initialData changes
  useEffect(() => {
    setFd(initialData ?? blank);
    setLocked(!!initialData?.symbol);
  }, [isOpen]);

  function handleSymbolSelect(s: SymbolSuggestion, price: number, currency: string) {
    setFd((prev) => ({
      ...prev,
      symbol:        s.symbol,
      name:          s.shortName,
      type:          YTYPE_TO_APP[s.type] ?? 'stock',
      currency,
      current_price: price,
    }));
    setLocked(true);
  }

  const canSubmit = locked && fd.shares > 0 && fd.purchase_price > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={initialData?.id ? 'Modifier le placement' : t('addInvestment')}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>{commonT('cancel')}</Button>
          <Button variant="primary" fullWidth disabled={!canSubmit} onClick={() => { onSubmit(fd); onClose(); }}>
            {commonT('save')}
          </Button>
        </div>
      }>
      <div className="space-y-4">
        {/* Symbol search — locked once selected */}
        <SymbolSearch
          value={fd.symbol}
          locked={locked}
          onSelect={handleSymbolSelect}
          onClear={() => { setFd({ ...fd, symbol: '', name: '', current_price: 0 }); setLocked(false); }}
        />

        {locked && (
          <>
            {/* Auto-filled name — editable */}
            <Input label="Nom du titre" value={fd.name}
              onChange={(e) => setFd({ ...fd, name: e.target.value })} required />

            <div className="grid grid-cols-2 gap-4">
              <Select label="Type" value={fd.type} onChange={(v) => setFd({ ...fd, type: v as string })} options={[
                { value: 'stock', label: 'Action' }, { value: 'etf', label: 'FNB / ETF' },
                { value: 'bond', label: 'Obligation' }, { value: 'gic', label: 'CPG' },
                { value: 'mutual_fund', label: 'Fonds commun' }, { value: 'other', label: 'Autre' },
              ]} />
              <Select label="Devise" value={fd.currency} onChange={(v) => setFd({ ...fd, currency: v as string })}
                options={[{ value: 'CAD', label: 'CAD' }, { value: 'USD', label: 'USD' }]} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input label="Nombre de titres" type="number" step="0.0001" value={fd.shares || ''}
                onChange={(e) => setFd({ ...fd, shares: parseFloat(e.target.value) || 0 })} required />
              <Input label="Prix d'achat / titre" type="number" step="0.01" value={fd.purchase_price || ''}
                onChange={(e) => setFd({ ...fd, purchase_price: parseFloat(e.target.value) || 0 })}
                helperText="Coût moyen" required />
              <div>
                <Input label="Cours actuel / titre" type="number" step="0.01" value={fd.current_price || ''}
                  onChange={(e) => setFd({ ...fd, current_price: parseFloat(e.target.value) || 0 })}
                  helperText="Chargé automatiquement" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Date d'achat" type="date" value={fd.purchase_date}
                onChange={(e) => setFd({ ...fd, purchase_date: e.target.value })} />
              <Input label="Notes" value={fd.notes}
                onChange={(e) => setFd({ ...fd, notes: e.target.value })} />
            </div>

            {/* Live price preview */}
            {fd.current_price > 0 && fd.shares > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                <span className="text-gray-500">Valeur marchande estimée</span>
                <span className="font-bold text-gray-900">{formatCurrency(fd.current_price * fd.shares)} {fd.currency}</span>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Property Modal ───────────────────────────────────────────────────────────

interface PropertyFormData {
  address: string; city: string; province: string; postal_code: string;
  nickname: string; property_type: string; purchase_price: string; purchase_date: string; notes: string;
  building_value_pct: string;
  // Mortgage
  has_mortgage: boolean;
  mortgage_lender: string;
  mortgage_original_amount: string;
  mortgage_balance: string;
  mortgage_interest_rate: string;
  mortgage_amortization_years: string;
  mortgage_term_years: string;
  mortgage_start_date: string;
  mortgage_payment_frequency: string;
  mortgage_payment_amount: string;
}

function PropertyModal({ isOpen, onClose, onSubmit, initialData }: {
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: PropertyFormData) => void;
  initialData?: Partial<PropertyFormData>;
}) {
  const blank: PropertyFormData = {
    address: '', city: '', province: 'QC', postal_code: '',
    nickname: '', property_type: 'residential', purchase_price: '', purchase_date: '', notes: '',
    building_value_pct: '80',
    has_mortgage: false,
    mortgage_lender: '', mortgage_original_amount: '', mortgage_balance: '',
    mortgage_interest_rate: '', mortgage_amortization_years: '', mortgage_term_years: '',
    mortgage_start_date: '', mortgage_payment_frequency: 'monthly', mortgage_payment_amount: '',
  };
  const [fd, setFd] = useState<PropertyFormData>({ ...blank, ...initialData });
  useEffect(() => { setFd({ ...blank, ...initialData }); }, [isOpen]);

  const f = (key: keyof PropertyFormData, val: any) => setFd((p) => ({ ...p, [key]: val }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData?.address ? "Modifier l'immeuble" : 'Ajouter un immeuble'} size="lg"
      footer={<div className="flex gap-3"><Button variant="ghost" fullWidth onClick={onClose}>Annuler</Button><Button variant="primary" fullWidth onClick={() => { onSubmit(fd); onClose(); }}>Enregistrer</Button></div>}>
      <div className="space-y-4">
        {/* Address */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Input label="Adresse civique" value={fd.address} onChange={(e) => f('address', e.target.value)} placeholder="123 rue Principale" required />
          </div>
          <Input label="Surnom (optionnel)" value={fd.nickname} onChange={(e) => f('nickname', e.target.value)} placeholder="Duplex Laval" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Ville" value={fd.city} onChange={(e) => f('city', e.target.value)} placeholder="Montréal" />
          <Select label="Province" value={fd.province} onChange={(v) => f('province', v as string)}
            options={['QC','ON','BC','AB','MB','SK','NS','NB','NL','PE'].map((p) => ({ value: p, label: p }))} />
          <Input label="Code postal" value={fd.postal_code} onChange={(e) => f('postal_code', e.target.value)} placeholder="H1A 1A1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Type de propriété" value={fd.property_type} onChange={(v) => f('property_type', v as string)}
            options={[
              { value: 'residential', label: 'Résidentiel (unifamilial)' },
              { value: 'multi_unit', label: 'Multilogement (duplex/triplex…)' },
              { value: 'condo', label: 'Condo' },
              { value: 'commercial', label: 'Commercial' },
            ]} />
          <Input label="Date d'acquisition" type="date" value={fd.purchase_date} onChange={(e) => f('purchase_date', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Prix d'achat ($)" type="number" step="0.01" value={fd.purchase_price} onChange={(e) => f('purchase_price', e.target.value)} placeholder="0.00" />
          <Input label="% valeur bâtiment (CCA)" type="number" min="0" max="100" step="1" value={fd.building_value_pct}
            onChange={(e) => f('building_value_pct', e.target.value)} helperText="Part de l'immeuble excluant le terrain (défaut 80%)" />
        </div>
        <Input label="Notes" value={fd.notes} onChange={(e) => f('notes', e.target.value)} />

        {/* Mortgage toggle */}
        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${fd.has_mortgage ? 'bg-tenir-500' : 'bg-gray-200'}`}
              onClick={() => f('has_mortgage', !fd.has_mortgage)}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${fd.has_mortgage ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Landmark size={14} className="text-gray-400" /> Hypothèque sur cet immeuble
            </span>
          </label>
        </div>

        {fd.has_mortgage && (
          <div className="space-y-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Prêteur" value={fd.mortgage_lender} onChange={(e) => f('mortgage_lender', e.target.value)} placeholder="Banque Nationale, Desjardins…" />
              <Input label="Date de début" type="date" value={fd.mortgage_start_date} onChange={(e) => f('mortgage_start_date', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Montant original ($)" type="number" step="0.01" value={fd.mortgage_original_amount} onChange={(e) => f('mortgage_original_amount', e.target.value)} placeholder="350 000" />
              <Input label="Solde actuel ($)" type="number" step="0.01" value={fd.mortgage_balance} onChange={(e) => f('mortgage_balance', e.target.value)} placeholder="298 000" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Taux d'intérêt (%)" type="number" step="0.01" value={fd.mortgage_interest_rate}
                onChange={(e) => f('mortgage_interest_rate', e.target.value)} placeholder="5.25" helperText="Taux nominal annuel" />
              <Input label="Amortissement (ans)" type="number" step="1" value={fd.mortgage_amortization_years}
                onChange={(e) => f('mortgage_amortization_years', e.target.value)} placeholder="25" />
              <Input label="Terme (ans)" type="number" step="1" value={fd.mortgage_term_years}
                onChange={(e) => f('mortgage_term_years', e.target.value)} placeholder="5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Fréquence des paiements" value={fd.mortgage_payment_frequency}
                onChange={(v) => f('mortgage_payment_frequency', v as string)}
                options={[
                  { value: 'monthly', label: 'Mensuel (12×/an)' },
                  { value: 'biweekly', label: 'Aux 2 semaines (26×/an)' },
                  { value: 'weekly', label: 'Hebdomadaire (52×/an)' },
                ]} />
              <Input label="Montant par paiement ($)" type="number" step="0.01" value={fd.mortgage_payment_amount}
                onChange={(e) => f('mortgage_payment_amount', e.target.value)} placeholder="1 650" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Unit Modal ───────────────────────────────────────────────────────────────

interface UnitFormData {
  unit_number: string; tenant_name: string; tenant_email: string;
  lease_start: string; lease_end: string; monthly_rent: string; is_vacant: boolean; notes: string;
}

function UnitModal({ isOpen, onClose, onSubmit, initialData }: {
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: UnitFormData) => void;
  initialData?: Partial<UnitFormData>;
}) {
  const [fd, setFd] = useState<UnitFormData>({
    unit_number: '', tenant_name: '', tenant_email: '',
    lease_start: '', lease_end: '', monthly_rent: '', is_vacant: false, notes: '',
    ...initialData,
  });
  useEffect(() => { if (initialData) setFd((p) => ({ ...p, ...initialData })); }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData?.unit_number ? 'Modifier l\'unité' : 'Ajouter une unité'} size="md"
      footer={<div className="flex gap-3"><Button variant="ghost" fullWidth onClick={onClose}>Annuler</Button><Button variant="primary" fullWidth onClick={() => { onSubmit(fd); onClose(); }}>Enregistrer</Button></div>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Numéro d'unité" value={fd.unit_number} onChange={(e) => setFd({ ...fd, unit_number: e.target.value })} placeholder="101, Apt A, RDC…" required />
          <Input label="Loyer mensuel ($)" type="number" step="0.01" value={fd.monthly_rent} onChange={(e) => setFd({ ...fd, monthly_rent: e.target.value })} placeholder="1200.00" required />
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input type="checkbox" id="vacant" checked={fd.is_vacant} onChange={(e) => setFd({ ...fd, is_vacant: e.target.checked })} className="w-4 h-4 text-tenir-600 rounded" />
          <label htmlFor="vacant" className="text-sm font-medium text-gray-700">Unité vacante</label>
        </div>
        {!fd.is_vacant && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nom du locataire" value={fd.tenant_name} onChange={(e) => setFd({ ...fd, tenant_name: e.target.value })} />
              <Input label="Courriel" type="email" value={fd.tenant_email} onChange={(e) => setFd({ ...fd, tenant_email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Début du bail" type="date" value={fd.lease_start} onChange={(e) => setFd({ ...fd, lease_start: e.target.value })} />
              <Input label="Fin du bail" type="date" value={fd.lease_end} onChange={(e) => setFd({ ...fd, lease_end: e.target.value })} />
            </div>
          </>
        )}
        <Input label="Notes" value={fd.notes} onChange={(e) => setFd({ ...fd, notes: e.target.value })} />
      </div>
    </Modal>
  );
}

// ─── Link Rent Modal ──────────────────────────────────────────────────────────

function LinkRentModal({ property, unlinkedIncome, onClose, onLink, onUnlink }: {
  property: RentalProperty;
  unlinkedIncome: RentTransaction[];
  linkedToProperty: RentTransaction[];
  onClose: () => void;
  onLink: (txId: string) => void;
  onUnlink: (txId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = unlinkedIncome.filter((tx) => {
    const q = search.toLowerCase();
    return !q || tx.description.toLowerCase().includes(q) || (tx.vendor || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Lier des revenus de loyer</h2>
            <p className="text-xs text-gray-400 mt-0.5">{property.nickname || property.address}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
        </div>
        <div className="px-6 pt-4 pb-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une transaction…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-1.5 mt-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune transaction de revenu non liée</p>
          ) : (
            filtered.map((tx) => (
              <button key={tx.id} onClick={() => onLink(tx.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-tenir-200 hover:bg-tenir-50/30 transition-all text-left group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400">{tx.date}{tx.vendor ? ` · ${tx.vendor}` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(tx.amount)}</p>
                  <span className="text-xs text-tenir-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Lier →</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Link Expense Modal ───────────────────────────────────────────────────────

function LinkExpenseModal({ property, unlinkedExpenses, onClose, onLink, onUnlink }: {
  property: RentalProperty;
  unlinkedExpenses: ExpenseTransaction[];
  onClose: () => void;
  onLink: (txId: string) => void;
  onUnlink: (txId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = unlinkedExpenses.filter((tx) => {
    const q = search.toLowerCase();
    return !q || tx.description.toLowerCase().includes(q) || (tx.vendor || '').toLowerCase().includes(q) || tx.category.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Lier des dépenses</h2>
            <p className="text-xs text-gray-400 mt-0.5">{property.nickname || property.address}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
        </div>
        <div className="px-6 pt-4 pb-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une dépense…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-1.5 mt-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune dépense non liée trouvée</p>
          ) : (
            filtered.map((tx) => (
              <button key={tx.id} onClick={() => onLink(tx.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-all text-left group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400">{tx.date} · {tx.category}{tx.vendor ? ` · ${tx.vendor}` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-red-600">{formatCurrency(Math.abs(tx.amount))}</p>
                  <span className="text-xs text-tenir-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Lier →</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CCA helper ───────────────────────────────────────────────────────────────

function calcCCA(purchasePrice: number | null, buildingPct: number, purchaseDate: string | null) {
  if (!purchasePrice || !purchaseDate) return null;
  const buildingCost = purchasePrice * (buildingPct / 100);
  const acquired = new Date(purchaseDate);
  const now = new Date();
  // Number of completed tax years since acquisition
  let yearsHeld = now.getFullYear() - acquired.getFullYear();
  if (now.getMonth() < acquired.getMonth() || (now.getMonth() === acquired.getMonth() && now.getDate() < acquired.getDate())) {
    yearsHeld -= 1;
  }

  // Year of acquisition: half-year rule — only 50% of 4% = 2%
  if (yearsHeld <= 0) {
    return { buildingCost, ucc: buildingCost, annualCCA: buildingCost * 0.02, yearsHeld: 0 };
  }
  // Year 1: apply half-year rate; subsequent years: full 4% declining balance
  let ucc = buildingCost * (1 - 0.02);
  for (let i = 1; i < yearsHeld; i++) ucc *= (1 - 0.04);
  return { buildingCost, ucc, annualCCA: ucc * 0.04, yearsHeld };
}

// Mortgage payment breakdown (Canadian semi-annual compounding)
function calcMortgageBreakdown(balance: number, annualRatePct: number, frequency: string, payment: number) {
  const periodsPerYear = frequency === 'weekly' ? 52 : frequency === 'biweekly' ? 26 : 12;
  const r = annualRatePct / 100;
  const effectiveRate = Math.pow(1 + r / 2, 2 / periodsPerYear) - 1;
  const interest = balance * effectiveRate;
  const principal = Math.max(0, payment - interest);
  const annualInterest = interest * periodsPerYear;
  const annualPrincipal = principal * periodsPerYear;
  return { interest, principal, annualInterest, annualPrincipal };
}

// ─── Property Card ────────────────────────────────────────────────────────────

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residential: 'Résidentiel', multi_unit: 'Multilogement', condo: 'Condo', commercial: 'Commercial',
};

function PropertyCard({
  property, units, linkedTx, linkedExpenses,
  onAddUnit, onEditUnit, onDeleteUnit, onDeleteProperty, onEditProperty,
  onLinkRent, onUnlinkRent, onLinkExpense, onUnlinkExpense,
}: {
  property: RentalProperty;
  units: RentalUnit[];
  linkedTx: RentTransaction[];
  linkedExpenses: ExpenseTransaction[];
  onAddUnit: (propertyId: string) => void;
  onEditUnit: (unit: RentalUnit) => void;
  onDeleteUnit: (unitId: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  onEditProperty: (property: RentalProperty) => void;
  onLinkRent: (property: RentalProperty) => void;
  onUnlinkRent: (txId: string) => void;
  onLinkExpense: (property: RentalProperty) => void;
  onUnlinkExpense: (txId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalExpected = units.filter((u) => !u.is_vacant).reduce((s, u) => s + u.monthly_rent, 0);
  const totalReceived = linkedTx.reduce((s, tx) => s + tx.amount, 0);
  const pct = totalExpected > 0 ? Math.min(100, (totalReceived / totalExpected) * 100) : 0;
  const activeUnits = units.filter((u) => !u.is_vacant).length;
  const vacantUnits = units.filter((u) => u.is_vacant).length;

  // Mortgage breakdown
  const hasMortgage = !!(property.mortgage_balance && property.mortgage_interest_rate && property.mortgage_payment_amount);
  const mortgageBreakdown = hasMortgage
    ? calcMortgageBreakdown(
        property.mortgage_balance!,
        property.mortgage_interest_rate!,
        property.mortgage_payment_frequency || 'monthly',
        property.mortgage_payment_amount!,
      )
    : null;

  // CCA
  const cca = calcCCA(property.purchase_price, property.building_value_pct ?? 80, property.purchase_date);

  // Linked expenses totals
  const totalExpenses = linkedExpenses.reduce((s, tx) => s + Math.abs(tx.amount), 0);

  return (
    <Card padding="none" shadow="sm" className="bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-tenir-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Building2 size={18} className="text-tenir-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {property.nickname && <span className="font-semibold text-gray-900">{property.nickname}</span>}
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', property.nickname ? 'text-gray-400 bg-gray-50' : 'text-gray-700 font-semibold')}>
                {property.address}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                {PROPERTY_TYPE_LABELS[property.property_type] || property.property_type}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <MapPin size={10} />{[property.city, property.province, property.postal_code].filter(Boolean).join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onLinkRent(property)} title="Lier des loyers"
              className="p-1.5 rounded-lg hover:bg-tenir-50 text-gray-400 hover:text-tenir-600 transition-colors">
              <Link2 size={14} />
            </button>
            <button onClick={() => onLinkExpense(property)} title="Lier des dépenses"
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <Receipt size={14} />
            </button>
            <button onClick={() => onAddUnit(property.id)} title="Ajouter une unité"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
              <Plus size={14} />
            </button>
            <button onClick={() => onEditProperty(property)} title="Modifier l'immeuble"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
              <Edit2 size={14} />
            </button>
            <button onClick={() => { if (confirm('Supprimer cet immeuble ?')) onDeleteProperty(property.id); }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
            <button onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>

        {/* Summary row */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-400 mb-0.5">Unités</p>
            <p className="text-sm font-bold text-gray-900">{units.length}</p>
            <p className="text-xs text-gray-400">{activeUnits} actives · {vacantUnits} vacantes</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-400 mb-0.5">Loyer attendu/mois</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(totalExpected)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-400 mb-0.5">Loyer reçu (lié)</p>
            <p className={cn('text-sm font-bold', totalReceived >= totalExpected && totalExpected > 0 ? 'text-emerald-600' : 'text-gray-900')}>
              {formatCurrency(totalReceived)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {totalExpected > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Taux de collecte</span>
              <span>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-400' : pct >= 75 ? 'bg-amber-400' : 'bg-red-400')}
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-5 py-3">
          {/* Units */}
          {units.length === 0 ? (
            <div className="text-center py-6">
              <Home size={24} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucune unité — ajoutez des logements à cet immeuble.</p>
              <button onClick={() => onAddUnit(property.id)}
                className="mt-2 text-xs text-tenir-600 hover:text-tenir-700 font-medium flex items-center gap-1 mx-auto">
                <Plus size={11} /> Ajouter une unité
              </button>
            </div>
          ) : (
            <div className="space-y-2 mb-3">
              {units.map((unit) => {
                const leaseActive = unit.lease_end && new Date(unit.lease_end) > new Date();
                const leaseExpiring = unit.lease_end && (() => {
                  const d = (new Date(unit.lease_end).getTime() - Date.now()) / 86400000;
                  return d >= 0 && d <= 60;
                })();
                return (
                  <div key={unit.id} className={cn('flex items-center gap-3 p-3 rounded-xl border', unit.is_vacant ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100')}>
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', unit.is_vacant ? 'bg-gray-100' : 'bg-emerald-50')}>
                      {unit.is_vacant ? <AlertCircle size={14} className="text-gray-400" /> : <CheckCircle size={14} className="text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">Unité {unit.unit_number}</span>
                        {unit.is_vacant && <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Vacant</span>}
                        {leaseExpiring && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Bail expire bientôt</span>}
                      </div>
                      {!unit.is_vacant && unit.tenant_name && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Users size={9} /> {unit.tenant_name}
                          {unit.lease_end && <span className="ml-1 text-gray-400">· Bail jusqu'au {formatDate(unit.lease_end)}</span>}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(unit.monthly_rent)}<span className="text-xs font-normal text-gray-400">/mois</span></p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => onEditUnit(unit)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => { if (confirm('Supprimer cette unité ?')) onDeleteUnit(unit.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Linked rent transactions */}
          {linkedTx.length > 0 && (
            <div className="border-t border-gray-50 pt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Revenus de loyer liés</p>
              <div className="space-y-1">
                {linkedTx.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
                    <div className="min-w-0 flex-1">
                      <span className="text-gray-700 truncate">{tx.description}</span>
                      <span className="text-gray-400 text-xs ml-2">{tx.date}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-semibold text-emerald-600">{formatCurrency(tx.amount)}</span>
                      <button onClick={() => onUnlinkRent(tx.id)} title="Délier"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                        <Unlink size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Mortgage section ── */}
          {hasMortgage && mortgageBreakdown && (
            <div className="border-t border-gray-100 pt-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Landmark size={13} className="text-blue-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Hypothèque</p>
                {property.mortgage_lender && <span className="text-xs text-gray-400">· {property.mortgage_lender}</span>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-blue-400 mb-0.5">Solde actuel</p>
                  <p className="text-sm font-bold text-blue-700">{formatCurrency(property.mortgage_balance!)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-gray-400 mb-0.5">Paiement ({property.mortgage_payment_frequency === 'biweekly' ? 'aux 2 sem.' : property.mortgage_payment_frequency === 'weekly' ? 'hebdo.' : 'mensuel'})</p>
                  <p className="text-sm font-bold text-gray-800">{formatCurrency(property.mortgage_payment_amount!)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-amber-500 mb-0.5">Intérêts / paiement</p>
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(mortgageBreakdown.interest)}</p>
                  <p className="text-xs text-amber-400">{formatCurrency(mortgageBreakdown.annualInterest)} / an</p>
                </div>
                <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-emerald-500 mb-0.5">Capital / paiement</p>
                  <p className="text-sm font-bold text-emerald-700">{formatCurrency(mortgageBreakdown.principal)}</p>
                  <p className="text-xs text-emerald-400">{formatCurrency(mortgageBreakdown.annualPrincipal)} / an</p>
                </div>
              </div>
              {property.mortgage_interest_rate && (
                <p className="text-xs text-gray-400 mt-2">
                  Taux {property.mortgage_interest_rate}% · Amortissement {property.mortgage_amortization_years} ans · Terme {property.mortgage_term_years} ans
                  {' · '}Intérêts déductibles si immeuble locatif
                </p>
              )}
            </div>
          )}

          {/* ── Linked expenses ── */}
          <div className="border-t border-gray-100 pt-4 mt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Receipt size={13} className="text-red-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Dépenses liées</p>
                {linkedExpenses.length > 0 && (
                  <span className="text-xs text-red-600 font-semibold">{formatCurrency(totalExpenses)} total</span>
                )}
              </div>
              <button onClick={() => onLinkExpense(property)}
                className="text-xs text-tenir-600 hover:text-tenir-700 font-medium flex items-center gap-1">
                <Plus size={10} /> Lier
              </button>
            </div>
            {linkedExpenses.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Aucune dépense liée — liez des dépenses (entretien, taxes, assurances…)</p>
            ) : (
              <div className="space-y-1">
                {linkedExpenses.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
                    <div className="min-w-0 flex-1">
                      <span className="text-gray-700 truncate">{tx.description}</span>
                      <span className="text-gray-400 text-xs ml-2">{tx.date} · {tx.category}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-semibold text-red-500">{formatCurrency(Math.abs(tx.amount))}</span>
                      <button onClick={() => onUnlinkExpense(tx.id)} title="Délier"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                        <Unlink size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── CCA / Amortissement ── */}
          {cca && (
            <div className="border-t border-gray-100 pt-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <PercentCircle size={13} className="text-purple-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Amortissement (CCA)</p>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">Classe 1 · 4%</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-purple-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-purple-400 mb-0.5">Coût du bâtiment</p>
                  <p className="text-sm font-bold text-purple-700">{formatCurrency(cca.buildingCost)}</p>
                  <p className="text-xs text-purple-400">{property.building_value_pct ?? 80}% du prix d'achat</p>
                </div>
                <div className="bg-purple-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-purple-400 mb-0.5">FNACC actuelle</p>
                  <p className="text-sm font-bold text-purple-700">{formatCurrency(cca.ucc)}</p>
                  <p className="text-xs text-purple-400">Après {cca.yearsHeld} an{cca.yearsHeld !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-purple-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-purple-400 mb-0.5">DPA max cette année</p>
                  <p className="text-sm font-bold text-purple-700">{formatCurrency(cca.annualCCA)}</p>
                  {cca.yearsHeld === 0 && <p className="text-xs text-purple-400">Règle demi-année</p>}
                </div>
              </div>
              <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Note fiscale :</strong> La DPA (déduction pour amortissement) est optionnelle et ne peut créer une perte locative.
                  Le terrain ({100 - (property.building_value_pct ?? 80)}% estimé) n'est pas amortissable.
                  En cas de vente, la récupération d'amortissement est imposable comme revenu ordinaire.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function PortfolioSummaryCard({ title, value, subtitle, icon: Icon }: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType;
}) {
  return (
    <Card padding="md" shadow="sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 bg-tenir-100 rounded-lg text-tenir-600"><Icon size={24} /></div>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvestmentsPage() {
  const t = useTranslations('investments');
  const commonT = useTranslations('common');
  const { orgId, user, loading: orgLoading } = useOrganization();
  const supabase = createClient();

  const [mainTab, setMainTab] = useState<MainTab>('portfolio');

  // Portfolio state
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editInvestment, setEditInvestment] = useState<(InvestmentFormData & { id: string }) | null>(null);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [quotesUpdatedAt, setQuotesUpdatedAt] = useState<Date | null>(null);

  // Real estate state
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [units, setUnits] = useState<RentalUnit[]>([]);
  const [rentTx, setRentTx] = useState<RentTransaction[]>([]);
  const [expenseTx, setExpenseTx] = useState<ExpenseTransaction[]>([]);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editProperty, setEditProperty] = useState<RentalProperty | null>(null);
  const [showUnitModal, setShowUnitModal] = useState<{ propertyId: string; unit?: RentalUnit } | null>(null);
  const [linkRentProperty, setLinkRentProperty] = useState<RentalProperty | null>(null);
  const [linkExpenseProperty, setLinkExpenseProperty] = useState<RentalProperty | null>(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setDataLoading(true);
    setError(null);
    try {
      const [invRes, divRes, propRes, unitRes, txRes, expRes] = await Promise.all([
        (supabase as any).from('investments').select('*').eq('organization_id', orgId).eq('sold', false).order('created_at', { ascending: false }),
        (supabase as any).from('dividend_records').select('*').eq('organization_id', orgId).order('date', { ascending: false }),
        (supabase as any).from('rental_properties').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
        (supabase as any).from('rental_units').select('*').order('unit_number'),
        (supabase as any).from('transactions').select('id,date,description,amount,vendor,property_id,category,type').eq('organization_id', orgId).eq('type', 'income').order('date', { ascending: false }),
        (supabase as any).from('transactions').select('id,date,description,amount,vendor,property_id,category,type').eq('organization_id', orgId).eq('type', 'expense').order('date', { ascending: false }),
      ]);
      if (invRes.error) throw invRes.error;
      if (propRes.error) throw propRes.error;
      setInvestments(invRes.data || []);
      setDividends(divRes.data || []);
      setProperties(propRes.data || []);
      setUnits(unitRes.data || []);
      setRentTx(txRes.data || []);
      setExpenseTx((expRes as any).data || []);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setDataLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData().then(() => {
      // Auto-refresh quotes after initial data load
      // We read directly to avoid stale closure on `investments`
      if (!orgId) return;
      (supabase as any)
        .from('investments').select('id,symbol,current_price').eq('organization_id', orgId).eq('sold', false)
        .then(({ data }: any) => {
          if (data?.length) refreshQuotes(data);
        });
    });
  }, [fetchData, orgId]);

  // ── Portfolio metrics ──────────────────────────────────────────────────────

  const portfolioBook   = investments.reduce((s, i) => s + i.shares * i.purchase_price, 0);
  const portfolioMarket = investments.reduce((s, i) => s + i.shares * (i.current_price ?? i.purchase_price), 0);
  const unrealizedGain  = portfolioMarket - portfolioBook;
  const ytdDividends    = dividends.reduce((s, d) => s + d.amount, 0);

  // ── Real estate metrics ────────────────────────────────────────────────────

  const allUnitsFlat     = units;
  const totalExpectedMonth = allUnitsFlat.filter((u) => !u.is_vacant).reduce((s, u) => s + u.monthly_rent, 0);
  const totalReceivedYTD   = rentTx.filter((tx) => tx.property_id).reduce((s, tx) => s + tx.amount, 0);
  const vacantCount        = allUnitsFlat.filter((u) => u.is_vacant).length;

  // ── Handlers — Investments ─────────────────────────────────────────────────

  // ── Quote refresh ─────────────────────────────────────────────────────────

  const refreshQuotes = useCallback(async (invList?: Investment[]) => {
    const list = invList ?? investments;
    const seen = new Set<string>();
    const symbols = list.map((i) => i.symbol.toUpperCase()).filter((s) => { if (!s || seen.has(s)) return false; seen.add(s); return true; });
    if (symbols.length === 0) return;

    setQuotesLoading(true);
    setQuotesError(null);
    try {
      const res = await fetch(`/api/investments/quote?symbols=${symbols.join(',')}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Record<string, QuoteResult> = await res.json();
      if (data.error) throw new Error(data.error as any);

      setQuotes(data);
      setQuotesUpdatedAt(new Date());

      // Persist updated prices to DB (only for symbols with valid quotes)
      for (const inv of list) {
        const q = data[inv.symbol.toUpperCase()];
        if (!q || q.error || q.price === 0) continue;
        if (Math.abs(q.price - (inv.current_price ?? 0)) < 0.0001) continue; // no change
        await (supabase as any)
          .from('investments')
          .update({ current_price: q.price, updated_at: new Date().toISOString() })
          .eq('id', inv.id);
      }

      // Update local state with new prices
      setInvestments((prev) =>
        prev.map((inv) => {
          const q = data[inv.symbol.toUpperCase()];
          return q && !q.error && q.price > 0 ? { ...inv, current_price: q.price } : inv;
        })
      );
    } catch (e: any) {
      setQuotesError(e.message || 'Impossible de récupérer les cours');
    } finally {
      setQuotesLoading(false);
    }
  }, [investments]);

  const handleAddInvestment = async (data: InvestmentFormData) => {
    if (!orgId) return;
    const { error } = await (supabase as any).from('investments').insert({
      organization_id: orgId, symbol: data.symbol, name: data.name, type: data.type,
      shares: data.shares, purchase_price: data.purchase_price, purchase_date: data.purchase_date,
      adjusted_cost_base: data.purchase_price, current_price: data.current_price || null,
      currency: data.currency, account_type: data.account_type || null, notes: data.notes || null, sold: false,
    });
    if (error) setError(error.message);
    else fetchData();
  };

  const handleUpdateInvestment = async (data: InvestmentFormData) => {
    if (!editInvestment) return;
    const { error } = await (supabase as any)
      .from('investments')
      .update({
        symbol:        data.symbol,
        name:          data.name,
        type:          data.type,
        shares:        data.shares,
        purchase_price: data.purchase_price,
        purchase_date: data.purchase_date,
        adjusted_cost_base: data.purchase_price,
        current_price: data.current_price || null,
        currency:      data.currency,
        account_type:  data.account_type || null,
        notes:         data.notes || null,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', editInvestment.id);
    if (error) setError(error.message);
    else {
      setInvestments((prev) => prev.map((inv) =>
        inv.id === editInvestment.id
          ? { ...inv, ...data, current_price: data.current_price || null }
          : inv
      ));
    }
    setEditInvestment(null);
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm('Supprimer ce placement ?')) return;
    await (supabase as any).from('investments').delete().eq('id', id);
    setInvestments((p) => p.filter((i) => i.id !== id));
  };

  // ── Handlers — Properties ─────────────────────────────────────────────────

  function mortgagePayload(data: PropertyFormData) {
    if (!data.has_mortgage) return {
      mortgage_lender: null, mortgage_original_amount: null, mortgage_balance: null,
      mortgage_interest_rate: null, mortgage_amortization_years: null, mortgage_term_years: null,
      mortgage_start_date: null, mortgage_payment_frequency: null, mortgage_payment_amount: null,
    };
    return {
      mortgage_lender: data.mortgage_lender || null,
      mortgage_original_amount: data.mortgage_original_amount ? parseFloat(data.mortgage_original_amount) : null,
      mortgage_balance: data.mortgage_balance ? parseFloat(data.mortgage_balance) : null,
      mortgage_interest_rate: data.mortgage_interest_rate ? parseFloat(data.mortgage_interest_rate) : null,
      mortgage_amortization_years: data.mortgage_amortization_years ? parseInt(data.mortgage_amortization_years) : null,
      mortgage_term_years: data.mortgage_term_years ? parseInt(data.mortgage_term_years) : null,
      mortgage_start_date: data.mortgage_start_date || null,
      mortgage_payment_frequency: data.mortgage_payment_frequency || 'monthly',
      mortgage_payment_amount: data.mortgage_payment_amount ? parseFloat(data.mortgage_payment_amount) : null,
    };
  }

  const handleAddProperty = async (data: PropertyFormData) => {
    if (!orgId) return;
    const { error } = await (supabase as any).from('rental_properties').insert({
      organization_id: orgId,
      address: data.address, city: data.city, province: data.province,
      postal_code: data.postal_code || null, nickname: data.nickname || null,
      property_type: data.property_type,
      purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
      purchase_date: data.purchase_date || null, notes: data.notes || null,
      building_value_pct: data.building_value_pct ? parseFloat(data.building_value_pct) : 80,
      ...mortgagePayload(data),
    });
    if (error) setError(error.message);
    else fetchData();
  };

  const handleUpdateProperty = async (data: PropertyFormData) => {
    if (!editProperty) return;
    const { error } = await (supabase as any)
      .from('rental_properties')
      .update({
        address: data.address, city: data.city, province: data.province,
        postal_code: data.postal_code || null, nickname: data.nickname || null,
        property_type: data.property_type,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
        purchase_date: data.purchase_date || null, notes: data.notes || null,
        building_value_pct: data.building_value_pct ? parseFloat(data.building_value_pct) : 80,
        ...mortgagePayload(data),
      })
      .eq('id', editProperty.id);
    if (error) { setError(error.message); return; }
    fetchData();
    setEditProperty(null);
  };

  const handleDeleteProperty = async (id: string) => {
    await (supabase as any).from('rental_properties').delete().eq('id', id);
    setProperties((p) => p.filter((pr) => pr.id !== id));
    setUnits((u) => u.filter((un) => un.property_id !== id));
  };

  // ── Handlers — Units ──────────────────────────────────────────────────────

  const handleSaveUnit = async (data: UnitFormData, propertyId: string, existingId?: string) => {
    const payload = {
      property_id: propertyId,
      unit_number: data.unit_number,
      tenant_name: data.tenant_name || null,
      tenant_email: data.tenant_email || null,
      lease_start: data.lease_start || null,
      lease_end: data.lease_end || null,
      monthly_rent: parseFloat(data.monthly_rent) || 0,
      is_vacant: data.is_vacant,
      notes: data.notes || null,
    };
    if (existingId) {
      await (supabase as any).from('rental_units').update(payload).eq('id', existingId);
    } else {
      await (supabase as any).from('rental_units').insert(payload);
    }
    fetchData();
  };

  const handleDeleteUnit = async (id: string) => {
    await (supabase as any).from('rental_units').delete().eq('id', id);
    setUnits((u) => u.filter((un) => un.id !== id));
  };

  // ── Handlers — Rent linking ───────────────────────────────────────────────

  const handleLinkRent = async (txId: string, propertyId: string) => {
    await (supabase as any).from('transactions').update({ property_id: propertyId }).eq('id', txId);
    setRentTx((prev) => prev.map((tx) => tx.id === txId ? { ...tx, property_id: propertyId } : tx));
  };

  const handleUnlinkRent = async (txId: string) => {
    await (supabase as any).from('transactions').update({ property_id: null }).eq('id', txId);
    setRentTx((prev) => prev.map((tx) => tx.id === txId ? { ...tx, property_id: null } : tx));
  };

  const handleLinkExpense = async (txId: string, propertyId: string) => {
    await (supabase as any).from('transactions').update({ property_id: propertyId }).eq('id', txId);
    setExpenseTx((prev) => prev.map((tx) => tx.id === txId ? { ...tx, property_id: propertyId } : tx));
  };

  const handleUnlinkExpense = async (txId: string) => {
    await (supabase as any).from('transactions').update({ property_id: null }).eq('id', txId);
    setExpenseTx((prev) => prev.map((tx) => tx.id === txId ? { ...tx, property_id: null } : tx));
  };

  const isLoading = orgLoading || dataLoading;

  if (isLoading && investments.length === 0 && properties.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title={t('title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto bg-gray-50/40">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {/* Main tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit shadow-sm">
            <button onClick={() => setMainTab('portfolio')}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                mainTab === 'portfolio' ? 'bg-tenir-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50')}>
              <TrendingUp size={15} /> Portefeuille
            </button>
            <button onClick={() => setMainTab('realestate')}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                mainTab === 'realestate' ? 'bg-tenir-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50')}>
              <Building2 size={15} /> Immeubles
              {properties.length > 0 && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', mainTab === 'realestate' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600')}>
                  {properties.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Portfolio tab ── */}
          {mainTab === 'portfolio' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <PortfolioSummaryCard title={t('bookValue')} value={formatCurrency(portfolioBook)} subtitle="Coût de base rajusté" icon={DollarSign} />
                <PortfolioSummaryCard title={t('marketValue')} value={formatCurrency(portfolioMarket)} subtitle="Valeur marchande actuelle" icon={TrendingUp} />
                <PortfolioSummaryCard
                  title={t('unrealizedGain')}
                  value={formatCurrency(unrealizedGain)}
                  subtitle={`${unrealizedGain >= 0 ? '+' : ''}${portfolioBook > 0 ? ((unrealizedGain / portfolioBook) * 100).toFixed(2) : '0.00'}%`}
                  icon={unrealizedGain >= 0 ? ArrowUpRight : ArrowDownLeft}
                />
                <PortfolioSummaryCard title={t('dividendIncome')} value={formatCurrency(ytdDividends)} subtitle="Cumulatif reçu" icon={DollarSign} />
              </div>

              {/* Refresh bar */}
              <div className="flex items-center justify-between mb-6">
                <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsInvModalOpen(true)}>{t('addInvestment')}</Button>
                <div className="flex items-center gap-3">
                  {quotesError && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                      <WifiOff size={12} /> {quotesError}
                    </div>
                  )}
                  {quotesUpdatedAt && !quotesError && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Wifi size={11} className="text-emerald-400" />
                      Mis à jour {quotesUpdatedAt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <button
                    onClick={() => refreshQuotes()}
                    disabled={quotesLoading || investments.length === 0}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
                      quotesLoading
                        ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-wait'
                        : 'border-tenir-200 text-tenir-600 bg-tenir-50 hover:bg-tenir-100'
                    )}
                  >
                    <RefreshCw size={13} className={quotesLoading ? 'animate-spin' : ''} />
                    {quotesLoading ? 'Actualisation…' : 'Actualiser les cours'}
                  </button>
                </div>
              </div>

              <Card padding="none" shadow="sm" className="mb-8">
                <CardHeader className="px-6 pt-6">
                  <div className="flex items-center justify-between">
                    <CardTitle level="h3">Titres ({investments.length})</CardTitle>
                    {Object.keys(quotes).length > 0 && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        Cours en temps réel
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {investments.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">{commonT('noResults')}</p>
                      <Button variant="outline" icon={<Plus size={16} />} onClick={() => setIsInvModalOpen(true)}>{t('addInvestment')}</Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table hoverable>
                        <TableHeader>
                          <TableRow isHeader>
                            <TableHead>Symbole</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead align="right">Actions</TableHead>
                            <TableHead align="right">CBR/action</TableHead>
                            <TableHead align="right">Cours actuel</TableHead>
                            <TableHead align="right">Var. jour</TableHead>
                            <TableHead align="right">Valeur marchande</TableHead>
                            <TableHead align="right">G/P non réalisé</TableHead>
                            <TableHead align="center">⋯</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {investments.map((inv) => {
                            const q = quotes[inv.symbol.toUpperCase()];
                            const livePrice  = q && !q.error ? q.price : (inv.current_price ?? inv.purchase_price);
                            const book       = inv.shares * inv.purchase_price;
                            const market     = inv.shares * livePrice;
                            const gl         = market - book;
                            const glPct      = book > 0 ? (gl / book) * 100 : 0;
                            const dayChange  = q && !q.error ? q.change : null;
                            const dayPct     = q && !q.error ? q.changePercent : null;
                            const hasLive    = q && !q.error && q.price > 0;

                            return (
                              <TableRow key={inv.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-tenir-600">{inv.symbol}</span>
                                    {hasLive && (
                                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', q.marketState === 'REGULAR' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
                                        {q.marketState === 'REGULAR' ? 'Ouvert' : 'Fermé'}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="font-medium text-gray-900">{hasLive ? q.shortName : inv.name}</p>
                                  <p className="text-xs text-gray-500 capitalize">{inv.type.replace('_', ' ')} · {inv.currency}</p>
                                </TableCell>
                                <TableCell align="right" className="font-medium tabular-nums">
                                  {inv.shares.toLocaleString('fr-CA', { maximumFractionDigits: 4 })}
                                </TableCell>
                                <TableCell align="right" className="tabular-nums">{formatCurrency(inv.purchase_price)}</TableCell>
                                <TableCell align="right">
                                  <div className="flex flex-col items-end">
                                    <span className={cn('font-semibold tabular-nums', hasLive ? 'text-gray-900' : 'text-gray-400')}>
                                      {formatCurrency(livePrice)}
                                    </span>
                                    {hasLive && <span className="text-[10px] text-gray-400">{q.currency}</span>}
                                  </div>
                                </TableCell>
                                <TableCell align="right">
                                  {dayChange != null ? (
                                    <div className="flex flex-col items-end">
                                      <span className={cn('text-sm font-semibold tabular-nums', dayChange >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                                        {dayChange >= 0 ? '+' : ''}{formatCurrency(dayChange)}
                                      </span>
                                      <span className={cn('text-xs tabular-nums', dayChange >= 0 ? 'text-emerald-500' : 'text-red-400')}>
                                        {dayPct != null ? `${dayChange >= 0 ? '+' : ''}${dayPct.toFixed(2)}%` : ''}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 text-xs">—</span>
                                  )}
                                </TableCell>
                                <TableCell align="right" className="font-semibold tabular-nums">{formatCurrency(market)}</TableCell>
                                <TableCell align="right">
                                  <span className={cn('font-semibold tabular-nums', gl >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                                    {gl >= 0 ? '+' : ''}{formatCurrency(gl)}
                                  </span>
                                  <p className={cn('text-xs tabular-nums', gl >= 0 ? 'text-emerald-500' : 'text-red-400')}>
                                    ({gl >= 0 ? '+' : ''}{glPct.toFixed(2)}%)
                                  </p>
                                </TableCell>
                                <TableCell align="center">
                                  <button
                                    onClick={() => setEditInvestment({
                                      id: inv.id,
                                      symbol: inv.symbol, name: inv.name, type: inv.type,
                                      shares: inv.shares, purchase_price: inv.purchase_price,
                                      purchase_date: inv.purchase_date,
                                      current_price: inv.current_price ?? 0,
                                      currency: inv.currency, account_type: inv.account_type ?? '',
                                      notes: inv.notes ?? '',
                                    })}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                                    title="Modifier"
                                  ><Edit2 size={14} /></button>
                                  <button onClick={() => handleDeleteInvestment(inv.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={14} /></button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dividends */}
              <Card padding="none" shadow="sm">
                <CardHeader className="px-6 pt-6"><CardTitle level="h3">Dividendes reçus</CardTitle></CardHeader>
                <CardContent>
                  <Table hoverable>
                    <TableHeader><TableRow isHeader><TableHead>Date</TableHead><TableHead>Payeur</TableHead><TableHead>Type</TableHead><TableHead align="right">Montant</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {dividends.length > 0 ? dividends.map((div) => (
                        <TableRow key={div.id}>
                          <TableCell>{formatDate(div.date)}</TableCell>
                          <TableCell>{div.payer || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={div.dividend_type === 'eligible' ? 'success' : div.dividend_type === 'non_eligible' ? 'warning' : 'info'} size="sm">
                              {div.dividend_type === 'eligible' ? 'Déterminé' : div.dividend_type === 'non_eligible' ? 'Non déterminé' : div.dividend_type === 'capital' ? 'Capital' : 'Étranger'}
                            </Badge>
                          </TableCell>
                          <TableCell align="right" className="font-semibold">{formatCurrency(div.amount)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-400">{commonT('noResults')}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Real Estate tab ── */}
          {mainTab === 'realestate' && (
            <>
              {/* RE summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <PortfolioSummaryCard title="Immeubles" value={String(properties.length)} subtitle={`${allUnitsFlat.length} unités au total`} icon={Building2} />
                <PortfolioSummaryCard title="Loyer mensuel attendu" value={formatCurrency(totalExpectedMonth)} subtitle="Unités occupées" icon={DollarSign} />
                <PortfolioSummaryCard title="Loyers reçus (liés)" value={formatCurrency(totalReceivedYTD)} subtitle="Transactions liées" icon={ArrowUpRight} />
                <PortfolioSummaryCard title="Unités vacantes" value={String(vacantCount)} subtitle={vacantCount > 0 ? 'À louer' : 'Toutes occupées'} icon={Home} />
              </div>

              <div className="mb-6">
                <Button variant="primary" icon={<Plus size={18} />} onClick={() => setShowPropertyModal(true)}>Ajouter un immeuble</Button>
              </div>

              {properties.length === 0 ? (
                <Card padding="md" shadow="sm" className="bg-white">
                  <CardContent>
                    <div className="text-center py-14">
                      <Building2 size={40} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-500 font-medium">Aucun immeuble enregistré</p>
                      <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">Ajoutez vos immeubles locatifs pour suivre les loyers attendus et reçus.</p>
                      <Button className="mt-4" icon={<Plus size={16} />} onClick={() => setShowPropertyModal(true)}>Ajouter un immeuble</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {properties.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      units={units.filter((u) => u.property_id === prop.id)}
                      linkedTx={rentTx.filter((tx) => tx.property_id === prop.id)}
                      linkedExpenses={expenseTx.filter((tx) => tx.property_id === prop.id)}
                      onAddUnit={(pid) => setShowUnitModal({ propertyId: pid })}
                      onEditUnit={(unit) => setShowUnitModal({ propertyId: unit.property_id, unit })}
                      onDeleteUnit={handleDeleteUnit}
                      onDeleteProperty={handleDeleteProperty}
                      onEditProperty={(p) => setEditProperty(p)}
                      onLinkRent={(p) => setLinkRentProperty(p)}
                      onUnlinkRent={handleUnlinkRent}
                      onLinkExpense={(p) => setLinkExpenseProperty(p)}
                      onUnlinkExpense={handleUnlinkExpense}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <InvestmentModal isOpen={isInvModalOpen} onClose={() => setIsInvModalOpen(false)} onSubmit={handleAddInvestment} />

      {editInvestment && (
        <InvestmentModal
          isOpen={true}
          onClose={() => setEditInvestment(null)}
          onSubmit={handleUpdateInvestment}
          initialData={editInvestment}
        />
      )}

      <PropertyModal isOpen={showPropertyModal} onClose={() => setShowPropertyModal(false)} onSubmit={handleAddProperty} />

      {editProperty && (
        <PropertyModal
          isOpen={true}
          onClose={() => setEditProperty(null)}
          onSubmit={handleUpdateProperty}
          initialData={{
            address:        editProperty.address,
            city:           editProperty.city,
            province:       editProperty.province,
            postal_code:    editProperty.postal_code ?? '',
            nickname:       editProperty.nickname ?? '',
            property_type:  editProperty.property_type,
            purchase_price: editProperty.purchase_price != null ? String(editProperty.purchase_price) : '',
            purchase_date:  editProperty.purchase_date ?? '',
            notes:          editProperty.notes ?? '',
            building_value_pct: editProperty.building_value_pct != null ? String(editProperty.building_value_pct) : '80',
            has_mortgage:               editProperty.mortgage_balance != null,
            mortgage_lender:            editProperty.mortgage_lender ?? '',
            mortgage_original_amount:   editProperty.mortgage_original_amount != null ? String(editProperty.mortgage_original_amount) : '',
            mortgage_balance:           editProperty.mortgage_balance != null ? String(editProperty.mortgage_balance) : '',
            mortgage_interest_rate:     editProperty.mortgage_interest_rate != null ? String(editProperty.mortgage_interest_rate) : '',
            mortgage_amortization_years: editProperty.mortgage_amortization_years != null ? String(editProperty.mortgage_amortization_years) : '',
            mortgage_term_years:        editProperty.mortgage_term_years != null ? String(editProperty.mortgage_term_years) : '',
            mortgage_start_date:        editProperty.mortgage_start_date ?? '',
            mortgage_payment_frequency: editProperty.mortgage_payment_frequency ?? 'monthly',
            mortgage_payment_amount:    editProperty.mortgage_payment_amount != null ? String(editProperty.mortgage_payment_amount) : '',
          }}
        />
      )}

      {showUnitModal && (
        <UnitModal
          isOpen={true}
          onClose={() => setShowUnitModal(null)}
          initialData={showUnitModal.unit ? {
            unit_number: showUnitModal.unit.unit_number,
            tenant_name: showUnitModal.unit.tenant_name || '',
            tenant_email: showUnitModal.unit.tenant_email || '',
            lease_start: showUnitModal.unit.lease_start || '',
            lease_end: showUnitModal.unit.lease_end || '',
            monthly_rent: String(showUnitModal.unit.monthly_rent),
            is_vacant: showUnitModal.unit.is_vacant,
            notes: showUnitModal.unit.notes || '',
          } : undefined}
          onSubmit={(data) => handleSaveUnit(data, showUnitModal.propertyId, showUnitModal.unit?.id)}
        />
      )}

      {linkRentProperty && (
        <LinkRentModal
          property={linkRentProperty}
          unlinkedIncome={rentTx.filter((tx) => !tx.property_id)}
          linkedToProperty={rentTx.filter((tx) => tx.property_id === linkRentProperty.id)}
          onClose={() => setLinkRentProperty(null)}
          onLink={(txId) => { handleLinkRent(txId, linkRentProperty.id); }}
          onUnlink={handleUnlinkRent}
        />
      )}

      {linkExpenseProperty && (
        <LinkExpenseModal
          property={linkExpenseProperty}
          unlinkedExpenses={expenseTx.filter((tx) => !tx.property_id)}
          onClose={() => setLinkExpenseProperty(null)}
          onLink={(txId) => { handleLinkExpense(txId, linkExpenseProperty.id); }}
          onUnlink={handleUnlinkExpense}
        />
      )}
    </div>
  );
}
