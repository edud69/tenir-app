'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, FileText,
  Receipt, Plus, ChevronRight, TrendingDown,
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

// Custom chart tooltip
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/60 px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-gray-600 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 leading-relaxed">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.stroke }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-900">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

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
  const margin        = totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : null;
  const chartData     = buildChartData(allTx, locale);
  const avgMonthly    = chartData.length > 0 ? totalExpenses / chartData.length : 0;

  // Prefer user display name, fall back to email local part, avoid showing raw company name
  const displayName = user?.email?.split('@')[0] || org?.name || '';

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      expense: tExp('expense'), income: tExp('income'),
      dividend: tExp('dividend'), capital_gain: tExp('capitalGain'), interest: tExp('interest'),
    };
    return map[type] || type;
  };

  const kpis = [
    {
      title: t('totalRevenue'),
      value: formatCurrency(totalRevenue),
      icon: ArrowUpRight,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      accent: 'border-l-emerald-400',
      subLabel: 'YTD',
      subValue: null,
    },
    {
      title: t('totalExpenses'),
      value: formatCurrency(totalExpenses),
      icon: ArrowDownRight,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      accent: 'border-l-red-400',
      subLabel: t('avgMonthly'),
      subValue: formatCurrency(avgMonthly),
    },
    {
      title: t('netIncome'),
      value: formatCurrency(netIncome),
      icon: netIncome >= 0 ? TrendingUp : TrendingDown,
      iconBg: netIncome >= 0 ? 'bg-tenir-50' : 'bg-red-50',
      iconColor: netIncome >= 0 ? 'text-tenir-600' : 'text-red-500',
      accent: netIncome >= 0 ? 'border-l-tenir-400' : 'border-l-red-400',
      subLabel: t('margin'),
      subValue: margin !== null ? `${margin}%` : null,
    },
    {
      title: t('estimatedTax'),
      value: formatCurrency(estimatedTax),
      icon: FileText,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      accent: 'border-l-amber-400',
      subLabel: t('rate'),
      subValue: '26.5%',
    },
  ];

  const quickActions = [
    { label: t('uploadReceipt'), icon: Receipt,    href: `/${locale}/receipts` },
    { label: t('addExpense'),    icon: Plus,        href: `/${locale}/expenses` },
    { label: t('viewTaxes'),     icon: TrendingUp,  href: `/${locale}/taxes` },
    { label: t('generateForm'),  icon: FileText,    href: `/${locale}/forms` },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('overview')} />
      <div className="flex-1 overflow-y-auto bg-gray-50/40">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {/* Welcome */}
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {t('welcome', { name: displayName })}
              </h2>
              <p className="text-sm text-gray-400 mt-1">{t('overviewSubtitle')}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-400 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {new Date().toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.title}
                  className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${kpi.accent} p-5 shadow-sm shadow-gray-50`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-gray-400 leading-tight truncate pr-1">{kpi.title}</p>
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${kpi.iconBg} ${kpi.iconColor}`}>
                      <Icon size={14} />
                    </span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 tracking-tight mb-2">{kpi.value}</p>
                  {kpi.subValue && (
                    <p className="text-xs text-gray-400">
                      {kpi.subLabel}: <span className="font-semibold text-gray-600">{kpi.subValue}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('quickActions')}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    className="group flex items-center gap-2.5 px-4 py-3 bg-white border border-gray-100 rounded-2xl hover:border-tenir-200 hover:bg-tenir-50/20 transition-all duration-150 shadow-sm text-left"
                  >
                    <span className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center flex-shrink-0 group-hover:bg-tenir-100 group-hover:text-tenir-600 transition-colors">
                      <Icon size={14} />
                    </span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1 leading-tight">{action.label}</span>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-tenir-400 transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <Card padding="md" shadow="sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-gray-900">{t('monthlyOverview')}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-tenir-500 inline-block" />{t('totalRevenue')}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />{t('totalExpenses')}</span>
                  </div>
                </div>
                {chartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-52 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                      <TrendingUp size={22} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400">{t('noChartData')}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0c8ee9" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#0c8ee9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f87171" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => locale === 'fr' ? `${(v / 1000).toFixed(0)} k$` : `$${(v / 1000).toFixed(0)}k`} width={46} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="revenue"  stroke="#0c8ee9" strokeWidth={2} fill="url(#gradRevenue)"  dot={false} name={t('totalRevenue')} />
                      <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#gradExpenses)" dot={false} name={t('totalExpenses')} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            <Card padding="md" shadow="sm">
              <h3 className="text-base font-semibold text-gray-900 mb-5">{t('quickStats')}</h3>
              <div className="space-y-1">
                {[
                  { label: t('avgMonthly'), value: formatCurrency(avgMonthly), color: 'text-gray-900' },
                  { label: t('taxRateEstimate'), value: '26.5%', color: 'text-amber-600' },
                  { label: t('ytdMargin'), value: margin !== null ? `${margin}%` : '—', color: netIncome >= 0 ? 'text-emerald-600' : 'text-red-500' },
                  { label: t('estTaxDue'), value: formatCurrency(estimatedTax), color: 'text-amber-500' },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{s.label}</span>
                    <span className={`text-sm font-semibold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Mini net income indicator */}
              {totalRevenue > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">{t('revenueVsExpenses')}</span>
                    <span className={`text-xs font-semibold ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {netIncome >= 0 ? '+' : ''}{margin}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${netIncome >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, Math.abs(margin ?? 0))}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card padding="none" shadow="sm">
            <div className="px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">{t('recentTransactions')}</h3>
              <button
                onClick={() => router.push(`/${locale}/expenses`)}
                className="text-xs text-tenir-600 hover:text-tenir-700 font-medium flex items-center gap-1 transition-colors"
              >
                {tCommon('viewAll')} <ChevronRight size={12} />
              </button>
            </div>

            {(orgLoading || loading) ? (
              <div className="py-14 flex flex-col items-center gap-3">
                <div className="w-5 h-5 border-2 border-tenir-300 border-t-tenir-600 rounded-full animate-spin" />
                <p className="text-xs text-gray-400">{tCommon('loading')}</p>
              </div>
            ) : recentTx.length === 0 ? (
              <div className="py-14 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <Receipt size={20} className="text-gray-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">{t('noTransactions')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t('noTransactions')}</p>
                </div>
                <button
                  onClick={() => router.push(`/${locale}/expenses`)}
                  className="mt-1 text-xs text-tenir-600 hover:text-tenir-700 font-medium flex items-center gap-1"
                >
                  <Plus size={12} /> {t('addFirstTransaction')}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentTx.map((tx) => {
                  const income = isIncome(tx.type);
                  return (
                    <div key={tx.id} className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-gray-50/60 transition-colors group">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${income ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {income
                          ? <ArrowUpRight size={14} className="text-emerald-500" />
                          : <ArrowDownRight size={14} className="text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate leading-snug">{tx.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{tx.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold leading-snug ${income ? 'text-emerald-600' : 'text-red-500'}`}>
                          {income ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{tx.date}</p>
                      </div>
                      <span className={`hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${income ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {typeLabel(tx.type)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
