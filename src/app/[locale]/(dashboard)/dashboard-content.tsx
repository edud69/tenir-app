'use client';

import React, { ReactNode, useState } from 'react';
import Sidebar from '@/components/layout/sidebar';
import ChatWidget from '@/components/assistant/chat-widget';

interface DashboardContentProps {
  children: ReactNode;
  locale: string;
  user: {
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export default function DashboardContent({
  children,
  locale,
  user,
}: DashboardContentProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar user={user} locale={locale} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
        {children}
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* AI Assistant Chat Widget */}
      <ChatWidget />
    </div>
  );
}
