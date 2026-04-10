'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  TrendingUp,
  Calculator,
  FileText,
  CreditCard,
  Settings,
  Bot,
  X,
  LogOut,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  key: string;
}

interface SidebarProps {
  user: {
    name: string;
    email: string;
    avatar_url?: string;
  };
  locale: string;
}

export default function Sidebar({ user, locale }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: `/${locale}/dashboard`,   icon: LayoutDashboard, label: t('dashboard'),   key: 'dashboard' },
    { href: `/${locale}/receipts`,    icon: Receipt,         label: t('receipts'),    key: 'receipts' },
    { href: `/${locale}/expenses`,    icon: Wallet,          label: t('expenses'),    key: 'expenses' },
    { href: `/${locale}/investments`, icon: TrendingUp,      label: t('investments'), key: 'investments' },
    { href: `/${locale}/taxes`,        icon: Calculator,      label: t('taxes'),        key: 'taxes' },
    { href: `/${locale}/tax-payments`, icon: CreditCard,     label: t('taxPayments'),  key: 'tax-payments' },
    { href: `/${locale}/forms`,        icon: FileText,        label: t('forms'),        key: 'forms' },
  ];

  const isActive = (href: string) => {
    const segment = href.split('/').pop();
    const pathSegment = pathname.split('/').pop();
    return segment === pathSegment;
  };

  const handleLogout = () => router.push(`/${locale}/logout`);

  const switchLanguage = () => {
    const newLocale = locale === 'en' ? 'fr' : 'en';
    router.push(`/${newLocale}${pathname.substring(3)}`);
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-tenir-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="font-semibold text-white text-base tracking-tight">tenir<span className="text-tenir-400">.app</span></span>
        </Link>
      </div>

      {/* Nav label */}
      <div className="px-5 mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Menu</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.key} href={item.href} onClick={() => setIsMobileOpen(false)}>
                <div className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )}>
                  <Icon
                    size={18}
                    className={cn(
                      'flex-shrink-0 transition-colors',
                      active ? 'text-tenir-400' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-tenir-400 flex-shrink-0" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Settings — separated */}
        <div className="mt-4 pt-4 border-t border-white/5">
          <Link href={`/${locale}/settings`} onClick={() => setIsMobileOpen(false)}>
            <div className={cn(
              'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
              isActive(`/${locale}/settings`)
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            )}>
              <Settings
                size={18}
                className={cn(
                  'flex-shrink-0 transition-colors',
                  isActive(`/${locale}/settings`) ? 'text-tenir-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              <span className="text-sm font-medium flex-1">{t('settings')}</span>
              {isActive(`/${locale}/settings`) && (
                <div className="w-1.5 h-1.5 rounded-full bg-tenir-400 flex-shrink-0" />
              )}
            </div>
          </Link>
        </div>

        {/* AI Assistant */}
        <div className="mt-4">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 text-white hover:from-accent-500 hover:to-accent-400 transition-all duration-150 font-medium text-sm shadow-lg shadow-accent-900/30">
            <Bot size={18} className="flex-shrink-0" />
            <span className="flex-1 text-left">{t('assistant')}</span>
            <ChevronRight size={14} className="opacity-60" />
          </button>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="p-3 mt-2">
        {/* User card */}
        <div className="rounded-xl bg-white/5 p-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tenir-500 to-tenir-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">{user.name}</p>
              <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={switchLanguage}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors text-xs font-medium"
            >
              <Globe size={13} />
              <span>{locale.toUpperCase()}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium"
            >
              <LogOut size={13} />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-950 h-screen sticky top-0 border-r border-white/5">
        {sidebarContent}
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center bg-slate-900 text-white rounded-xl shadow-lg"
      >
        {isMobileOpen ? <X size={18} /> : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 w-60 h-screen bg-slate-950 border-r border-white/5 z-40 overflow-y-auto">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
