'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  Plus, Trash2, CheckCircle2, Clock, AlertCircle,
  CreditCard, ChevronRight, DollarSign, ArrowUpRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface TaxPaymentFormData {
  authority: 'federal' | 'provincial';
  payment_type: 'installment' | 'balance_owing' | 'arrears';
  quarter: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INSTALLMENT_DATES: Record<number, string> = {
  1: '15 mars', 2: '15 juin', 3: '15 septembre', 4: '15 décembre',
};
const INSTALLMENT_MONTHS: Record<string, number> = {
  mars: 2, juin: 5, septembre: 8, décembre: 11,
};
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  online: 'En ligne', my_account: 'Mon dossier',
  preauthorized: 'Débit préautorisé', cheque: 'Chèque', other: 'Autre',
};
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  installment: 'Acompte provisionnel',
  balance_owing: 'Solde dû',
  arrears: 'Arriérés',
};

// ─── Payment Modal ────────────────────────────────────────────────────────────

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
    payment_date:     new Date().toISOString().split('T')[0],
    payment_method:   'online',
    reference_number: '',
    notes:            '',
  });

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
              { value: 'balance_owing', label: "Solde dû (fin d'année)" },
              { value: 'arrears',       label: 'Arriérés' },
            ]}
          />
        </div>

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
            { value: 'online',        label: 'En ligne (institution financière)' },
            { value: 'my_account',    label: 'Mon dossier ARC / Mon dossier RQ' },
            { value: 'preauthorized', label: 'Débit préautorisé' },
            { value: 'cheque',        label: 'Chèque' },
            { value: 'other',         label: 'Autre' },
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
          <span className="font-semibold">
            {fd.authority === 'federal' ? 'ARC — Fédéral' : 'Revenu Québec — Provincial'}
          </span>{' '}
          · Année fiscale {year}
        </div>
      </div>
    </Modal>
  );
}

// ─── Quarter Row ──────────────────────────────────────────────────────────────

