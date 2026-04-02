'use client';

import React, { useState } from 'react';
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

interface Transaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card padding="md" shadow="sm">
      <CardHeader>
        <CardTitle level="h3">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
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
                  Status
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
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const commonT = useTranslations('common');

  // Mock data - replace with real data from API
  const totalRevenue = 125500;
  const totalExpenses = 45200;
  const netIncome = totalRevenue - totalExpenses;
  const estimatedTax = netIncome * 0.26; // Approximate Canadian corporate tax rate

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      description: 'Office Supplies',
      category: 'Supplies',
      amount: -350,
      date: '2024-03-28',
      status: 'completed',
    },
    {
      id: '2',
      description: 'Client Payment',
      category: 'Income',
      amount: 5000,
      date: '2024-03-27',
      status: 'completed',
    },
    {
      id: '3',
      description: 'Internet Service',
      category: 'Office',
      amount: -85,
      date: '2024-03-25',
      status: 'completed',
    },
    {
      id: '4',
      description: 'Professional Services',
      category: 'Professional',
      amount: -1200,
      date: '2024-03-24',
      status: 'pending',
    },
    {
      id: '5',
      description: 'Travel Expenses',
      category: 'Travel',
      amount: -450,
      date: '2024-03-22',
      status: 'completed',
    },
    {
      id: '6',
      description: 'Equipment Purchase',
      category: 'Technology',
      amount: -2500,
      date: '2024-03-20',
      status: 'completed',
    },
  ];

  const chartData: ChartData[] = [
    { month: 'Jan', expenses: 12000, revenue: 28000 },
    { month: 'Feb', expenses: 15000, revenue: 32000 },
    { month: 'Mar', expenses: 18000, revenue: 35000 },
    { month: 'Apr', expenses: 16000, revenue: 30000 },
    { month: 'May', expenses: 20000, revenue: 38000 },
    { month: 'Jun', expenses: 19000, revenue: 36000 },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('overview')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('welcome', { name: 'John' })}
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
              change="+12.5%"
              isPositive={true}
              icon={<TrendingUp size={24} />}
            />
            <StatCard
              title={t('totalExpenses')}
              value={formatCurrency(totalExpenses)}
              change="-2.3%"
              isPositive={true}
              icon={<Upload size={24} />}
            />
            <StatCard
              title={t('netIncome')}
              value={formatCurrency(netIncome)}
              change="+18.2%"
              isPositive={true}
              icon={<ArrowUpRight size={24} />}
            />
            <StatCard
              title={t('estimatedTax')}
              value={formatCurrency(estimatedTax)}
              change="+5.1%"
              isPositive={false}
              icon={<FileText size={24} />}
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
                        {formatCurrency(totalExpenses / 6)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tax Rate</span>
                      <span className="font-semibold text-gray-900">26%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">YTD Margin</span>
                      <span className="font-semibold text-green-600">64%</span>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Runway</span>
                        <span className="font-semibold text-gray-900">
                          8.2 months
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Transactions */}
          <TransactionTable transactions={mockTransactions} />
        </div>
      </div>
    </div>
  );
}
