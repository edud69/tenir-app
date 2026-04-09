'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Receipt, FileText } from 'lucide-react';
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
        (supabase as any).from('receipts').select('id,vendor,file_name,amount,status,created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
        (supabase as any).from('government_forms').select('id,form_type,tax_year,status,created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
      ]);

      const all: Notification[] = [
        ...(receiptsRes.data || []).map((r: any) => ({
          id: `receipt-${r.id}`,
          type: 'receipt' as const,
          title: r.vendor || r.file_name || t('unknownReceipt'),
          subtitle: r.status === 'verified' ? t('receiptVerified') : t('receiptPending'),
          date: r.created_at,
        })),
        ...(formsRes.data || []).map((f: any) => ({
          id: `form-${f.id}`,
          type: 'form' as const,
          title: `${f.form_type?.toUpperCase()} ${f.tax_year}`,
          subtitle: f.status === 'accepted' ? t('formAccepted') : f.status === 'submitted' ? t('formSubmitted') : t('formDraft'),
          date: f.created_at,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

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
    return `${days}d`;
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl shadow-gray-200/80 border border-gray-100 z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{t('title')}</p>
        {notifications.length > 0 && (
          <span className="text-xs bg-tenir-50 text-tenir-600 font-semibold px-2 py-0.5 rounded-full">
            {notifications.length}
          </span>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">{tCommon('loading')}</div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Bell size={18} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">{t('empty')}</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors border-b border-gray-50 last:border-0 cursor-default">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                notif.type === 'receipt' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
              )}>
                {notif.type === 'receipt' ? <Receipt size={14} /> : <FileText size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{notif.subtitle}</p>
              </div>
              <span className="text-xs text-gray-300 flex-shrink-0 mt-1">{formatRelative(notif.date)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Header({ title }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { orgId } = useOrganization();
  const notifRef = useRef<HTMLDivElement>(null);

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
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-3.5">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h1>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={cn(
            'hidden sm:flex items-center gap-2 rounded-xl border transition-all duration-200 px-3 py-2',
            searchFocused
              ? 'border-tenir-300 bg-white shadow-sm shadow-tenir-100 w-64'
              : 'border-gray-200 bg-gray-50 w-52'
          )}>
            <Search size={14} className={cn('flex-shrink-0 transition-colors', searchFocused ? 'text-tenir-500' : 'text-gray-400')} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            {searchQuery && (
              <kbd className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">↵</kbd>
            )}
          </div>

          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
                showNotifications
                  ? 'bg-tenir-50 text-tenir-600'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
            >
              <Bell size={17} />
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