function QuarterRow({ year, auth, q, expected, paidAmount, onPay }: {
  year: number;
  auth: 'federal' | 'provincial';
  q: number;
  expected: number | null;
  paidAmount: number;
  onPay: () => void;
}) {
  const dueDate = `${INSTALLMENT_DATES[q]} ${year}`;
  const isPast = (() => {
    const [day, month] = INSTALLMENT_DATES[q].split(' ');
    return new Date(year, INSTALLMENT_MONTHS[month], parseInt(day)) < new Date();
  })();
  const isFullyPaid = expected != null ? paidAmount >= expected * 0.99 : paidAmount > 0;
  const isPartial   = paidAmount > 0 && !isFullyPaid;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border transition-all',
      isFullyPaid ? 'bg-emerald-50/60 border-emerald-100'
        : isPartial ? 'bg-amber-50/60 border-amber-100'
        : isPast    ? 'bg-red-50/40 border-red-100'
        : 'bg-gray-50 border-gray-100'
    )}>
      <div className="flex-shrink-0">
        {isFullyPaid
          ? <CheckCircle2 size={16} className="text-emerald-500" />
          : isPartial
          ? <Clock size={16} className="text-amber-500" />
          : isPast
          ? <AlertCircle size={16} className="text-red-400" />
          : <Clock size={16} className="text-gray-300" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-700">T{q}</span>
          <span className="text-xs text-gray-400">· {dueDate}</span>
          {isPast && !isFullyPaid && (
            <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">En retard</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {expected != null && (
            <span className="text-xs text-gray-400">Attendu: {formatCurrency(expected)}</span>
          )}
          {paidAmount > 0 && (
            <span className={cn('text-xs font-semibold', isFullyPaid ? 'text-emerald-600' : 'text-amber-600')}>
              Payé: {formatCurrency(paidAmount)}
            </span>
          )}
          {expected != null && paidAmount > 0 && !isFullyPaid && (
            <span className="text-xs text-red-500">
              Solde: {formatCurrency(expected - paidAmount)}
            </span>
          )}
        </div>
      </div>

      {!isFullyPaid && (
        <button
          onClick={onPay}
          className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-tenir-500 text-white hover:bg-tenir-600 font-medium transition-colors"
        >
          {paidAmount > 0 ? 'Compléter' : 'Payer'}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaxPaymentsPage() {
  const locale = useLocale();
  const { orgId, loading: orgLoading } = useOrganization();
  const supabase = createClient();

  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [payments, setPayments] = useState<TaxPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalDefaults, setModalDefaults] = useState<Partial<TaxPayment> | undefined>();
  const [taxProfile, setTaxProfile] = useState<{ federal_tax: number | null; provincial_tax: number | null } | null>(null);

  const yearOptions = ['2026', '2025', '2024', '2023'].map((y) => ({ value: y, label: y }));

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [paymentsRes, profileRes] = await Promise.all([
      (supabase as any)
        .from('tax_payments')
        .select('*')
        .eq('organization_id', orgId)
        .eq('tax_year', parseInt(selectedYear))
        .order('payment_date', { ascending: false }),
      (supabase as any)
        .from('tax_profiles')
        .select('federal_tax, provincial_tax')
        .eq('organization_id', orgId)
        .eq('tax_year', parseInt(selectedYear))
        .single(),
    ]);
    setPayments(paymentsRes.data || []);
    setTaxProfile(profileRes.data || null);
    setLoading(false);
  }, [orgId, selectedYear]);

  useEffect(() => { if (orgId) fetchData(); }, [fetchData, orgId]);

  async function handleAddPayment(fd: TaxPaymentFormData) {
    if (!orgId) return;
    const { data, error } = await (supabase as any)
      .from('tax_payments')
      .insert({
        organization_id: orgId,
        tax_year:        parseInt(selectedYear),
        authority:       fd.authority,
        payment_type:    fd.payment_type,
        quarter:         fd.payment_type === 'installment' && fd.quarter ? parseInt(fd.quarter) : null,
        amount:          parseFloat(fd.amount),
        due_amount:      null,
        payment_date:    fd.payment_date,
        payment_method:  fd.payment_method,
        reference_number: fd.reference_number || null,
        notes:           fd.notes || null,
      })
      .select()
      .single();
    if (!error && data) setPayments((p) => [data, ...p]);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce paiement ?')) return;
    await (supabase as any).from('tax_payments').delete().eq('id', id);
    setPayments((p) => p.filter((x) => x.id !== id));
  }

  function openModal(auth?: 'federal' | 'provincial', q?: number, expected?: number | null) {
    setModalDefaults(auth ? {
      authority: auth,
      payment_type: 'installment',
      quarter: q,
      due_amount: expected ?? undefined,
    } as any : undefined);
    setShowModal(true);
  }

  // Derived
  const federalQ  = taxProfile?.federal_tax   != null ? taxProfile.federal_tax   / 4 : null;
  const provQ     = taxProfile?.provincial_tax != null ? taxProfile.provincial_tax / 4 : null;

  function paidForQ(auth: 'federal' | 'provincial', q: number) {
    return payments
      .filter((p) => p.authority === auth && p.payment_type === 'installment' && p.quarter === q)
      .reduce((s, p) => s + p.amount, 0);
  }

  const totalFederal   = payments.filter((p) => p.authority === 'federal').reduce((s, p) => s + p.amount, 0);
  const totalProvincial = payments.filter((p) => p.authority === 'provincial').reduce((s, p) => s + p.amount, 0);
  const totalPaid = totalFederal + totalProvincial;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Paiements d'impôts" />

      <div className="flex-1 overflow-y-auto bg-gray-50/40">
        <div className="p-6 lg:p-8 max-w-5xl mx-auto">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-36">
                <Select
                  label="Année fiscale"
                  options={yearOptions}
                  value={selectedYear}
                  onChange={(v) => setSelectedYear(v as string)}
                />
              </div>
              <Link
                href={`/${locale}/taxes`}
                className="flex items-center gap-1 text-sm text-tenir-600 hover:text-tenir-700 font-medium mt-5"
              >
                Voir le profil fiscal <ChevronRight size={14} />
              </Link>
            </div>
            <div className="mt-5">
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => openModal()}>
                Enregistrer un paiement
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <DollarSign size={15} className="text-blue-500" />
                </div>
                <span className="text-sm text-gray-500">Total payé — ARC</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFederal)}</p>
              {taxProfile?.federal_tax != null && (
                <p className="text-xs text-gray-400 mt-1">
                  sur {formatCurrency(taxProfile.federal_tax)} estimé
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-tenir-50 flex items-center justify-center">
                  <DollarSign size={15} className="text-tenir-500" />
                </div>
                <span className="text-sm text-gray-500">Total payé — Rev. Qc</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalProvincial)}</p>
              {taxProfile?.provincial_tax != null && (
                <p className="text-xs text-gray-400 mt-1">
                  sur {formatCurrency(taxProfile.provincial_tax)} estimé
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <ArrowUpRight size={15} className="text-gray-500" />
                </div>
                <span className="text-sm text-gray-500">Total combiné</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-gray-400 mt-1">{payments.length} paiement{payments.length !== 1 ? 's' : ''} enregistré{payments.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Two-column installment grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Federal */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">ARC — Fédéral</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {taxProfile?.federal_tax != null
                      ? `Estimé: ${formatCurrency(taxProfile.federal_tax)} · ${formatCurrency(federalQ!)} / trimestre`
                      : 'Aucun profil fiscal calculé pour cette année'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((q) => (
                  <QuarterRow
                    key={q} year={parseInt(selectedYear)}
                    auth="federal" q={q}
                    expected={federalQ}
                    paidAmount={paidForQ('federal', q)}
                    onPay={() => openModal('federal', q, federalQ)}
                  />
                ))}
              </div>
              {/* Non-installment federal */}
              {payments.filter((p) => p.authority === 'federal' && p.payment_type !== 'installment').map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 mt-2 rounded-xl bg-blue-50/50 border border-blue-100">
                  <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">{PAYMENT_TYPE_LABELS[p.payment_type]}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.payment_date)}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>

            {/* Provincial */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Revenu Québec — Provincial</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {taxProfile?.provincial_tax != null
                      ? `Estimé: ${formatCurrency(taxProfile.provincial_tax)} · ${formatCurrency(provQ!)} / trimestre`
                      : 'Aucun profil fiscal calculé pour cette année'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((q) => (
                  <QuarterRow
                    key={q} year={parseInt(selectedYear)}
                    auth="provincial" q={q}
                    expected={provQ}
                    paidAmount={paidForQ('provincial', q)}
                    onPay={() => openModal('provincial', q, provQ)}
                  />
                ))}
              </div>
              {payments.filter((p) => p.authority === 'provincial' && p.payment_type !== 'installment').map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 mt-2 rounded-xl bg-tenir-50/50 border border-tenir-100">
                  <CheckCircle2 size={14} className="text-tenir-500 flex-shrink-0" />
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
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Historique des paiements</h3>

            {payments.length === 0 ? (
              <div className="text-center py-10">
                <CreditCard size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Aucun paiement enregistré pour {selectedYear}.</p>
                <button
                  onClick={() => openModal()}
                  className="mt-3 text-sm text-tenir-600 hover:text-tenir-700 font-medium"
                >
                  Enregistrer le premier paiement →
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">Date</th>
                        <th className="text-left text-xs font-semibold text-gray-400 pb-3 px-4">Autorité</th>
                        <th className="text-left text-xs font-semibold text-gray-400 pb-3 px-4">Type</th>
                        <th className="text-left text-xs font-semibold text-gray-400 pb-3 px-4">Mode</th>
                        <th className="text-left text-xs font-semibold text-gray-400 pb-3 px-4">Référence</th>
                        <th className="text-right text-xs font-semibold text-gray-400 pb-3 pl-4">Montant</th>
                        <th className="pb-3 pl-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 group transition-colors">
                          <td className="py-3 pr-4 text-gray-600 text-xs">{formatDate(p.payment_date)}</td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full',
                              p.authority === 'federal'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-tenir-50 text-tenir-600'
                            )}>
                              {p.authority === 'federal' ? 'ARC' : 'Rev. QC'}
                              {p.payment_type === 'installment' && p.quarter ? ` T${p.quarter}` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">{PAYMENT_TYPE_LABELS[p.payment_type]}</td>
                          <td className="py-3 px-4 text-xs text-gray-400">{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
                          <td className="py-3 px-4 text-xs text-gray-400 font-mono">
                            {p.reference_number ? `#${p.reference_number}` : '—'}
                          </td>
                          <td className="py-3 pl-4 text-right font-bold text-gray-900">{formatCurrency(p.amount)}</td>
                          <td className="py-3 pl-2">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td colSpan={5} className="pt-3 text-xs font-semibold text-gray-500">Total</td>
                        <td className="pt-3 text-right font-bold text-gray-900">{formatCurrency(totalPaid)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {showModal && (
        <TaxPaymentModal
          year={parseInt(selectedYear)}
          defaults={modalDefaults}
          onClose={() => { setShowModal(false); setModalDefaults(undefined); }}
          onSubmit={handleAddPayment}
        />
      )}
    </div>
  );
}
