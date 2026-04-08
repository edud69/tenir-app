'use client';

import React, { useState } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  title: string;
  onMobileMenuClick?: () => void;
}

export default function Header({ title, onMobileMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Derive locale prefix from current pathname (e.g. /en or /fr)
      const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      router.push(`${localePrefix}/expenses?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Side - Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMobileMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>

        {/* Right Side - Search, Notifications */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden sm:block relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-10 pr-4"
            />
          </div>

          {/* Notification Bell */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 relative">
            <Bell size={20} className="text-gray-700" />
            {/* Notification Badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
