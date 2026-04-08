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
  Settings,
  Bot,
  Menu,
  X,
  LogOut,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

interface NavItem {
  href: string;
  icon: React.ReactNode;
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
    {
      href: `/${locale}/dashboard`,
      icon: <LayoutDashboard size={20} />,
      label: t('dashboard'),
      key: 'dashboard',
    },
    {
      href: `/${locale}/receipts`,
      icon: <Receipt size={20} />,
      label: t('receipts'),
      key: 'receipts',
    },
    {
      href: `/${locale}/expenses`,
      icon: <Wallet size={20} />,
      label: t('expenses'),
      key: 'expenses',
    },
    {
      href: `/${locale}/investments`,
      icon: <TrendingUp size={20} />,
      label: t('investments'),
      key: 'investments',
    },
    {
      href: `/${locale}/taxes`,
      icon: <Calculator size={20} />,
      label: t('taxes'),
      key: 'taxes',
    },
    {
      href: `/${locale}/forms`,
      icon: <FileText size={20} />,
      label: t('forms'),
      key: 'forms',
    },
    {
      href: `/${locale}/settings`,
      icon: <Settings size={20} />,
      label: t('settings'),
      key: 'settings',
    },
  ];

  const isActive = (href: string) => {
    const segment = href.split('/').pop();
    const pathSegment = pathname.split('/').pop();
    return segment === pathSegment;
  };

  const handleLogout = async () => {
    // This will be handled by a separate logout route
    router.push(`/${locale}/logout`);
  };

  const switchLanguage = () => {
    const newLocale = locale === 'en' ? 'fr' : 'en';
    const pathWithoutLocale = pathname.substring(3);
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link href={`/${locale}/dashboard`}>
          <Logo size={34} variant="full" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.key} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200',
                  isActive(item.href)
                    ? 'bg-tenir-100 text-tenir-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* AI Assistant Button */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors duration-200 font-medium">
            <Bot size={20} />
            <span>{t('assistant')}</span>
          </button>
        </div>
      </nav>

      {/* User Section & Bottom Controls */}
      <div className="border-t border-gray-200 p-4">
        {/* Language Switcher */}
        <button
          onClick={switchLanguage}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 mb-3"
          title={locale === 'en' ? 'Switch to Français' : 'Switch to English'}
        >
          <Globe size={18} />
          <span className="text-sm font-medium">{locale === 'en' ? 'EN' : 'FR'}</span>
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-2 mb-3">
          <div className="w-10 h-10 bg-tenir-600 rounded-full flex items-center justify-center text-white font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-600 truncate">{user.email}</p>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          fullWidth
          icon={<LogOut size={16} />}
        >
          {t('logout')}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 hover:bg-gray-100 rounded-lg"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 w-64 h-screen bg-white border-r border-gray-200 z-40 overflow-y-auto">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
