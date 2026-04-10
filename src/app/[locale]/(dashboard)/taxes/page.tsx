'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Percent,
  Calculator,
  RefreshCw,
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { formatDate, cn } from '@/lib/utils';

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

interface TaxPayment {
  id: string;
  organization_id: string;
  tax_year: number;
  authority: 'federal' | 'provincial';
  payment_type: 'installment' | 'balance_owing' | 'arrears';
  quarter: number | null;
  amount: number;
  due_amount: number | null;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
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
  const { orgId, loading: orgLoading } = useOrganization();
  const supabase = createClient();

  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tax payments state
  const [payments, setPayments] = useState<TaxPayment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDefaults, setPaymentDefaults] = useState<Partial<TaxPayment> | undefined>();

  const yearOptions = [
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
  ];

  useEffect(() => {
    if (!orgId) return;
    fetchTaxProfile();
    fetchPayments();
  }, [orgId, selectedYear]);

  async function fetchPayments() {
    if (!orgId) return;
    const { data } = await (supabase as any)
      .from('tax_payments')
      .select('*')
      .eq('organization_id', orgId)
      .eq('tax_year', parseInt(selectedYear))
      .order('payment_date', { ascending: false });
    setPayments(data || []);
  }

  async function handleAddPayment(fd: TaxPaymentFormData) {
    if (!orgId) return;
    const { data, error: err } = await (supabase as any)
      .from('tax_payments')
      .insert({
        organization_id: orgId,
        tax_year:         parseInt(selectedYear),
        authority:        fd.authority,
        payment_type:     fd.payment_type,
        quarter:          fd.quarter || null,
        amount:           parseFloat(fd.amount),
        due_amount:       fd.due_amount ? parseFloat(fd.due_amount) : null,
        payment_date:     fd.payment_date,
        payment_method:   fd.payment_method,
        reference_number: fd.reference_number || null,
        notes:            fd.notes || null,
      })
      .select()
      .single();
    if (err) { setError(err.message); return; }
    setPayments((p) => [data, ...p]);
  }

  async function handleDeletePayment(id: string) {
    if (!confirm('Supprimer ce paiement ?')) return;
    await (supabase as any).from('tax_payments').delete().eq('id', id);
    setPayments((p) => p.filter((x) => x.id !== id));
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
                  Tax projection for fiscal year {selectedYear}
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
                {calculating ? commonT('loading') : 'Calculate Taxes'}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleCalculate}
                disabled={calculating}
                className="flex items-center gap-2"
              >
                <RefreshCw size={15} className={calculating ? 'animate-spin' : ''} />
                {calculating ? commonT('loading') : 'Recalculate'}
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
                No tax data for {selectedYear}
              </h3>
              <p className="text-sm text-gray-500 mb-8 max-w-sm">
                Generate a tax projection based on your transactions and organization settings.
              </p>
              <Button
                variant="primary"
                onClick={handleCalculate}
                disabled={calculating || !orgId}
                className="flex items-center gap-2"
              >
                <Calculator size={16} />
                {calculating ? commonT('loading') : 'Calculate Taxes'}
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

          {/* ── Tax Payments ── */}
          <TaxPaymentsSection
            year={parseInt(selectedYear)}
            payments={payments}
            federalTax={taxProfile?.federal_tax ?? null}
            provincialTax={taxProfile?.provincial_tax ?? null}
            onAdd={(defaults) => { setPaymentDefaults(defaults); setShowPaymentModal(true); }}
            onDelete={handleDeletePayment}
          />

        </div>
      </div>

      {showPaymentModal && (
        <TaxPaymentModal
          year={parseInt(selectedYear)}
          defaults={paymentDefaults}
          onClose={() => { setShowPaymentModal(false); setPaymentDefaults(undefined); }}
          onSubmit={handleAddPayment}
        />
      )}

    </div>
  );
}

// ── Tax Payment Form ─────────────────────────────────────────────────────────

