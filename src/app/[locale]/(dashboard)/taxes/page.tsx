'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatPercent } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'success';
}

function TaxStatCard({
  title,
  value,
  icon,
  variant = 'default',
}: StatCardProps) {
  const bgColors = {
    default: 'bg-tenir-100 text-tenir-600',
    warning: 'bg-red-100 text-red-600',
    success: 'bg-green-100 text-green-600',
  };

  return (
    <Card padding="md" shadow="sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColors[variant]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface TaxInstallment {
  id: string;
  quarter: number;
  dueDate: string;
  amount: number;
}

interface IntegrationRow {
  method: string;
  salary: number;
  eligibleDiv: number;
  nonEligibleDiv: number;
  totalCost: number;
  savings: number;
}

const mockInstallments: TaxInstallment[] = [
  { id: '1', quarter: 1, dueDate: '2025-03-31', amount: 12500 },
  { id: '2', quarter: 2, dueDate: '2025-06-30', amount: 12500 },
  { id: '3', quarter: 3, dueDate: '2025-09-30', amount: 12500 },
  { id: '4', quarter: 4, dueDate: '2025-12-31', amount: 12500 },
];

const mockIntegrationData: IntegrationRow[] = [
  {
    method: 'Salary',
    salary: 50000,
    eligibleDiv: 0,
    nonEligibleDiv: 0,
    totalCost: 68100,
    savings: 0,
  },
  {
    method: 'Eligible Dividend',
    salary: 0,
    eligibleDiv: 50000,
    nonEligibleDiv: 0,
    totalCost: 67200,
    savings: 900,
  },
  {
    method: 'Non-Eligible Dividend',
    salary: 0,
    eligibleDiv: 0,
    nonEligibleDiv: 50000,
    totalCost: 72500,
    savings: -4400,
  },
];

const taxBreakdownData = [
  { name: 'Small business income (9%)', value: 28500, color: '#0c8ee9' },
  { name: 'Investment income (38.67%)', value: 18400, color: '#8b5cf6' },
  { name: 'Capital gains (2/3)', value: 8200, color: '#ec4899' },
  { name: 'Dividend tax', value: 5900, color: '#f59e0b' },
];

export default function TaxesPage() {
  const t = useTranslations('taxes');
  const commonT = useTranslations('common');
  const [selectedYear, setSelectedYear] = useState<string>('2025');

  // Mock tax data for a small CCPC holding company
  const federalTax = 28500;
  const provincialTax = 12400;
  const totalTax = federalTax + provincialTax;
  const taxableIncome = 150000;
  const effectiveRate = (totalTax / taxableIncome);

  const yearOptions = [
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('projectionsTitle')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Year Selector */}
          <div className="mb-8">
            <div className="max-w-xs">
              <Select
                label={t('selectYear')}
                options={yearOptions}
                value={selectedYear}
                onChange={(value) => setSelectedYear(value as string)}
                placeholder={t('selectYear')}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <TaxStatCard
              title={t('federalTax')}
              value={formatCurrency(federalTax)}
              icon={<DollarSign size={24} />}
              variant="warning"
            />
            <TaxStatCard
              title={t('provincialTax')}
              value={formatCurrency(provincialTax)}
              icon={<DollarSign size={24} />}
              variant="warning"
            />
            <TaxStatCard
              title={t('totalTax')}
              value={formatCurrency(totalTax)}
              icon={<TrendingUp size={24} />}
              variant="warning"
            />
            <TaxStatCard
              title={t('effectiveRate')}
              value={formatPercent(effectiveRate)}
              icon={<BarChart3 size={24} />}
              variant="default"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Tax Breakdown and Pie Chart */}
            <div className="lg:col-span-2">
              <Card padding="md" shadow="sm">
                <CardHeader>
                  <CardTitle level="h3">{t('breakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={taxBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name} $${entry.value.toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {taxBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Breakdown Details */}
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">
                        {t('activeBusinessIncome')} ({t('smallBusinessRate')} / {t('smallBusinessRate')})
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(28500)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">
                        {t('investmentIncome')} ({t('higherRate')})
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(18400)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-700">
                        {t('capitalGains')} ({t('inclusionRate')})
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(8200)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {t('dividends')} ({t('rdtohEligible')}/{t('rdtohNonEligible')})
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(5900)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Balances */}
            <div className="space-y-6">
              <Card padding="md" shadow="sm">
                <CardHeader>
                  <CardTitle level="h3">{t('grip')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(156800)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Capital gains reserve eligible for capital dividend distribution
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    {commonT('edit')}
                  </Button>
                </CardContent>
              </Card>

              <Card padding="md" shadow="sm">
                <CardHeader>
                  <CardTitle level="h3">{t('cda')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(89450)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Available for tax-free capital dividend distribution
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    {commonT('edit')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tax Installments */}
          <Card padding="md" shadow="sm" className="mb-8">
            <CardHeader>
              <CardTitle level="h3">{t('installments')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table striped hoverable>
                <TableHeader>
                  <TableRow isHeader>
                    <TableHead>Q</TableHead>
                    <TableHead>{t('installmentDate')}</TableHead>
                    <TableHead align="right">{t('installmentAmount')}</TableHead>
                    <TableHead align="center">{commonT('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockInstallments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell>
                        <Badge variant="info" size="sm">
                          Q{installment.quarter}
                        </Badge>
                      </TableCell>
                      <TableCell>{installment.dueDate}</TableCell>
                      <TableCell align="right" className="font-semibold">
                        {formatCurrency(installment.amount)}
                      </TableCell>
                      <TableCell align="center">
                        <Badge variant="success" size="sm">
                          Paid
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Integration Model */}
          <Card padding="md" shadow="sm">
            <CardHeader>
              <CardTitle level="h3">{t('integrationModel')}</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                {t('integrationDescription')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table striped hoverable>
                  <TableHeader>
                    <TableRow isHeader>
                      <TableHead>Method</TableHead>
                      <TableHead align="right">{t('salary')}</TableHead>
                      <TableHead align="right">{t('eligibleDividend')}</TableHead>
                      <TableHead align="right">{t('nonEligibleDividend')}</TableHead>
                      <TableHead align="right">{t('totalCost')}</TableHead>
                      <TableHead align="right">{t('savingsVsSalary')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockIntegrationData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.method}</TableCell>
                        <TableCell align="right">{formatCurrency(row.salary)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.eligibleDiv)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.nonEligibleDiv)}</TableCell>
                        <TableCell align="right" className="font-semibold">
                          {formatCurrency(row.totalCost)}
                        </TableCell>
                        <TableCell
                          align="right"
                          className={`font-semibold ${
                            row.savings > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {row.savings > 0 ? '+' : ''}{formatCurrency(row.savings)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-gray-600 mt-4">
                This model shows the tax impact of different payment methods to achieve $50,000 in
                shareholder value. Based on 2025 combined federal and Quebec rates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
