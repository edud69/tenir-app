'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import {
  Home,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  FileText,
  Upload,
  Eye,
  Calculator,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  CheckCircle,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';
import type { HomeOfficeCalculation, ExpenseType, DocumentType } from '@/types/home-office';
import { EXPENSE_TYPE_LABELS, DOCUMENT_TYPE_LABELS } from '@/types/home-office';

type HomeOffice = Tables<'home_offices'>;
type HomeOfficeExpense = Tables<'home_office_expenses'>;
type HomeOfficeDocument = Tables<'home_office_documents'> & { signed_url?: string | null };

// ─── Utility ─────────────────────────────────────────────────────────────────

function calcRatio(office: number, total: number): number {
  if (total <= 0) return 0;
  return office / total;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-200', className)} />;
}

// ─── HomeOfficeFormModal ──────────────────────────────────────────────────────

interface HomeOfficeFormData {
  label: string;
  office_type: HomeOffice['office_type'];
  tenure_type: HomeOffice['tenure_type'];
  address: string;
  city: string;
  province: string;
  postal_code: string;
  total_area_sqft: string;
  office_area_sqft: string;
  start_date: string;
  months_used_per_year: string;
  notes: string;
}

const defaultFormData: HomeOfficeFormData = {
  label: '',
  office_type: 'registered_office',
  tenure_type: 'tenant',
  address: '',
  city: '',
  province: 'QC',
  postal_code: '',
  total_area_sqft: '',
  office_area_sqft: '',
  start_date: '',
  months_used_per_year: '12',
  notes: '',
};

function HomeOfficeFormModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: HomeOffice | null;
  onClose: () => void;
  onSave: (data: HomeOfficeFormData) => Promise<void>;
}) {
  const t = useTranslations('homeOffice');
  const commonT = useTranslations('common');
  const [form, setForm] = useState<HomeOfficeFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (initial) {
        setForm({
          label: initial.label,
          office_type: initial.office_type,
          tenure_type: initial.tenure_type,
          address: initial.address,
          city: initial.city,
          province: initial.province,
          postal_code: initial.postal_code ?? '',
          total_area_sqft: String(initial.total_area_sqft),
          office_area_sqft: String(initial.office_area_sqft),
          start_date: initial.start_date,
          months_used_per_year: String(initial.months_used_per_year),
          notes: initial.notes ?? '',
        });
      } else {
        setForm(defaultFormData);
      }
    }
  }, [open, initial]);

  const ratio = calcRatio(Number(form.office_area_sqft) || 0, Number(form.total_area_sqft) || 0);
  const highRatio = ratio > 0.4;

  function set(key: keyof HomeOfficeFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const total = Number(form.total_area_sqft);
    const office = Number(form.office_area_sqft);
    if (!form.label.trim()) { setError(t('label') + ' requis'); return; }
    if (total <= 0) { setError(t('totalAreaSqft') + ' doit être > 0'); return; }
    if (office <= 0 || office >= total) { setError(t('officeAreaSqft') + ' doit être < superficie totale'); return; }
    if (!form.start_date) { setError(t('startDate') + ' requis'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('editLocation') : t('addLocation')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label={t('label')}
              value={form.label}
              onChange={(e) => set('label', e.target.value)}
              placeholder="Appartement principal"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de lieu</label>
            <Select
              value={form.office_type}
              onChange={(e) => set('office_type', e.target.value as HomeOffice['office_type'])}
              options={[
                { value: 'registered_office', label: t('officeType.registered_office') },
                { value: 'secondary_establishment', label: t('officeType.secondary_establishment') },
                { value: 'both', label: t('officeType.both') },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenure</label>
            <div className="flex gap-3 mt-2">
              {(['tenant', 'owner'] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tenure_type"
                    value={v}
                    checked={form.tenure_type === v}
                    onChange={() => set('tenure_type', v)}
                    className="accent-tenir-500"
                  />
                  <span className="text-sm text-gray-700">{t(`tenureType.${v}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Input
              label={t('address')}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="123 rue Principale"
              required
            />
          </div>

          <Input
            label={t('city')}
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            placeholder="Montréal"
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <Select
                value={form.province}
                onChange={(e) => set('province', e.target.value)}
                options={[
                  { value: 'QC', label: 'QC' },
                  { value: 'ON', label: 'ON' },
                  { value: 'BC', label: 'BC' },
                  { value: 'AB', label: 'AB' },
                  { value: 'MB', label: 'MB' },
                  { value: 'SK', label: 'SK' },
                  { value: 'NS', label: 'NS' },
                  { value: 'NB', label: 'NB' },
                  { value: 'PE', label: 'PE' },
                  { value: 'NL', label: 'NL' },
                ]}
              />
            </div>
            <Input
              label={t('postalCode')}
              value={form.postal_code}
              onChange={(e) => set('postal_code', e.target.value)}
              placeholder="H1A 1A1"
            />
          </div>

          <div>
            <Input
              label={`${t('totalAreaSqft')} (${t('sqft')})`}
              type="number"
              min="1"
              step="0.01"
              value={form.total_area_sqft}
              onChange={(e) => set('total_area_sqft', e.target.value)}
              placeholder="1200"
              required
            />
          </div>

          <div>
            <Input
              label={`${t('officeAreaSqft')} (${t('sqft')})`}
              type="number"
              min="1"
              step="0.01"
              value={form.office_area_sqft}
              onChange={(e) => set('office_area_sqft', e.target.value)}
              placeholder="120"
              required
            />
            {Number(form.office_area_sqft) > 0 && Number(form.total_area_sqft) > 0 && (
              <p className={cn('mt-1 text-xs font-medium', highRatio ? 'text-amber-600' : 'text-tenir-600')}>
                {t('usageRatio')} : {(ratio * 100).toFixed(1)}%
              </p>
            )}
          </div>

          <Input
            label={t('startDate')}
            type="date"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('monthsPerYear')}</label>
            <Select
              value={form.months_used_per_year}
              onChange={(e) => set('months_used_per_year', e.target.value)}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1),
                label: `${i + 1} mois`,
              }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tenir-500 focus:border-transparent resize-none"
              placeholder="Notes optionnelles…"
            />
          </div>
        </div>

        {highRatio && (
          <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{t('highRatioWarning')}</span>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>{commonT('cancel')}</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
            {commonT('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── HomeOfficeExpenseModal ───────────────────────────────────────────────────

interface ExpenseFormData {
  expense_type: ExpenseType;
  amount: string;
  period_start: string;
  period_end: string;
  description: string;
}

const defaultExpenseForm: ExpenseFormData = {
  expense_type: 'rent',
  amount: '',
  period_start: '',
  period_end: '',
  description: '',
};

function HomeOfficeExpenseModal({
  open,
  homeOfficeId,
  orgId,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  homeOfficeId: string;
  orgId: string;
  initial: HomeOfficeExpense | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const t = useTranslations('homeOffice');
  const commonT = useTranslations('common');
  const supabase = createClient();
  const [form, setForm] = useState<ExpenseFormData>(defaultExpenseForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (initial) {
        setForm({
          expense_type: initial.expense_type,
          amount: String(initial.amount),
          period_start: initial.period_start,
          period_end: initial.period_end,
          description: initial.description ?? '',
        });
      } else {
        setForm(defaultExpenseForm);
      }
    }
  }, [open, initial]);

  function set(key: keyof ExpenseFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = Number(form.amount);
    if (amount <= 0) { setError('Montant doit être > 0'); return; }
    if (!form.period_start || !form.period_end) { setError('Période obligatoire'); return; }
    if (new Date(form.period_end) < new Date(form.period_start)) { setError('Date de fin doit être après la date de début'); return; }
    if (form.expense_type === 'other' && !form.description.trim()) { setError('Description obligatoire pour le type "Autre"'); return; }

    setSaving(true);
    try {
      if (initial) {
        const { error: updateError } = await (supabase as any)
          .from('home_office_expenses')
          .update({
            expense_type: form.expense_type,
            amount,
            period_start: form.period_start,
            period_end: form.period_end,
            description: form.description || null,
          })
          .eq('id', initial.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await (supabase as any)
          .from('home_office_expenses')
          .insert({
            home_office_id: homeOfficeId,
            organization_id: orgId,
            expense_type: form.expense_type,
            amount,
            currency: 'CAD',
            period_start: form.period_start,
            period_end: form.period_end,
            description: form.description || null,
          });
        if (insertError) throw insertError;
      }
      onSave();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('addExpense')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de dépense</label>
          <Select
            value={form.expense_type}
            onChange={(e) => set('expense_type', e.target.value as ExpenseType)}
            options={(Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map((k) => ({
              value: k,
              label: EXPENSE_TYPE_LABELS[k].fr,
            }))}
          />
        </div>

        <Input
          label={commonT('amount') + ' (CAD)'}
          type="number"
          min="0.01"
          step="0.01"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          placeholder="0.00"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Début de période"
            type="date"
            value={form.period_start}
            onChange={(e) => set('period_start', e.target.value)}
            required
          />
          <Input
            label="Fin de période"
            type="date"
            value={form.period_end}
            onChange={(e) => set('period_end', e.target.value)}
            required
          />
        </div>

        {form.expense_type === 'other' && (
          <Input
            label={commonT('description') + ' *'}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Description obligatoire"
            required
          />
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>{commonT('cancel')}</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
            {commonT('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── HomeOfficeDocumentsModal ─────────────────────────────────────────────────

function HomeOfficeDocumentsModal({
  open,
  office,
  orgId,
  userId,
  onClose,
}: {
  open: boolean;
  office: HomeOffice | null;
  orgId: string;
  userId: string;
  onClose: () => void;
}) {
  const t = useTranslations('homeOffice');
  const commonT = useTranslations('common');
  const [docs, setDocs] = useState<HomeOfficeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>('lease_agreement');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    if (!office) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/home-office/documents?homeOfficeId=${office.id}`);
      const data = await res.json() as HomeOfficeDocument[] | { error: string };
      if (!res.ok || 'error' in data) throw new Error('error' in data ? data.error : 'Erreur');
      setDocs(data as HomeOfficeDocument[]);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [office]);

  useEffect(() => {
    if (open && office) loadDocs();
  }, [open, office, loadDocs]);

  async function handleUpload(file: File) {
    if (!office) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('homeOfficeId', office.id);
      fd.append('orgId', orgId);
      fd.append('userId', userId);
      fd.append('documentType', docType);
      const res = await fetch('/api/home-office/documents', { method: 'POST', body: fd });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Upload échoué');
      await loadDocs();
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/home-office/documents?id=${id}`, { method: 'DELETE' });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setDeleteConfirm(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  return (
    <Modal open={open} onClose={onClose} title={t('viewProofs')} size="lg">
      <div className="space-y-4">
        {/* Upload zone */}
        <div>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de document</label>
              <Select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                options={(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((k) => ({
                  value: k,
                  label: DOCUMENT_TYPE_LABELS[k].fr,
                }))}
              />
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-tenir-400 hover:bg-gray-50 transition-colors"
          >
            {uploading ? (
              <Loader2 size={24} className="animate-spin text-tenir-500 mx-auto mb-2" />
            ) : (
              <Upload size={24} className="text-gray-400 mx-auto mb-2" />
            )}
            <p className="text-sm text-gray-600">
              {uploading ? 'Téléversement…' : 'Glisser-déposer ou cliquer pour sélectionner'}
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, HEIC — max 20 MB</p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
          </div>
          {uploadError && (
            <p className="mt-2 text-sm text-red-600">{uploadError}</p>
          )}
        </div>

        {/* Documents list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">{t('noProofs')}</div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <FileText size={18} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                  <p className="text-xs text-gray-500">{DOCUMENT_TYPE_LABELS[doc.document_type]?.fr ?? doc.document_type}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.signed_url && (
                    <a
                      href={doc.signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-tenir-600 hover:bg-white transition-colors"
                    >
                      <Eye size={15} />
                    </a>
                  )}
                  {deleteConfirm === doc.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700"
                      >
                        {commonT('confirm')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(doc.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── HomeOfficeDetailModal ────────────────────────────────────────────────────

function HomeOfficeDetailModal({
  open,
  office,
  calculation,
  onClose,
}: {
  open: boolean;
  office: HomeOffice | null;
  calculation: HomeOfficeCalculation | null;
  onClose: () => void;
}) {
  const t = useTranslations('homeOffice');
  const [copied, setCopied] = useState(false);

  if (!office || !calculation) return null;

  function copyForAccountant() {
    const lines = [
      `=== Siège social / Bureau à domicile ===`,
      `Lieu : ${office!.label}`,
      `Adresse : ${office!.address}, ${office!.city} ${office!.province}`,
      `Superficie totale : ${office!.total_area_sqft} pi²`,
      `Superficie bureau : ${office!.office_area_sqft} pi²`,
      `Ratio d'utilisation : ${(calculation!.usageRatio * 100).toFixed(2)}%`,
      `Mois d'utilisation : ${office!.months_used_per_year}/12`,
      ``,
      `Dépenses admissibles annualisées :`,
      ...calculation!.expenseBreakdown.map(
        (b) => `  - ${b.label} : ${formatCurrency(b.annualAmount)} → déductible : ${formatCurrency(b.deductibleAmount)}`
      ),
      ``,
      `Total dépenses admissibles : ${formatCurrency(calculation!.totalAnnualExpenses)}`,
      `× Ratio superficie (${office!.office_area_sqft} / ${office!.total_area_sqft}) : ${(calculation!.usageRatio * 100).toFixed(2)}%`,
      `× Mois utilisés : ${office!.months_used_per_year}/12`,
      `= Déduction admissible : ${formatCurrency(calculation!.deductibleAmount)}/an`,
      `= Remboursement mensuel recommandé : ${formatCurrency(calculation!.monthlyReimbursement)}/mois`,
      ``,
      `Ligne T2 : Schedule 1, ligne 8520`,
      `Ligne CO-17 : Annexe A, ligne 20`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t('viewDetails')} size="lg">
      <div className="space-y-5">
        {/* Expense table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Type</th>
                <th className="text-right py-2 font-medium text-gray-600">Total annuel</th>
                <th className="text-right py-2 font-medium text-gray-600">Déductible</th>
              </tr>
            </thead>
            <tbody>
              {calculation.expenseBreakdown.map((b) => (
                <tr key={b.expenseType} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{b.label}</td>
                  <td className="py-2 text-right text-gray-700">{formatCurrency(b.annualAmount)}</td>
                  <td className="py-2 text-right font-medium text-tenir-600">{formatCurrency(b.deductibleAmount)}</td>
                </tr>
              ))}
              {calculation.expenseBreakdown.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-400">Aucune dépense enregistrée</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Calculation breakdown */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm space-y-1">
          <div className="flex justify-between text-gray-700">
            <span>Total dépenses admissibles</span>
            <span className="font-medium">{formatCurrency(calculation.totalAnnualExpenses)}</span>
          </div>
          <div className="flex justify-between text-gray-600 pl-4">
            <span>× Ratio superficie ({office.office_area_sqft} / {office.total_area_sqft} pi²)</span>
            <span>{(calculation.usageRatio * 100).toFixed(2)}%</span>
          </div>
          <div className="flex justify-between text-gray-600 pl-4">
            <span>× Mois utilisés ({office.months_used_per_year}/12)</span>
            <span>{((office.months_used_per_year / 12) * 100).toFixed(0)}%</span>
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-semibold text-gray-900">
            <span>Déduction admissible</span>
            <span className="text-tenir-600">{formatCurrency(calculation.deductibleAmount)}/an</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Remboursement mensuel recommandé</span>
            <span className="font-medium">{formatCurrency(calculation.monthlyReimbursement)}/mois</span>
          </div>
        </div>

        {/* How to use */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
          <p className="font-medium">Comment utiliser ce montant :</p>
          <p>La société verse {formatCurrency(calculation.monthlyReimbursement)}/mois à l'actionnaire à titre de loyer. Ce montant est une dépense déductible pour la société (ligne 8520 T2 / ligne 20 CO-17) et un revenu locatif pour l'actionnaire (ligne 126 T1).</p>
          <p className="mt-2 font-medium text-amber-700">{t('subleaseTip')}</p>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={copyForAccountant}>
            {copied ? <CheckCircle size={15} className="mr-2 text-green-500" /> : <Calculator size={15} className="mr-2" />}
            {t('copyForAccountant')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomeOfficePage() {
  const t = useTranslations('homeOffice');
  const commonT = useTranslations('common');
  const supabase = createClient();
  const { orgId, user, loading: orgLoading } = useOrganization();

  const [offices, setOffices] = useState<HomeOffice[]>([]);
  const [calculations, setCalculations] = useState<Record<string, HomeOfficeCalculation>>({});
  const [expenses, setExpenses] = useState<Record<string, HomeOfficeExpense[]>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Modals
  const [formModal, setFormModal] = useState<{ open: boolean; office: HomeOffice | null }>({ open: false, office: null });
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; office: HomeOffice | null; expense: HomeOfficeExpense | null }>({ open: false, office: null, expense: null });
  const [docsModal, setDocsModal] = useState<{ open: boolean; office: HomeOffice | null }>({ open: false, office: null });
  const [detailModal, setDetailModal] = useState<{ open: boolean; office: HomeOffice | null }>({ open: false, office: null });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);

  const loadOffices = useCallback(async () => {
    if (!orgId) return;
    setLoadingData(true);
    setPageError(null);
    try {
      const { data, error } = await (supabase as any)
        .from('home_offices')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOffices(data ?? []);

      // Load calculations for active offices
      const active: HomeOffice[] = (data ?? []).filter((o: HomeOffice) => o.is_active);
      const calcMap: Record<string, HomeOfficeCalculation> = {};
      await Promise.all(
        active.map(async (o: HomeOffice) => {
          try {
            const res = await fetch('/api/home-office/calculate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ homeOfficeId: o.id }),
            });
            if (res.ok) {
              calcMap[o.id] = await res.json() as HomeOfficeCalculation;
            }
          } catch { /* skip */ }
        })
      );
      setCalculations(calcMap);

      // Load expenses per office
      if ((data ?? []).length > 0) {
        const { data: expData } = await (supabase as any)
          .from('home_office_expenses')
          .select('*')
          .in('home_office_id', (data ?? []).map((o: HomeOffice) => o.id))
          .order('period_start', { ascending: false });
        const expMap: Record<string, HomeOfficeExpense[]> = {};
        for (const exp of expData ?? []) {
          expMap[exp.home_office_id] = [...(expMap[exp.home_office_id] ?? []), exp];
        }
        setExpenses(expMap);
      }
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : commonT('error'));
    } finally {
      setLoadingData(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgLoading && orgId) loadOffices();
  }, [orgId, orgLoading, loadOffices]);

  async function handleSaveOffice(formData: HomeOfficeFormData) {
    if (!orgId) throw new Error('Organisation non trouvée');
    const payload = {
      organization_id: orgId,
      label: formData.label,
      office_type: formData.office_type,
      tenure_type: formData.tenure_type,
      address: formData.address,
      city: formData.city,
      province: formData.province,
      postal_code: formData.postal_code || null,
      total_area_sqft: Number(formData.total_area_sqft),
      office_area_sqft: Number(formData.office_area_sqft),
      start_date: formData.start_date,
      months_used_per_year: Number(formData.months_used_per_year),
      notes: formData.notes || null,
      is_active: true,
    };

    if (formModal.office) {
      const { error } = await (supabase as any)
        .from('home_offices')
        .update(payload)
        .eq('id', formModal.office.id);
      if (error) throw error;
    } else {
      const { error } = await (supabase as any)
        .from('home_offices')
        .insert(payload);
      if (error) throw error;
    }
    await loadOffices();
  }

  async function handleDeleteOffice(id: string) {
    const { error } = await (supabase as any)
      .from('home_offices')
      .delete()
      .eq('id', id);
    if (!error) {
      setOffices((prev) => prev.filter((o) => o.id !== id));
      setDeleteConfirm(null);
    }
  }

  async function handleDeleteExpense(id: string, officeId: string) {
    const { error } = await (supabase as any)
      .from('home_office_expenses')
      .delete()
      .eq('id', id);
    if (!error) {
      setExpenses((prev) => ({
        ...prev,
        [officeId]: (prev[officeId] ?? []).filter((e) => e.id !== id),
      }));
      // Recalculate
      try {
        const res = await fetch('/api/home-office/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeOfficeId: officeId }),
        });
        if (res.ok) {
          const calc = await res.json() as HomeOfficeCalculation;
          setCalculations((prev) => ({ ...prev, [officeId]: calc }));
        }
      } catch { /* skip */ }
    }
  }

  // Summary stats
  const totalDeduction = Object.values(calculations).reduce((s, c) => s + c.deductibleAmount, 0);
  const totalMonthly = Object.values(calculations).reduce((s, c) => s + c.monthlyReimbursement, 0);
  const avgRatio = offices.filter((o) => o.is_active).length > 0
    ? offices.filter((o) => o.is_active).reduce((s, o) => s + calcRatio(Number(o.office_area_sqft), Number(o.total_area_sqft)), 0) / offices.filter((o) => o.is_active).length
    : 0;

  if (orgLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
        <Header title={t('title')} />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Header title={t('title')} />

      <div className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
          </div>
          <Button onClick={() => setFormModal({ open: true, office: null })}>
            <Plus size={15} className="mr-2" />
            {t('addLocation')}
          </Button>
        </div>

        {pageError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{pageError}</div>
        )}

        {/* Summary cards */}
        {offices.filter((o) => o.is_active).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('annualDeduction')}</p>
                <p className="text-2xl font-bold text-tenir-600 mt-1">{formatCurrency(totalDeduction)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('monthlyReimbursement')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalMonthly)}<span className="text-sm font-normal text-gray-500">/mois</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t('usageRatio')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{(avgRatio * 100).toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Offices list */}
        {loadingData ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
          </div>
        ) : offices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Home size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">{t('noLocations')}</p>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">{t('noLocationsDesc')}</p>
              <Button className="mt-4" onClick={() => setFormModal({ open: true, office: null })}>
                <Plus size={15} className="mr-2" />
                {t('addLocation')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {offices.map((office) => {
              const calc = calculations[office.id];
              const officeExpenses = expenses[office.id] ?? [];
              const isExpanded = expandedOffice === office.id;

              return (
                <Card key={office.id} className={cn(!office.is_active && 'opacity-60')}>
                  <CardContent className="pt-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-tenir-50 flex items-center justify-center flex-shrink-0">
                          <Home size={18} className="text-tenir-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{office.label}</h3>
                            <Badge variant={office.is_active ? 'default' : 'secondary'}>
                              {office.is_active ? t('active') : t('inactive')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {t(`officeType.${office.office_type}`)} · {office.address}, {office.city}
                          </p>
                          <p className="text-sm text-gray-500">
                            {office.office_area_sqft} / {office.total_area_sqft} {t('sqft')} = {(calcRatio(Number(office.office_area_sqft), Number(office.total_area_sqft)) * 100).toFixed(1)}%
                          </p>
                          {calc && (
                            <div className="flex flex-wrap gap-3 mt-2">
                              <span className="text-sm text-gray-700">
                                <span className="font-medium text-tenir-600">{formatCurrency(calc.deductibleAmount)}</span>
                                <span className="text-gray-400">/an</span>
                              </span>
                              <span className="text-sm text-gray-400">·</span>
                              <span className="text-sm text-gray-700">
                                <span className="font-medium">{formatCurrency(calc.monthlyReimbursement)}</span>
                                <span className="text-gray-400">/mois</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setExpandedOffice(isExpanded ? null : office.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Voir les dépenses"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button
                          onClick={() => setFormModal({ open: true, office })}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title={t('editLocation')}
                        >
                          <Edit2 size={15} />
                        </button>
                        {deleteConfirm === office.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteOffice(office.id)}
                              className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700"
                            >
                              {commonT('confirm')}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded text-gray-400 hover:text-gray-600">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(office.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title={t('deleteLocation')}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailModal({ open: true, office })}
                        disabled={!calc}
                      >
                        <Calculator size={13} className="mr-1.5" />
                        {t('viewDetails')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpenseModal({ open: true, office, expense: null })}
                      >
                        <Plus size={13} className="mr-1.5" />
                        {t('addExpense')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDocsModal({ open: true, office })}
                      >
                        <FileText size={13} className="mr-1.5" />
                        {t('viewProofs')}
                      </Button>
                    </div>

                    {/* Expanded expenses */}
                    {isExpanded && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        {officeExpenses.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-3">Aucune dépense. Cliquez sur &quot;Ajouter une dépense&quot; pour commencer.</p>
                        ) : (
                          <div className="space-y-2">
                            {officeExpenses.map((exp) => (
                              <div key={exp.id} className="flex items-center justify-between gap-2 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-gray-700 font-medium">{EXPENSE_TYPE_LABELS[exp.expense_type]?.fr ?? exp.expense_type}</span>
                                  <span className="text-gray-400 truncate">
                                    {exp.period_start} → {exp.period_end}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="font-medium text-gray-900">{formatCurrency(Number(exp.amount))}</span>
                                  <button
                                    onClick={() => setExpenseModal({ open: true, office, expense: exp })}
                                    className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id, office.id)}
                                    className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Fiscal warning */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{t('fiscalWarning')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <HomeOfficeFormModal
        open={formModal.open}
        initial={formModal.office}
        onClose={() => setFormModal({ open: false, office: null })}
        onSave={handleSaveOffice}
      />

      {expenseModal.office && (
        <HomeOfficeExpenseModal
          open={expenseModal.open}
          homeOfficeId={expenseModal.office.id}
          orgId={orgId ?? ''}
          initial={expenseModal.expense}
          onClose={() => setExpenseModal({ open: false, office: null, expense: null })}
          onSave={loadOffices}
        />
      )}

      {docsModal.office && (
        <HomeOfficeDocumentsModal
          open={docsModal.open}
          office={docsModal.office}
          orgId={orgId ?? ''}
          userId={user?.id ?? ''}
          onClose={() => setDocsModal({ open: false, office: null })}
        />
      )}

      <HomeOfficeDetailModal
        open={detailModal.open}
        office={detailModal.office}
        calculation={detailModal.office ? (calculations[detailModal.office.id] ?? null) : null}
        onClose={() => setDetailModal({ open: false, office: null })}
      />
    </div>
  );
}
