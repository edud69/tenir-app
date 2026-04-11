'use client';

import React, { ReactNode, useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/sidebar';
import { ChatWidget } from '@/components/assistant/chat-widget';
import { Sparkles } from 'lucide-react';

const FiscalAdvisorPanel = dynamic(
  () => import('@/components/assistant/fiscal-advisor-panel').then((m) => ({ default: m.FiscalAdvisorPanel })),
  { ssr: false }
);

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
  const [fiscalAdvisorOpen, setFiscalAdvisorOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar user={user} locale={locale} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
        {children}
      </div>

      {/* Fiscal Advisor trigger button — above ChatWidget bubble */}
      <button
        onClick={() => setFiscalAdvisorOpen(true)}
        title={locale === 'fr' ? 'Conseiller fiscal IA' : 'AI Fiscal Advisor'}
        className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center z-40"
      >
        <Sparkles size={20} />
      </button>

      {/* AI Assistant Chat Widget */}
      <ChatWidget />

      {/* Fiscal Advisor Panel */}
      <FiscalAdvisorPanel
        isOpen={fiscalAdvisorOpen}
        onClose={() => setFiscalAdvisorOpen(false)}
        locale={locale}
      />
    </div>
  );
}
