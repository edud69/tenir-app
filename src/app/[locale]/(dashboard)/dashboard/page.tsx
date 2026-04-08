'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Upload,
  Plus,
  TrendingUp,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { createClient } from '@/lib/supabase/client';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
}

function StatCard({
  title,
  value,
  change,
  isPositive,
  icon,
}: StatCardProps) {
  return (
    <Card padding="md" shadow="sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-3">{value}</p>
          {change && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <ArrowUpRight size={16} className="text-green-600" />
              ) : (
                <ArrowDownLeft size={16} className="text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}
              >
                {change}
              </span>
            </div>
          )}
        </div>
        <div className="p-3 bg-tenir-100 rounded-lg text-tenir-600">
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface DbTransaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  type: string;
}

function TransactionTable({ transactions }: { transactions: DbTransaction[] }) {
  return (
    <Card padding="md" shadow="sm">
      <CardHeader>
        <CardTitle level="h3">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            No transactions yet. Add your first transaction in the Expenses page.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Category
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Date
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{transaction.category}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {transaction.amount >= 0 ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{transaction.date}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'income' ||
                          transaction.type === 'dividend' ||
                          transaction.type === 'capital_gain' ||
                          transaction.type === 'interest'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {transaction.type === 'capital_gain' ? 'Capital gain' : transaction.type}
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
  );
}

interface ChartData {
  month: string;
  expenses: number;
  revenue: number;
}

function ExpenseChart({ data }: { data: ChartData[] }) {
  return (
    <Card padding="md" shadow="sm">
      <CardHeader>
        <CardTitle level="h3">Monthly Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
            Add transactions to see your chart
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="expenses" fill="#d946ef" name="Expenses" />
              <Bar dataKey="revenue" fill="#0c8ee9" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildChartData(transactions: DbTransaction[]): ChartData[] {
  const byMonth: Record<string, { expenses: number; revenue: number }> = {};
  for (const tx of transactions) {
    const month = MONTH_LABELS[new Date(tx.date).getMonth()];
    if (!byMonth[month]) byMonth[month] = { expenses: 0, revenue: 0 };
    if (tx.type === 'expense') {
      byMonth[month].expenses += Math.abs(tx.amount);
    } else {
      byMonth[month].revenue += tx.amount;
    }
  }
  // Return months in order as they appear
  const orderedMonths = MONTH_LABELS.filter((m) => byMonth[m]);
  return orderedMonths.map((month) => ({ month, ...byMonth[month] }));
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const supabase = createClient();
  const { org, orgId, user, loading: orgLoading } = useOrganization();

  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    async function fetchTransactions() {
      setTxLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('transactions')
          .select('id, description, category, amount, date, type')
          .eq('organization_id', orgId)
          .order('date', { ascending: false })
          .limit(10);
        if (!error && data) setTransactions(data);
      } finally {
        setTxLoading(false);
      }
    }
    fetchTransactions();
  }, [orgId]);

  // Fetch all transactions for chart/totals (no limit)
  const [allTransactions, setAllTransactions] = useState<DbTransaction[]>([]);
  useEffect(() => {
    if (!orgId) return;
    async function fetchAll() {
      const { data, error } = await (supabase as any)
        .from('transactions')
        .select('id, amount, type, date, category')
        .eq('organization_id', orgId);
      if (!error && data) setAllTransactions(data);
    }
    fetchAll();
  }, [orgId]);

  const totalRevenue = allTransactions
    .filter((tx) => ['income', 'dividend', 'capital_gain', 'interest'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = allTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const netIncome = totalRevenue - totalExpenses;
  const estimatedTax = netIncome > 0 ? netIncome * 0.26 : 0;

  const chartData = buildChartData(allTransactions);

  const displayName = user?.user_metadata?.full_name || user?.email || 'there';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('overview')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('welcome', { name: org?.name || displayName })}
            </h2>
            <p className="text-gray-600 mt-2">
              Here's an overview of your financial activity for this fiscal year.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title={t('totalRevenue')}
              value={formatCurrency(totalRevenue)}
              icon={<TrendingUp size={24} />}
              isPositive={true}
            />
            <StatCard
              title={t('totalExpenses')}
              value={formatCurrency(totalExpenses)}
              icon={<Upload size={24} />}
              isPositive={false}
            />
            <StatCard
              title={t('netIncome')}
              value={formatCurrency(netIncome)}
              icon={<ArrowUpRight size={24} />}
              isPositive={netIncome >= 0}
            />
            <StatCard
              title={t('estimatedTax')}
              value={formatCurrency(estimatedTax)}
              icon={<FileText size={24} />}
              isPositive={false}
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('quickActions')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                fullWidth
                icon={<Upload size={18} />}
              >
                {t('uploadReceipt')}
              </Button>
              <Button
                variant="outline"
                fullWidth
                icon={<Plus size={18} />}
              >
                {t('addExpense')}
              </Button>
              <Button
                variant="outline"
                fullWidth
                icon={<TrendingUp size={18} />}
              >
                {t('viewTaxes')}
              </Button>
              <Button
                variant="outline"
                fullWidth
                icon={<FileText size={18} />}
              >
                {t('generateForm')}
              </Button>
            </div>
          </div>

          {/* Charts and Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <ExpenseChart data={chartData} />
            </div>
            <div>
              <Card padding="md" shadow="sm">
                <CardHeader>
                  <CardTitle level="h3">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Avg. Monthly</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(chartData.length > 0 ? totalExpenses / chartData.length : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tax Rate</span>
                      <span className="font-semibold text-gray-900">26%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">YTD Margin</span>
                      <span className={`font-semibold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalRevenue > 0 ? `${Math.round((netIncome / totalRevenue) * 100)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Transactions */}
          {(orgLoading || txLoading) ? (
            <Card padding="md" shadow="sm">
              <CardContent>
                <p className="text-gray-500 text-sm py-4 text-center">Loading transactions...</p>
              </CardContent>
            </Card>
          ) : (
            <TransactionTable transactions={transactions} />
          )}
        </div>
      </div>
    </div>
  );
}
