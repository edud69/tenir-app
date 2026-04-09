'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Bell, Menu, Receipt, FileText, CheckCircle, Clock } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface Notification {
  id: string;
  type: 'receipt' | 'form';
  title: string;
  subtitle: string;
  date: string;
  read: boolean;
}

interface HeaderProps {
  title: string;
  onMobileMenuClick?: () => void;
}

function NotificationsPanel({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      const [receiptsRes, formsRes] = await Promise.all([
        (supabase as any)
          .from('receipts')
          .select('id, vendor, file_name, amount, status, created_at')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5),
        (supabase as any)
          .from('government_forms')
          .select('id, form_type, tax_year, status, created_at')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const receiptNotifs: Notification[] = (receiptsRes.data || []).map((r: any) => ({
        id: `receipt-${r.id}`,
        type: 'receipt' as const,
        title: r.vendor || r.file_name || t('unknownReceipt'),
        subtitle: r.status === 'verified' ? t('receiptVerified') : t('receiptPending'),
        date: r.created_at,
        read: false,
      }));

      const formNotifs: Notification[] = (formsRes.data || []).map((f: any) => ({
        id: `form-${f.id}`,
        type: 'form' as const,
        title: `${f.form_type?.toUpperCase()} ${f.tax_year}`,
        subtitle: f.status === 'accepted' ? t('formAccepted') : f.status === 'submitted' ? t('formSubmitted') : t('formDraft'),
        date: f.created_at,
        read: false,
      }));

      const all = [...receiptNotifs, ...formNotifs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 8);

      setNotifications(all);
      setLoading(false);
    }

    fetchNotifications();
  }, [orgId]);

  function formatRelative(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}j`;
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{t('title')}</p>
        {notifications.length > 0 && (
          <span className="text-xs text-tenir-600 font-medium">{notifications.length} {t('recent')}</span>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">{tCommon('loading')}</div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell size={28} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">{t('empty')}</p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <div key={notif.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                <div className={cn(
                  'p-2 rounded-full shrink-0 mt-0.5',
                  notif.type === 'receipt' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'
                )}>
                  {notif.type === 'receipt' ? <Receipt size={14} /> : <FileText size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.subtitle}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 mt-1">{formatRelative(notif.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Header({ title, onMobileMenuClick }: HeaderProps) {
  const t = useTranslations('notifications');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { orgId } = useOrganization();
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      router.push(`${localePrefix}/expenses?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMobileMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="hidden sm:flex relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tenir-500 bg-gray-50 placeholder-gray-400"
            />
          </div>

          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className={cn(
                'p-2 rounded-lg transition-colors duration-200 relative',
                showNotifications ? 'bg-tenir-50 text-tenir-600' : 'hover:bg-gray-100 text-gray-600'
              )}
            >
              <Bell size={20} />
            </button>

            {showNotifications && orgId && (
              <NotificationsPanel orgId={orgId} onClose={() => setShowNotifications(false)} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