interface TaxPaymentFormData {
  authority: 'federal' | 'provincial';
  payment_type: 'installment' | 'balance_owing' | 'arrears';
  quarter: string;
  amount: string;
  due_amount: string;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
}

function TaxPaymentModal({ year, defaults, onClose, onSubmit }: {
  year: number;
  defaults?: Partial<TaxPayment>;
  onClose: () => void;
  onSubmit: (fd: TaxPaymentFormData) => void;
}) {
  const [fd, setFd] = useState<TaxPaymentFormData>({
    authority:        defaults?.authority        ?? 'federal',
    payment_type:     defaults?.payment_type     ?? 'installment',
    quarter:          defaults?.quarter != null  ? String(defaults.quarter) : '',
    amount:           defaults?.due_amount != null ? String(defaults.due_amount) : '',
    due_amount:       defaults?.due_amount != null ? String(defaults.due_amount) : '',
    payment_date:     new Date().toISOString().split('T')[0],
    payment_method:   'online',
    reference_number: '',
    notes:            '',
  });

  const authorityLabel = fd.authority === 'federal' ? 'ARC — Fédéral' : 'Revenu Québec — Provincial';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Enregistrer un paiement d'impôt"
      size="md"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            fullWidth
            disabled={!fd.amount || !fd.payment_date}
            onClick={() => { onSubmit(fd); onClose(); }}
          >
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Authority + type row */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Autorité fiscale"
            value={fd.authority}
            onChange={(v) => setFd({ ...fd, authority: v as 'federal' | 'provincial' })}
            options={[
              { value: 'federal',    label: 'ARC — Fédéral' },
              { value: 'provincial', label: 'Revenu Québec' },
            ]}
          />
          <Select
            label="Type de paiement"
            value={fd.payment_type}
            onChange={(v) => setFd({ ...fd, payment_type: v as TaxPaymentFormData['payment_type'] })}
            options={[
              { value: 'installment',   label: 'Acompte provisionnel' },
              { value: 'balance_owing', label: 'Solde dû (fin d\'année)' },
              { value: 'arrears',       label: 'Arriérés' },
            ]}
          />
        </div>

        {/* Quarter — only for installments */}
        {fd.payment_type === 'installment' && (
          <Select
            label="Trimestre"
            value={fd.quarter}
            onChange={(v) => setFd({ ...fd, quarter: v as string })}
            options={[
              { value: '1', label: 'T1 — Échéance 15 mars' },
              { value: '2', label: 'T2 — Échéance 15 juin' },
              { value: '3', label: 'T3 — Échéance 15 septembre' },
              { value: '4', label: 'T4 — Échéance 15 décembre' },
            ]}
            placeholder="Sélectionner un trimestre"
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Montant payé ($)"
            type="number"
            step="0.01"
            value={fd.amount}
            onChange={(e) => setFd({ ...fd, amount: e.target.value })}
            placeholder="0.00"
            required
          />
          <Input
            label="Date de paiement"
            type="date"
            value={fd.payment_date}
            onChange={(e) => setFd({ ...fd, payment_date: e.target.value })}
            required
          />
        </div>

        <Select
          label="Mode de paiement"
          value={fd.payment_method}
          onChange={(v) => setFd({ ...fd, payment_method: v as string })}
          options={[
            { value: 'online',         label: 'En ligne (institution financière)' },
            { value: 'my_account',     label: 'Mon dossier ARC / Mon dossier RQ' },
            { value: 'preauthorized',  label: 'Débit préautorisé' },
            { value: 'cheque',         label: 'Chèque' },
            { value: 'other',          label: 'Autre' },
          ]}
        />

        <Input
          label="Numéro de confirmation / référence"
          value={fd.reference_number}
          onChange={(e) => setFd({ ...fd, reference_number: e.target.value })}
          placeholder="Optionnel"
        />

        <Input
          label="Notes"
          value={fd.notes}
          onChange={(e) => setFd({ ...fd, notes: e.target.value })}
          placeholder="Optionnel"
        />

        <div className="p-3 bg-tenir-50 border border-tenir-100 rounded-xl text-xs text-tenir-700">
          <span className="font-semibold">{authorityLabel}</span> · Année fiscale {year}
        </div>
      </div>
    </Modal>
  );
}

// ── Tax Payments Section ─────────────────────────────────────────────────────

const INSTALLMENT_DATES: Record<number, string> = {
  1: '15 mars', 2: '15 juin', 3: '15 septembre', 4: '15 décembre',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  online: 'En ligne', my_account: 'Mon dossier', preauthorized: 'Débit préautorisé',
  cheque: 'Chèque', other: 'Autre',
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  installment: 'Acompte', balance_owing: 'Solde dû', arrears: 'Arriérés',
};

function TaxPaymentsSection({ year, payments, federalTax, provincialTax, onAdd, onDelete }: {
  year: number;
  payments: TaxPayment[];
  federalTax: number | null;
  provincialTax: number | null;
  onAdd: (defaults?: Partial<TaxPayment>) => void;
  onDelete: (id: string) => void;
}) {
  const federalInstallments = payments.filter((p) => p.authority === 'federal' && p.payment_type === 'installment');
  const provincialInstallments = payments.filter((p) => p.authority === 'provincial' && p.payment_type === 'installment');
  const otherPayments = payments.filter((p) => p.payment_type !== 'installment');

  const quarterlyFederal   = federalTax   != null ? federalTax   / 4 : null;
  const quarterlyProvincial = provincialTax != null ? provincialTax / 4 : null;

  function paidForQuarter(auth: 'federal' | 'provincial', q: number) {
    return payments
      .filter((p) => p.authority === auth && p.payment_type === 'installment' && p.quarter === q)
      .reduce((s, p) => s + p.amount, 0);
  }

  function QuarterRow({ auth, q, expected }: { auth: 'federal' | 'provincial'; q: number; expected: number | null }) {
    const paid = paidForQuarter(auth, q);
    const dueDate = `${INSTALLMENT_DATES[q]} ${year}`;
    const isPast = (() => {
      const [day, month] = INSTALLMENT_DATES[q].split(' ');
      const months: Record<string, number> = { mars: 2, juin: 5, septembre: 8, décembre: 11 };
      return new Date(year, months[month], parseInt(day)) < new Date();
    })();
    const isFullyPaid = expected != null && paid >= expected * 0.99;
    const isPartial   = paid > 0 && !isFullyPaid;
    const isUnpaid    = paid === 0;

    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all',
        isFullyPaid ? 'bg-emerald-50/60 border-emerald-100'
          : isPartial ? 'bg-amber-50/60 border-amber-100'
          : isPast    ? 'bg-red-50/40 border-red-100'
          : 'bg-gray-50 border-gray-100'
      )}>
        {/* Status icon */}
        <div className="flex-shrink-0">
          {isFullyPaid
            ? <CheckCircle2 size={16} className="text-emerald-500" />
            : isPartial
            ? <Clock size={16} className="text-amber-500" />
            : isPast
            ? <AlertCircle size={16} className="text-red-400" />
            : <Clock size={16} className="text-gray-300" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-700">T{q}</span>
            <span className="text-xs text-gray-400">· {dueDate}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {expected != null && (
              <span className="text-xs text-gray-400">Attendu: {formatCurrency(expected)}</span>
            )}
            {paid > 0 && (
              <span className={cn('text-xs font-semibold', isFullyPaid ? 'text-emerald-600' : 'text-amber-600')}>
                Payé: {formatCurrency(paid)}
              </span>
            )}
          </div>
        </div>

        {/* Pay button */}
        {!isFullyPaid && (
          <button
            onClick={() => onAdd({
              authority: auth,
              payment_type: 'installment',
              quarter: q,
              due_amount: expected ?? undefined,
            } as any)}
            className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg bg-tenir-500 text-white hover:bg-tenir-600 font-medium transition-colors"
          >
            Payer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-tenir-50 flex items-center justify-center">
            <CreditCard size={17} className="text-tenir-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Paiements d'impôts</h3>
            <p className="text-xs text-gray-400">Acomptes provisionnels et soldes dus — {year}</p>
          </div>
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => onAdd()}>
          Enregistrer un paiement
        </Button>
      </div>

      {/* Two-column: Federal | Provincial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Federal */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">ARC — Fédéral</span>
            {federalTax != null && (
              <span className="text-xs text-gray-400">
                · Total estimé: {formatCurrency(federalTax)}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((q) => (
              <QuarterRow key={q} auth="federal" q={q} expected={quarterlyFederal} />
            ))}
          </div>
          {/* Non-installment federal payments */}
          {payments.filter((p) => p.authority === 'federal' && p.payment_type !== 'installment').map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 mt-2 rounded-xl bg-blue-50/50 border border-blue-100">
              <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700">{PAYMENT_TYPE_LABELS[p.payment_type]}</p>
                <p className="text-xs text-gray-400">{formatDate(p.payment_date)}</p>
              </div>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>

        {/* Provincial */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Revenu Québec — Provincial</span>
            {provincialTax != null && (
              <span className="text-xs text-gray-400">
                · Total estimé: {formatCurrency(provincialTax)}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((q) => (
              <QuarterRow key={q} auth="provincial" q={q} expected={quarterlyProvincial} />
            ))}
          </div>
          {payments.filter((p) => p.authority === 'provincial' && p.payment_type !== 'installment').map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 mt-2 rounded-xl bg-blue-50/50 border border-blue-100">
              <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700">{PAYMENT_TYPE_LABELS[p.payment_type]}</p>
                <p className="text-xs text-gray-400">{formatDate(p.payment_date)}</p>
              </div>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="border-t border-gray-100 pt-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historique des paiements</h4>
          <div className="space-y-1.5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group">
                <div className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  p.authority === 'federal' ? 'bg-blue-400' : 'bg-tenir-400'
                )} />
                <div className="flex-1 min-w-0 grid grid-cols-4 gap-2 text-sm">
                  <span className="text-gray-500 text-xs">{formatDate(p.payment_date)}</span>
                  <span className={cn('text-xs font-medium', p.authority === 'federal' ? 'text-blue-600' : 'text-tenir-600')}>
                    {p.authority === 'federal' ? 'ARC' : 'Rev. QC'}
                    {p.payment_type === 'installment' && p.quarter ? ` T${p.quarter}` : ''}
                  </span>
                  <span className="text-xs text-gray-400">{PAYMENT_TYPE_LABELS[p.payment_type]}</span>
                  <span className="text-xs font-semibold text-gray-900 text-right">{formatCurrency(p.amount)}</span>
                </div>
                {p.reference_number && (
                  <span className="text-xs text-gray-300 hidden group-hover:inline truncate max-w-[100px]">
                    #{p.reference_number}
                  </span>
                )}
                <button
                  onClick={() => onDelete(p.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-500 font-medium mb-0.5">Total payé — ARC</p>
              <p className="text-base font-bold text-blue-700">
                {formatCurrency(payments.filter((p) => p.authority === 'federal').reduce((s, p) => s + p.amount, 0))}
              </p>
            </div>
            <div className="p-3 bg-tenir-50 rounded-xl border border-tenir-100">
              <p className="text-xs text-tenir-500 font-medium mb-0.5">Total payé — Revenu Québec</p>
              <p className="text-base font-bold text-tenir-700">
                {formatCurrency(payments.filter((p) => p.authority === 'provincial').reduce((s, p) => s + p.amount, 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {payments.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400 border-t border-gray-100 pt-5 mt-2">
          Aucun paiement enregistré pour {year}. Cliquez sur «&nbsp;Enregistrer un paiement&nbsp;» pour commencer.
        </div>
      )}
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
