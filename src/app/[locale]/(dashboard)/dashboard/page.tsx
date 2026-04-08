'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Upload, Plus, TrendingUp, FileText, ArrowUpRight, ArrowDownLeft, Receipt } from 'lucide-react';
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

const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LABELS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function buildChartData(transactions: DbTransaction[], locale: string) {
  const labels = locale === 'fr' ? MONTH_LABELS_FR : MONTH_LABELS_EN;
  const byMonth: Record<string, { expenses: number; revenue: number }> = {};
  for (const tx of transactions) {
    const monthIdx = new Date(tx.date).getMonth();
    const month = labels[monthIdx];
    if (!byMonth[month]) byMonth[month] = { expenses: 0, revenue: 0 };
    if (tx.type === 'expense') {
      byMonth[month].expenses += Math.abs(tx.amount);
    } else {
      byMonth[month].revenue += tx.amount;
    }
  }
  return labels.filter((m) => byMonth[m]).map((month) => ({ month, ...byMonth[month] }));
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
      (supabase as any).from('transactions').select('id,description,category,amount,date,type').eq('organization_id', orgId).order('date', { ascending: false }).limit(10),
      (supabase as any).from('transactions').select('id,amount,type,date,category').eq('organization_id', orgId),
    ]).then(([recent, all]) => {
      if (recent.data) setRecentTx(recent.data);
      if (all.data) setAllTx(all.data);
    }).finally(() => setLoading(false));
  }, [orgId]);

  const totalRevenue = allTx.filter((tx) => ['income', 'dividend', 'capital_gain', 'interest'].includes(tx.type)).reduce((s, tx) => s + tx.amount, 0);
  const totalExpenses = allTx.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const netIncome = totalRevenue - totalExpenses;
  const estimatedTax = netIncome > 0 ? netIncome * 0.265 : 0;
  const chartData = buildChartData(allTx, locale);

  const displayName = org?.name || user?.email?.split('@')[0] || '';

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      expense: tExp('expense'),
      income: tExp('income'),
      dividend: tExp('dividend'),
      capital_gain: tExp('capitalGain'),
      interest: tExp('interest'),
    };
    return map[type] || type;
  };

  const isIncome = (type: string) => ['income', 'dividend', 'capital_gain', 'interest'].includes(type);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('overview')} />
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{t('welcome', { name: displayName })}</h2>
            <p className="text-gray-500 mt-1 text-sm">{t('overviewSubtitle')}</p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { title: t('totalRevenue'), value: formatCurrency(totalRevenue), icon: <ArrowUpRight size={20} />, color: 'text-green-600 bg-green-100' },
              { title: t('totalExpenses'), value: formatCurrency(totalExpenses), icon: <ArrowDownLeft size={20} />, color: 'text-red-500 bg-red-100' },
              { title: t('netIncome'), value: formatCurrency(netIncome), icon: <TrendingUp size={20} />, color: netIncome >= 0 ? 'text-tenir-600 bg-tenir-100' : 'text-red-500 bg-red-100' },
              { title: t('estimatedTax'), value: formatCurrency(estimatedTax), icon: <FileText size={20} />, color: 'text-orange-600 bg-orange-100' },
            ].map((card) => (
              <Card key={card.title} padding="md" shadow="sm" className="bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.color}`}>{card.icon}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('quickActions')}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button variant="outline" fullWidth icon={<Receipt size={16} />} onClick={() => router.push(`/${locale}/receipts`)} className="bg-white justify-start">
                {t('uploadReceipt')}
              </Button>
              <Button variant="outline" fullWidth icon={<Plus size={16} />} onClick={() => router.push(`/${locale}/expenses`)} className="bg-white justify-start">
                {t('addExpense')}
              </Button>
              <Button variant="outline" fullWidth icon={<TrendingUp size={16} />} onClick={() => router.push(`/${locale}/taxes`)} className="bg-white justify-start">
                {t('viewTaxes')}
              </Button>
              <Button variant="outline" fullWidth icon={<FileText size={16} />} onClick={() => router.push(`/${locale}/forms`)} className="bg-white justify-start">
                {t('generateForm')}
              </Button>
            </div>
          </div>

          {/* Chart + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <Card padding="md" shadow="sm" className="bg-white">
                <CardHeader>
                  <CardTitle level="h3">{t('monthlyOverview')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">{t('noChartData')}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chartData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => formatCurrency(v as number)} />
                        <Legend />
                        <Bar dataKey="expenses" fill="#ef4444" name={t('totalExpenses')} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="revenue" fill="#1a56db" name={t('totalRevenue')} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card padding="md" shadow="sm" className="bg-white">
              <CardHeader>
                <CardTitle level="h3">{t('quickStats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{t('avgMonthly')}</span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {formatCurrency(chartData.length > 0 ? totalExpenses / chartData.length : 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{t('taxRateEstimate')}</span>
                    <span className="font-semibold text-gray-900 text-sm">26.5%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">{t('ytdMargin')}</span>
                    <span className={`font-semibold text-sm ${netIncome >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {totalRevenue > 0 ? `${Math.round((netIncome / totalRevenue) * 100)}%` : '—'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card padding="md" shadow="sm" className="bg-white">
            <CardHeader>
              <CardTitle level="h3">{t('recentTransactions')}</CardTitle>
            </CardHeader>
            <CardContent>
              {(orgLoading || loading) ? (
                <p className="text-gray-400 text-sm py-6 text-center">{tCommon('loading')}</p>
              ) : recentTx.length === 0 ? (
                <p className="text-gray-400 text-sm py-6 text-center">{t('noTransactions')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs uppercase">{tCommon('description')}</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs uppercase hidden md:table-cell">{tCommon('category')}</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500 text-xs uppercase">{tCommon('amount')}</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs uppercase hidden sm:table-cell">{tCommon('date')}</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500 text-xs uppercase">{tCommon('type')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTx.map((tx) => (
                        <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3 text-gray-900 font-medium truncate max-w-[160px]">{tx.description}</td>
                          <td className="py-3 px-3 text-gray-500 hidden md:table-cell">{tx.category}</td>
                          <td className={`py-3 px-3 text-right font-semibold ${isIncome(tx.type) ? 'text-green-600' : 'text-red-500'}`}>
                            {isIncome(tx.type) ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                          </td>
                          <td className="py-3 px-3 text-gray-500 hidden sm:table-cell">{tx.date}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${isIncome(tx.type) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {typeLabel(tx.type)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
