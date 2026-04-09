'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, FileText,
  Receipt, Plus, ChevronRight, Minus,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { createClient } from '@/lib/supabase/client';

interface DbTransaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  type: string;
}

const MONTH_LABELS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_LABELS_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];

function buildChartData(transactions: DbTransaction[], locale: string) {
  const labels = locale === 'fr' ? MONTH_LABELS_FR : MONTH_LABELS_EN;
  const byMonth: Record<string, { expenses: number; revenue: number }> = {};
  for (const tx of transactions) {
    const monthIdx = new Date(tx.date).getMonth();
    const month = labels[monthIdx];
    if (!byMonth[month]) byMonth[month] = { expenses: 0, revenue: 0 };
    if (tx.type === 'expense') byMonth[month].expenses += Math.abs(tx.amount);
    else byMonth[month].revenue += tx.amount;
  }
  return labels.filter((m) => byMonth[m]).map((month) => ({ month, ...byMonth[month] }));
}

const isIncome = (type: string) => ['income', 'dividend', 'capital_gain', 'interest'].includes(type);

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tExp = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';
  const supabase = createClient();
  const { org, orgId, user, loading: orgLoading } = useOrganization();

  const [recentTx, setRecentTx] = useState<DbTransaction[]>([]);
  const [allTx, setAllTx] = useState<DbTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      (supabase as any).from('transactions').select('id,description,category,amount,date,type').eq('organization_id', orgId).order('date', { ascending: false }).limit(8),
      (supabase as any).from('transactions').select('id,amount,type,date,category').eq('organization_id', orgId),
    ]).then(([recent, all]) => {
      if (recent.data) setRecentTx(recent.data);
      if (all.data) setAllTx(all.data);
    }).finally(() => setLoading(false));
  }, [orgId]);

  const totalRevenue  = allTx.filter((tx) => isIncome(tx.type)).reduce((s, tx) => s + tx.amount, 0);
  const totalExpenses = allTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const netIncome     = totalRevenue - totalExpenses;
  const estimatedTax  = netIncome > 0 ? netIncome * 0.265 : 0;
  const chartData     = buildChartData(allTx, locale);

  const displayName = org?.name || user?.email?.split('@')[0] || '';

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      expense: tExp('expense'), income: tExp('income'),
      dividend: tExp('dividend'), capital_gain: tExp('capitalGain'), interest: tExp('interest'),
    };
    return map[type] || type;
  };

  const statCards = [
    {
      title: t('totalRevenue'),
      value: formatCurrency(totalRevenue),
      icon: ArrowUpRight,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
      trend: null,
    },
    {
      title: t('totalExpenses'),
      value: formatCurrency(totalExpenses),
      icon: ArrowDownRight,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      valueColor: 'text-red-600',
      trend: null,
    },
    {
      title: t('netIncome'),
      value: formatCurrency(netIncome),
      icon: netIncome >= 0 ? TrendingUp : Minus,
      iconBg: netIncome >= 0 ? 'bg-tenir-50' : 'bg-red-50',
      iconColor: netIncome >= 0 ? 'text-tenir-600' : 'text-red-500',
      valueColor: netIncome >= 0 ? 'text-tenir-700' : 'text-red-600',
      trend: null,
    },
    {
      title: t('estimatedTax'),
      value: formatCurrency(estimatedTax),
      icon: FileText,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      trend: null,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('overview')} />
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {/* Welcome banner */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {t('welcome', { name: displayName })}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{t('overviewSubtitle')}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {new Date().toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm shadow-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-medium text-gray-500 leading-tight">{card.title}</p>
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg} ${card.iconColor}`}>
                      <Icon size={16} />
                    </span>
                  </div>
                  <p className={`text-2xl font-bold tracking-tight ${card.valueColor}`}>{card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('quickActions')}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: t('uploadReceipt'), icon: Receipt, href: `/${locale}/receipts` },
                { label: t('addExpense'),    icon: Plus,    href: `/${locale}/expenses` },
                { label: t('viewTaxes'),     icon: TrendingUp, href: `/${locale}/taxes` },
                { label: t('generateForm'),  icon: FileText,  href: `/${locale}/forms` },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    className="group flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl hover:border-tenir-200 hover:bg-tenir-50/30 transition-all duration-150 shadow-sm shadow-gray-100 text-left"
                  >
                    <span className="w-8 h-8 rounded-xl bg-tenir-50 text-tenir-600 flex items-center justify-center flex-shrink-0 group-hover:bg-tenir-100 transition-colors">
                      <Icon size={15} />
                    </span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1 leading-tight">{action.label}</span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-tenir-400 transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <Card padding="md" shadow="sm">
                <CardHeader>
                  <CardTitle>{t('monthlyOverview')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-52 text-gray-400 text-sm">{t('noChartData')}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0c8ee9" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#0c8ee9" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: 12 }}
                          formatter={(v) => formatCurrency(v as number)}
                        />
                        <Area type="monotone" dataKey="revenue"  stroke="#0c8ee9" strokeWidth={2} fill="url(#colorRevenue)"  dot={false} name={t('totalRevenue')} />
                        <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#colorExpenses)" dot={false} name={t('totalExpenses')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card padding="md" shadow="sm">
              <CardHeader>
                <CardTitle>{t('quickStats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {[
                    {
                      label: t('avgMonthly'),
                      value: formatCurrency(chartData.length > 0 ? totalExpenses / chartData.length : 0),
                      valueClass: 'text-gray-900',
                    },
                    {
                      label: t('taxRateEstimate'),
                      value: '26.5%',
                      valueClass: 'text-amber-600',
                    },
                    {
                      label: t('ytdMargin'),
                      value: totalRevenue > 0 ? `${Math.round((netIncome / totalRevenue) * 100)}%` : '—',
                      valueClass: netIncome >= 0 ? 'text-emerald-600' : 'text-red-500',
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-500">{stat.label}</span>
                      <span className={`text-sm font-semibold ${stat.valueClass}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card padding="none" shadow="sm">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">{t('recentTransactions')}</h3>
              <button
                onClick={() => router.push(`/${locale}/expenses`)}
                className="text-xs text-tenir-600 hover:text-tenir-700 font-medium flex items-center gap-1 transition-colors"
              >
                {tCommon('viewAll')} <ChevronRight size={12} />
              </button>
            </div>
            {(orgLoading || loading) ? (
              <div className="py-12 text-center text-sm text-gray-400">{tCommon('loading')}</div>
            ) : recentTx.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">{t('noTransactions')}</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentTx.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isIncome(tx.type) ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {isIncome(tx.type)
                        ? <ArrowUpRight size={14} className="text-emerald-600" />
                        : <ArrowDownRight size={14} className="text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{tx.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${isIncome(tx.type) ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isIncome(tx.type) ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{tx.date}</p>
                    </div>
                    <span className={`hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${isIncome(tx.type) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {typeLabel(tx.type)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
