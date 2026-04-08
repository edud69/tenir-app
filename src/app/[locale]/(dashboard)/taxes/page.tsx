'use client';

import React, { useState, useEffect } from 'react';
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
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

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

interface TaxProfile {
  id: string;
  organization_id: string;
  tax_year: number;
  federal_tax: number | null;
  provincial_tax: number | null;
  total_tax: number | null;
  taxable_income: number | null;
  effective_rate: number | null;
  installments: TaxInstallment[] | null;
  integration_data: IntegrationRow[] | null;
  tax_breakdown: any[] | null;
  grip: number | null;
  cda: number | null;
}

export default function TaxesPage() {
  const t = useTranslations('taxes');
  const commonT = useTranslations('common');
  const { orgId, loading: orgLoading } = useOrganization();
  const supabase = createClient();

  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = [
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
  ];

  useEffect(() => {
    if (!orgId) return;
    fetchTaxProfile();
  }, [orgId, selectedYear]);

  async function fetchTaxProfile() {
    setDataLoading(true);
    setError(null);
    setTaxProfile(null);
    try {
      const { data, error } = await (supabase as any)
        .from('tax_profiles')
        .select('*')
        .eq('organization_id', orgId)
        .eq('tax_year', parseInt(selectedYear))
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        throw error;
      }

      setTaxProfile(data || null);
    } catch (e: any) {
      setError(e.message || 'Failed to load tax profile');
    } finally {
      setDataLoading(false);
    }
  }

  async function handleCalculate() {
    if (!orgId) return;
    setCalculating(true);
    setError(null);
    try {
      const response = await fetch('/api/taxes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          taxYear: parseInt(selectedYear),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Calculation failed');
      }

      const result = await response.json();

      // Save to tax_profiles table
      const profileData = {
        organization_id: orgId,
        tax_year: parseInt(selectedYear),
        federal_tax: result.federal_tax ?? null,
        provincial_tax: result.provincial_tax ?? null,
        total_tax: result.total_tax ?? null,
        taxable_income: result.taxable_income ?? null,
        effective_rate: result.effective_rate ?? null,
        installments: result.installments ?? null,
        integration_data: result.integration_data ?? null,
        tax_breakdown: result.tax_breakdown ?? null,
        grip: result.grip ?? null,
        cda: result.cda ?? null,
      };

      const { data: upserted, error: upsertError } = await (supabase as any)
        .from('tax_profiles')
        .upsert(profileData, { onConflict: 'organization_id,tax_year' })
        .select()
        .single();

      if (upsertError) throw upsertError;
      setTaxProfile(upserted);
    } catch (e: any) {
      setError(e.message || 'Failed to calculate taxes');
    } finally {
      setCalculating(false);
    }
  }

  const federalTax = taxProfile?.federal_tax ?? 0;
  const provincialTax = taxProfile?.provincial_tax ?? 0;
  const totalTax = taxProfile?.total_tax ?? 0;
  const taxableIncome = taxProfile?.taxable_income ?? 0;
  const effectiveRate = taxProfile?.effective_rate ?? 0;
  const installments: TaxInstallment[] = taxProfile?.installments ?? [];
  const integrationData: IntegrationRow[] = taxProfile?.integration_data ?? [];
  const taxBreakdownData: any[] = taxProfile?.tax_breakdown ?? [];
  const grip = taxProfile?.grip ?? 0;
  const cda = taxProfile?.cda ?? 0;

  const isLoading = orgLoading || dataLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title={t('projectionsTitle')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('projectionsTitle')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Year Selector */}
          <div className="mb-8 flex items-end gap-4">
            <div className="max-w-xs">
              <Select
                label={t('selectYear')}
                options={yearOptions}
                value={selectedYear}
                onChange={(value) => setSelectedYear(value as string)}
                placeholder={t('selectYear')}
              />
            </div>
            {!taxProfile && !dataLoading && (
              <Button
                variant="primary"
                onClick={handleCalculate}
                disabled={calculating || !orgId}
              >
                {calculating ? commonT('loading') : 'Calculate Taxes'}
              </Button>
            )}
          </div>

          {/* No profile state */}
          {!taxProfile && !dataLoading && (
            <Card padding="lg" shadow="sm" className="mb-8 text-center">
              <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No tax data for {selectedYear}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Click "Calculate Taxes" to generate a tax projection for {selectedYear}.
              </p>
              <Button
                variant="primary"
                onClick={handleCalculate}
                disabled={calculating || !orgId}
              >
                {calculating ? commonT('loading') : 'Calculate Taxes'}
              </Button>
            </Card>
          )}

          {taxProfile && (
            <>
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
                      {taxBreakdownData.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={taxBreakdownData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name} $${entry.value?.toLocaleString()}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {taxBreakdownData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color || '#0c8ee9'} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(value as number)} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>

                          <div className="mt-6 space-y-3">
                            {taxBreakdownData.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center pb-3 border-b border-gray-200 last:border-0"
                              >
                                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(item.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="py-8 text-center text-gray-500 text-sm">
                          No breakdown data available.
                        </div>
                      )}
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
                        {formatCurrency(grip)}
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
                        {formatCurrency(cda)}
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
              {installments.length > 0 && (
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
                        {installments.map((installment, idx) => (
                          <TableRow key={idx}>
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
                              <Badge
                                variant={
                                  new Date(installment.dueDate) < new Date()
                                    ? 'success'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {new Date(installment.dueDate) < new Date() ? 'Due' : 'Upcoming'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Integration Model */}
              {integrationData.length > 0 && (
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
                          {integrationData.map((row, idx) => (
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
                      This model shows the tax impact of different payment methods to achieve shareholder value.
                      Based on combined federal and Quebec rates for {selectedYear}.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Recalculate button */}
              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleCalculate}
                  disabled={calculating}
                >
                  {calculating ? commonT('loading') : 'Recalculate'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
