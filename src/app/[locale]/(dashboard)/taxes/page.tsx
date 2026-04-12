'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { formatCurrency, formatPercent } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Percent,
  Calculator,
  RefreshCw,
  Building2,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

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
  tax_breakdown: { name: string; value: number; color: string }[] | null;
  grip_balance: number | null;
  cda_balance: number | null;
  rdtoh_eligible: number | null;
  rdtoh_non_eligible: number | null;
}

export default function TaxesPage() {
  const t = useTranslations('taxes');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { orgId, loading: orgLoading } = useOrganization();
  const supabase = createClient();

  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentTotals, setPaymentTotals] = useState<{ federal: number; provincial: number }>({ federal: 0, provincial: 0 });

  const yearOptions = [
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
  ];

  useEffect(() => {
    if (!orgId) return;
    fetchTaxProfile();
    fetchPaymentTotals();
  }, [orgId, selectedYear]);

  async function fetchPaymentTotals() {
    if (!orgId) return;
    try {
      const { data } = await (supabase as any)
        .from('tax_payments')
        .select('authority, amount')
        .eq('organization_id', orgId)
        .eq('tax_year', parseInt(selectedYear));
      if (!data) return;
      const federal = data.filter((r: any) => r.authority === 'federal').reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
      const provincial = data.filter((r: any) => r.authority === 'provincial').reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
      setPaymentTotals({ federal, provincial });
    } catch {
      // non-blocking
    }
  }

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

      if (error && error.code !== 'PGRST116') throw error;
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
        body: JSON.stringify({ orgId, taxYear: parseInt(selectedYear) }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Calculation failed');
      }

      const result = await response.json();

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
        grip_balance: result.grip_balance ?? 0,
        cda_balance: result.cda_balance ?? 0,
        rdtoh_eligible: result.rdtoh_eligible ?? 0,
        rdtoh_non_eligible: result.rdtoh_non_eligible ?? 0,
        active_business_income: result.active_business_income ?? 0,
        aggregate_investment_income: result.aggregate_investment_income ?? 0,
        corporation_type: result.corporation_type ?? 'ccpc',
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
  const taxBreakdownData = taxProfile?.tax_breakdown ?? [];
  const gripBalance = taxProfile?.grip_balance ?? 0;
  const cdaBalance = taxProfile?.cda_balance ?? 0;
  const rdtohEligible = taxProfile?.rdtoh_eligible ?? 0;

  const isLoading = orgLoading || dataLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title={t('projectionsTitle')} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-tenir-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">{commonT('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      <Header title={t('projectionsTitle')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {/* Error banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Top bar: year selector + action */}
          <div className="mb-8 flex items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="w-36">
                <Select
                  label={t('selectYear')}
                  options={yearOptions}
                  value={selectedYear}
                  onChange={(value) => setSelectedYear(value as string)}
                  placeholder={t('selectYear')}
                />
              </div>
              {taxProfile && (
                <p className="text-sm text-gray-500 pb-2">
                  {t('taxYear', { year: selectedYear })}
                </p>
              )}
            </div>
            {!taxProfile ? (
              <Button
                variant="primary"
                onClick={handleCalculate}
                disabled={calculating || !orgId}
                className="flex items-center gap-2"
              >
                <Calculator size={16} />
                {calculating ? commonT('loading') : t('calculate')}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleCalculate}
                disabled={calculating}
                className="flex items-center gap-2"
              >
                <RefreshCw size={15} className={calculating ? 'animate-spin' : ''} />
                {calculating ? commonT('loading') : t('calculate')}
              </Button>
            )}
          </div>

          {/* Empty state */}
          {!taxProfile && !dataLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-2xl bg-tenir-50 border border-tenir-100 flex items-center justify-center mb-6">
                <Calculator size={36} className="text-tenir-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {t('noProfile')}
              </h3>
              <p className="text-sm text-gray-500 mb-8 max-w-sm">
                {t('taxYear', { year: selectedYear })}
              </p>
              <Button
                variant="primary"
                onClick={handleCalculate}
                disabled={calculating || !orgId}
                className="flex items-center gap-2"
              >
                <Calculator size={16} />
                {calculating ? commonT('loading') : t('calculate')}
              </Button>
            </div>
          )}

          {taxProfile && (
            <>
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  label={t('federalTax')}
                  value={formatCurrency(federalTax)}
                  icon={<DollarSign size={18} />}
                  color="blue"
                />
                <StatCard
                  label={t('provincialTax')}
                  value={formatCurrency(provincialTax)}
                  icon={<Building2 size={18} />}
                  color="purple"
                />
                <StatCard
                  label={t('totalTax')}
                  value={formatCurrency(totalTax)}
                  icon={<TrendingUp size={18} />}
                  color="red"
                  highlight
                />
                <StatCard
                  label={t('effectiveRate')}
                  value={formatPercent(effectiveRate)}
                  icon={<Percent size={18} />}
                  color="emerald"
                />
              </div>

              {/* Taxable income banner */}
              <div className="mb-6 px-5 py-4 rounded-xl bg-white border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Taxable Income</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(taxableIncome)}</span>
              </div>

              {/* Main 2-col layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Tax breakdown chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-6">{t('breakdown')}</h3>
                  {taxBreakdownData.length > 0 ? (
                    <div className="flex items-center gap-8">
                      <div className="flex-shrink-0">
                        <ResponsiveContainer width={200} height={200}>
                          <PieChart>
                            <Pie
                              data={taxBreakdownData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {taxBreakdownData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-3">
                        {taxBreakdownData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm text-gray-600">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(item.value)}
                            </span>
                          </div>
                        ))}
                        <div className="pt-3 border-t border-gray-100 flex justify-between">
                          <span className="text-sm font-semibold text-gray-700">Total</span>
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(totalTax)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-400 text-sm">
                      No breakdown data available.
                    </div>
                  )}
                </div>

                {/* Account balances sidebar */}
                <div className="space-y-4">
                  <AccountBalanceCard
                    label={t('grip')}
                    value={gripBalance}
                    description="General Rate Income Pool — eligible for enhanced dividend tax credit"
                    color="blue"
                  />
                  <AccountBalanceCard
                    label={t('cda')}
                    value={cdaBalance}
                    description="Capital Dividend Account — available for tax-free distribution"
                    color="emerald"
                  />
                  {rdtohEligible > 0 && (
                    <AccountBalanceCard
                      label="RDTOH Eligible"
                      value={rdtohEligible}
                      description="Refundable on payment of eligible dividends"
                      color="purple"
                    />
                  )}
                </div>
              </div>

              {/* Installments */}
              {installments.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-5">{t('installments')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {installments.map((inst) => {
                      const isPast = new Date(inst.dueDate) < new Date();
                      return (
                        <div
                          key={inst.quarter}
                          className={`rounded-xl p-4 border ${
                            isPast
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-tenir-50 border-tenir-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                              Q{inst.quarter}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                isPast
                                  ? 'bg-gray-200 text-gray-600'
                                  : 'bg-tenir-100 text-tenir-700'
                              }`}
                            >
                              {isPast ? 'Due' : 'Upcoming'}
                            </span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 mb-1">
                            {formatCurrency(inst.amount)}
                          </p>
                          <p className="text-xs text-gray-500">{inst.dueDate}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tax Payments Preview */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <CreditCard size={18} className="text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">Paiements versés</h3>
                  </div>
                  <Link
                    href={`/${locale}/tax-payments`}
                    className="flex items-center gap-1 text-sm text-tenir-600 hover:text-tenir-700 font-medium transition-colors"
                  >
                    Voir les paiements <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Federal */}
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">{t('federalTax')}</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(paymentTotals.federal)}</p>
                    <p className="text-xs text-blue-400 mt-1">payé en {selectedYear}</p>
                    {federalTax > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400 transition-all"
                            style={{ width: `${Math.min(100, (paymentTotals.federal / federalTax) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-blue-400 mt-1">
                          {Math.round((paymentTotals.federal / federalTax) * 100)}% de {formatCurrency(federalTax)}
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Provincial */}
                  <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 mb-1">{t('provincialTax')}</p>
                    <p className="text-xl font-bold text-purple-700">{formatCurrency(paymentTotals.provincial)}</p>
                    <p className="text-xs text-purple-400 mt-1">payé en {selectedYear}</p>
                    {provincialTax > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-purple-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-400 transition-all"
                            style={{ width: `${Math.min(100, (paymentTotals.provincial / provincialTax) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-purple-400 mt-1">
                          {Math.round((paymentTotals.provincial / provincialTax) * 100)}% de {formatCurrency(provincialTax)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Integration model */}
              {integrationData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-gray-900">{t('integrationModel')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('integrationDescription')}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left font-medium text-gray-500 pb-3 pr-4">Method</th>
                          <th className="text-right font-medium text-gray-500 pb-3 px-4">{t('salary')}</th>
                          <th className="text-right font-medium text-gray-500 pb-3 px-4">{t('eligibleDividend')}</th>
                          <th className="text-right font-medium text-gray-500 pb-3 px-4">{t('nonEligibleDividend')}</th>
                          <th className="text-right font-medium text-gray-500 pb-3 px-4">{t('totalCost')}</th>
                          <th className="text-right font-medium text-gray-500 pb-3 pl-4">{t('savingsVsSalary')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {integrationData.map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-3.5 pr-4 font-medium text-gray-800">{row.method}</td>
                            <td className="py-3.5 px-4 text-right text-gray-600">{formatCurrency(row.salary)}</td>
                            <td className="py-3.5 px-4 text-right text-gray-600">{formatCurrency(row.eligibleDiv)}</td>
                            <td className="py-3.5 px-4 text-right text-gray-600">{formatCurrency(row.nonEligibleDiv)}</td>
                            <td className="py-3.5 px-4 text-right font-semibold text-gray-900">{formatCurrency(row.totalCost)}</td>
                            <td className={`py-3.5 pl-4 text-right font-semibold ${row.savings > 0 ? 'text-emerald-600' : row.savings < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {row.savings > 0 ? '+' : ''}{formatCurrency(row.savings)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Based on combined federal and Quebec rates for {selectedYear}. Consult a CPA for precise planning.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

type Color = 'blue' | 'purple' | 'red' | 'emerald';

const colorMap: Record<Color, { icon: string; value: string; bg: string }> = {
  blue:    { icon: 'bg-blue-100 text-blue-600',    value: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100' },
  purple:  { icon: 'bg-purple-100 text-purple-600', value: 'text-purple-700',  bg: 'bg-purple-50 border-purple-100' },
  red:     { icon: 'bg-red-100 text-red-600',       value: 'text-red-700',     bg: 'bg-red-50 border-red-100' },
  emerald: { icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
};

function StatCard({
  label,
  value,
  icon,
  color,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: Color;
  highlight?: boolean;
}) {
  const c = colorMap[color];
  return (
    <div className={`rounded-2xl border p-5 bg-white ${highlight ? 'ring-2 ring-red-200' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.icon}`}>
          {icon}
        </span>
      </div>
      <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
    </div>
  );
}

function AccountBalanceCard({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: number;
  description: string;
  color: Color;
}) {
  const c = colorMap[color];
  return (
    <div className={`rounded-2xl border p-5 ${c.bg}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
      <p className={`text-2xl font-bold mb-1.5 ${c.value}`}>{formatCurrency(value)}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
