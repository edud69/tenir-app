'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownLeft, Paperclip, Upload, Link2, Unlink, FileText, ImageOff, Loader2, CheckCircle, X, ExternalLink } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { createClient } from '@/lib/supabase/client';

type TransactionType = 'expense' | 'income' | 'dividend' | 'capital_gain' | 'interest';

// ─── OCR helpers ──────────────────────────────────────────────────────────────

function normalizeOcrCategory(raw: string | null): string {
  if (!raw) return 'other';
  const s = raw.toLowerCase();
  if (s.includes('office') || s.includes('stationery')) return 'office';
  if (s.includes('meal') || s.includes('food') || s.includes('restaurant') || s.includes('entertain')) return 'meals';
  if (s.includes('travel') || s.includes('transport') || s.includes('hotel') || s.includes('fuel') || s.includes('parking')) return 'travel';
  if (s.includes('professional') || s.includes('consult')) return 'professional';
  if (s.includes('insurance')) return 'insurance';
  if (s.includes('tech') || s.includes('software') || s.includes('hardware') || s.includes('computer')) return 'technology';
  if (s.includes('bank')) return 'bank';
  if (s.includes('legal')) return 'legal';
  if (s.includes('account')) return 'accounting';
  if (s.includes('suppli')) return 'supplies';
  return 'other';
}

// ─── Receipt modal for linking/uploading ─────────────────────────────────────

interface ReceiptRecord {
  id: string;
  file_path: string | null;
  file_name: string | null;
  vendor: string | null;
  amount: number | null;
  date: string | null;
  category: string | null;
  gst_amount: number | null;
  qst_amount: number | null;
  transaction_id: string | null;
}

function SignedImage({ filePath, fileName }: { filePath: string | null; fileName: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const isPdf = (fileName || filePath || '').toLowerCase().endsWith('.pdf');

  useEffect(() => {
    if (!filePath) return;
    fetch(`/api/receipts/signed-url?path=${encodeURIComponent(filePath)}`)
      .then((r) => r.json())
      .then(({ url: u }) => u && setUrl(u))
      .catch(() => setErr(true));
  }, [filePath]);

  if (isPdf) return <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><FileText size={16} className="text-gray-400" /></div>;
  if (err || !url) return <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><ImageOff size={14} className="text-gray-300" /></div>;
  return <img src={url} alt={fileName || ''} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" onError={() => setErr(true)} />;
}

function ReceiptImagePreview({ filePath, fileName }: { filePath: string | null; fileName: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const isPdf = (fileName || filePath || '').toLowerCase().endsWith('.pdf');

  useEffect(() => {
    if (!filePath) { setLoading(false); return; }
    fetch(`/api/receipts/signed-url?path=${encodeURIComponent(filePath)}`)
      .then((r) => r.json())
      .then(({ url: u }) => { setUrl(u ?? null); setLoading(false); })
      .catch(() => { setErr(true); setLoading(false); });
  }, [filePath]);

  if (isPdf) return (
    <div className="w-full h-36 bg-gray-50 border border-gray-100 rounded-xl flex flex-col items-center justify-center gap-2">
      <FileText size={28} className="text-gray-300" />
      <span className="text-xs text-gray-400">Document PDF</span>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-tenir-600 hover:underline flex items-center gap-1"><ExternalLink size={10} /> Ouvrir</a>}
    </div>
  );
  if (loading) return <div className="w-full h-36 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center"><Loader2 size={18} className="animate-spin text-gray-300" /></div>;
  if (err || !url) return (
    <div className="w-full h-36 bg-gray-50 border border-gray-100 rounded-xl flex flex-col items-center justify-center gap-2">
      <ImageOff size={20} className="text-gray-300" />
      <span className="text-xs text-gray-400">Aperçu non disponible</span>
    </div>
  );
  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-100">
      <img src={url} alt={fileName || 'Reçu'} className="w-full max-h-52 object-contain bg-gray-50" onError={() => setErr(true)} />
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="absolute bottom-2 right-2 flex items-center gap-1 text-xs bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-tenir-600 hover:text-tenir-700 font-medium shadow-sm border border-gray-100">
        <ExternalLink size={10} /> Plein écran
      </a>
    </div>
  );
}

type ReceiptTab = 'link' | 'upload';
type UploadPhase = 'idle' | 'uploading' | 'scanning' | 'saving' | 'done' | 'error';

function TransactionReceiptModal({
  tx,
  orgId,
  userId,
  onClose,
  onLinked,
}: {
  tx: Transaction;
  orgId: string;
  userId: string;
  onClose: () => void;
  onLinked: (txId: string, receiptId: string | null, updates?: Partial<Transaction>) => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ReceiptTab>(tx.receipt_id ? 'link' : 'link');
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [doneLabel, setDoneLabel] = useState('');

  // Load unlinked receipts
  useEffect(() => {
    async function load() {
      setLoadingReceipts(true);
      const { data } = await (supabase as any)
        .from('receipts')
        .select('id,file_path,file_name,vendor,amount,date,category,transaction_id')
        .eq('organization_id', orgId)
        .is('transaction_id', null)
        .order('created_at', { ascending: false });
      setReceipts(data || []);
      setLoadingReceipts(false);
    }
    if (tab === 'link') load();
  }, [tab, orgId]);

  async function handleLink(receipt: ReceiptRecord) {
    // If tx already had a receipt, unlink it first
    if (tx.receipt_id) {
      await (supabase as any).from('receipts').update({ transaction_id: null }).eq('id', tx.receipt_id);
    }
    await (supabase as any).from('receipts').update({ transaction_id: tx.id }).eq('id', receipt.id);
    await (supabase as any).from('transactions').update({ receipt_id: receipt.id }).eq('id', tx.id);
    onLinked(tx.id, receipt.id);
    onClose();
  }

  async function handleUnlink() {
    if (!tx.receipt_id) return;
    await (supabase as any).from('receipts').update({ transaction_id: null }).eq('id', tx.receipt_id);
    await (supabase as any).from('transactions').update({ receipt_id: null }).eq('id', tx.id);
    onLinked(tx.id, null);
    onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    try {
      // 1. Upload to storage
      setPhase('uploading');
      const uploadForm = new FormData();
      uploadForm.append('file', file);
      uploadForm.append('orgId', orgId);
      uploadForm.append('userId', userId);
      const uploadRes = await fetch('/api/receipts/upload', { method: 'POST', body: uploadForm });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { path: filePath } = await uploadRes.json();

      // 2. OCR scan
      setPhase('scanning');
      const ocrForm = new FormData();
      ocrForm.append('file', file);
      const ocrRes = await fetch('/api/receipts/ocr', { method: 'POST', body: ocrForm });
      const ocr = ocrRes.ok ? await ocrRes.json() : {};

      const vendor = ocr.vendorName || null;
      const amount = typeof ocr.totalAmount === 'number' ? ocr.totalAmount : null;
      const date = ocr.date || null;
      const category = normalizeOcrCategory(ocr.category);

      // 3. Create receipt record
      setPhase('saving');
      const { data: receiptRow, error: receiptErr } = await (supabase as any)
        .from('receipts')
        .insert({
          organization_id: orgId,
          uploaded_by: userId,
          file_path: filePath,
          file_name: file.name,
          vendor,
          amount,
          date,
          gst_amount: ocr.gst || null,
          qst_amount: ocr.qst || null,
          category,
          status: 'verified',
          ocr_data: ocr,
          transaction_id: tx.id,
          currency: 'CAD',
        })
        .select()
        .single();
      if (receiptErr) throw new Error(receiptErr.message);

      // 4. Update transaction with OCR data
      const txUpdates: Record<string, any> = { receipt_id: receiptRow.id };
      if (vendor && !tx.vendor) txUpdates.vendor = vendor;
      if (amount !== null && tx.amount === 0) txUpdates.amount = -Math.abs(amount);
      if (date && !tx.date) txUpdates.date = date;
      if (category) txUpdates.category = category;
      await (supabase as any).from('transactions').update(txUpdates).eq('id', tx.id);

      const summary = [
        vendor && `Vendor: ${vendor}`,
        amount && `Amount: $${amount.toFixed(2)}`,
        category && `Category: ${category}`,
      ].filter(Boolean).join(' · ');
      setDoneLabel(summary || 'Receipt linked successfully');
      setPhase('done');

      onLinked(tx.id, receiptRow.id, {
        receipt_id: receiptRow.id,
        ...(txUpdates.vendor ? { vendor: txUpdates.vendor } : {}),
        ...(txUpdates.amount !== undefined ? { amount: txUpdates.amount } : {}),
        ...(txUpdates.category ? { category: txUpdates.category } : {}),
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
      setPhase('error');
    }
  }

  const busy = phase === 'uploading' || phase === 'scanning' || phase === 'saving';
  const phaseLabel: Record<UploadPhase, string> = {
    idle: '', uploading: 'Uploading…', scanning: 'Scanning with AI…',
    saving: 'Saving receipt…', done: '', error: '',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Receipt</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{tx.description}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(['link', 'upload'] as ReceiptTab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPhase('idle'); setErrorMsg(''); }}
              className={cn('py-3 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors', tab === t ? 'border-tenir-500 text-tenir-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t === 'link' ? 'Link existing' : 'Upload new'}
            </button>
          ))}
        </div>

        <div className="p-6 max-h-[420px] overflow-y-auto">
          {/* ── Link tab ── */}
          {tab === 'link' && (
            <div>
              {tx.receipt_id && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-emerald-700 font-medium flex items-center gap-2">
                    <CheckCircle size={14} /> Receipt already linked
                  </span>
                  <button onClick={handleUnlink} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium">
                    <Unlink size={11} /> Unlink
                  </button>
                </div>
              )}
              {loadingReceipts ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <Loader2 size={18} className="animate-spin mr-2" /> Loading receipts…
                </div>
              ) : receipts.length === 0 ? (
                <div className="text-center py-10">
                  <FileText size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No unlinked receipts available.</p>
                  <p className="text-xs text-gray-400 mt-1">Upload a new receipt or add one from the Receipts page.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {receipts.map((r) => (
                    <button key={r.id} onClick={() => handleLink(r)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-tenir-200 hover:bg-tenir-50/30 transition-all text-left group">
                      <SignedImage filePath={r.file_path} fileName={r.file_name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.vendor || <span className="text-gray-400 font-normal italic">Unknown vendor</span>}</p>
                        <p className="text-xs text-gray-400">{r.date ? formatDate(r.date) : '—'} {r.category && `· ${r.category}`}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {r.amount != null && <p className="text-sm font-bold text-gray-900">{formatCurrency(r.amount)}</p>}
                        <span className="text-xs text-tenir-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Link →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Upload tab ── */}
          {tab === 'upload' && (
            <div>
              {phase === 'idle' || phase === 'error' ? (
                <div>
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-tenir-300 hover:bg-tenir-50/20 rounded-2xl py-10 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-tenir-100 flex items-center justify-center transition-colors">
                      <Upload size={20} className="text-gray-400 group-hover:text-tenir-500 transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">Drop a receipt or click to browse</p>
                      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or PDF — AI will extract all details</p>
                    </div>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                  {phase === 'error' && (
                    <p className="mt-3 text-sm text-red-600 text-center">{errorMsg}</p>
                  )}
                </div>
              ) : phase === 'done' ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle size={22} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Receipt linked!</p>
                  <p className="text-xs text-gray-500 text-center max-w-xs">{doneLabel}</p>
                  <button onClick={onClose} className="mt-2 text-sm font-medium text-tenir-600 hover:text-tenir-700">Close</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 size={28} className="text-tenir-500 animate-spin" />
                  <p className="text-sm text-gray-600">{phaseLabel[phase]}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  amount: number;
  vendor?: string;
  is_recurring: boolean;
  recurrence_frequency?: string;
  organization_id?: string;
  created_by?: string;
  receipt_id?: string | null;
}


interface ModalFormData {
  type: TransactionType;
  category: string;
  date: string;
  description: string;
  amount: number;
  vendor: string;
  is_recurring: boolean;
  recurrence_frequency: string;
}

function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ModalFormData) => void;
  initialData?: Transaction;
}) {
  const t = useTranslations('expenses');
  const commonT = useTranslations('common');

  const typeOptions = [
    { value: 'expense', label: t('expense') },
    { value: 'income', label: t('income') },
    { value: 'dividend', label: t('dividend') },
    { value: 'capital_gain', label: t('capitalGain') },
    { value: 'interest', label: t('interest') },
  ];

  const categoryOptions = [
    { value: 'office', label: t('categories.office') },
    { value: 'professional', label: t('categories.professional') },
    { value: 'insurance', label: t('categories.insurance') },
    { value: 'travel', label: t('categories.travel') },
    { value: 'meals', label: t('categories.meals') },
    { value: 'supplies', label: t('categories.supplies') },
    { value: 'technology', label: t('categories.technology') },
    { value: 'bank', label: t('categories.bank') },
    { value: 'legal', label: t('categories.legal') },
    { value: 'accounting', label: t('categories.accounting') },
    { value: 'dividend', label: t('dividend') },
    { value: 'capital_gain', label: t('capitalGain') },
    { value: 'interest', label: t('interest') },
    { value: 'other', label: t('categories.other') },
  ];
  const [formData, setFormData] = useState<ModalFormData>(
    initialData
      ? {
          type: initialData.type,
          category: initialData.category,
          date: initialData.date,
          description: initialData.description,
          amount: initialData.amount,
          vendor: initialData.vendor || '',
          is_recurring: initialData.is_recurring,
          recurrence_frequency: initialData.recurrence_frequency || '',
        }
      : {
          type: 'expense',
          category: 'office',
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: 0,
          vendor: '',
          is_recurring: false,
          recurrence_frequency: '',
        }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t('editTransaction') : t('addTransaction')}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>
            {commonT('cancel')}
          </Button>
          <Button variant="primary" fullWidth onClick={handleSubmit}>
            {commonT('save')}
          </Button>
        </div>
      }
    >
      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('type')}
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as TransactionType })}
            options={typeOptions}
          />
          <Input
            label={commonT('date')}
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <Input
          label={commonT('description')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={commonT('category')}
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value as string })}
            options={categoryOptions}
            required
          />
          <Input
            label={commonT('amount')}
            type="number"
            step="0.01"
            value={Math.abs(formData.amount)}
            onChange={(e) =>
              setFormData({
                ...formData,
                amount:
                  formData.type === 'income' ||
                  formData.type === 'dividend' ||
                  formData.type === 'capital_gain' ||
                  formData.type === 'interest'
                    ? parseFloat(e.target.value)
                    : -parseFloat(e.target.value),
              })
            }
            required
          />
        </div>

        <Input
          label={t('vendorPayer')}
          value={formData.vendor}
          onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
        />

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="recurring"
            checked={formData.is_recurring}
            onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
            className="w-4 h-4 text-tenir-600 rounded"
          />
          <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
            {t('recurring')}
          </label>
        </div>

        {formData.is_recurring && (
          <Select
            label={t('frequency')}
            value={formData.recurrence_frequency}
            onChange={(value) => setFormData({ ...formData, recurrence_frequency: value as string })}
            options={[
              { value: 'monthly', label: t('monthly') },
              { value: 'quarterly', label: t('quarterly') },
              { value: 'annually', label: t('annually') },
            ]}
          />
        )}
      </form>
    </Modal>
  );
}

// ─── Transaction Detail Modal ─────────────────────────────────────────────────

function TransactionDetailModal({
  tx, onClose, onEdit, onDelete, onReceipt, categoryOptions,
}: {
  tx: Transaction;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onReceipt: (tx: Transaction) => void;
  categoryOptions: { value: string; label: string }[];
}) {
  const supabase = createClient();
  const [linkedReceipt, setLinkedReceipt] = useState<ReceiptRecord | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(!!tx.receipt_id);

  useEffect(() => {
    if (!tx.receipt_id) { setLinkedReceipt(null); setReceiptLoading(false); return; }
    setReceiptLoading(true);
    let query = (supabase as any)
      .from('receipts')
      .select('*')
      .eq('id', tx.receipt_id);
    if (tx.organization_id) query = query.eq('organization_id', tx.organization_id);
    query
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (error) console.error('[receipt fetch]', error);
        setLinkedReceipt(data ?? null);
        setReceiptLoading(false);
      })
      .catch((err: any) => { console.error('[receipt fetch catch]', err); setLinkedReceipt(null); setReceiptLoading(false); });
  }, [tx.receipt_id]);

  const catLabel = categoryOptions.find((c) => c.value === tx.category)?.label || tx.category;
  const typeColors: Record<string, string> = {
    expense: 'text-red-600 bg-red-50',
    income: 'text-emerald-600 bg-emerald-50',
    dividend: 'text-blue-600 bg-blue-50',
    capital_gain: 'text-purple-600 bg-purple-50',
    interest: 'text-sky-600 bg-sky-50',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900 truncate">{tx.description}</p>
            {tx.vendor && <p className="text-xs text-gray-400 mt-0.5">{tx.vendor}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 ml-3 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* Amount hero */}
        <div className="px-6 py-5 text-center border-b border-gray-50">
          <p className={cn('text-3xl font-bold', tx.amount < 0 ? 'text-red-600' : 'text-emerald-600')}>
            {tx.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(tx.amount))}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', typeColors[tx.type] || 'text-gray-600 bg-gray-100')}>
              {tx.type === 'capital_gain' ? 'Capital gain' : tx.type}
            </span>
            {tx.receipt_id && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-tenir-50 text-tenir-600">
                <Paperclip size={10} /> Receipt
              </span>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(tx.date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Category</p>
            <p className="text-sm font-medium text-gray-900">{catLabel || '—'}</p>
          </div>
          {tx.vendor && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Vendor</p>
              <p className="text-sm font-medium text-gray-900">{tx.vendor}</p>
            </div>
          )}
          {tx.is_recurring && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Recurring</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{tx.recurrence_frequency || 'Yes'}</p>
            </div>
          )}
        </div>

        {/* Receipt section */}
        {tx.receipt_id && (
          <div className="border-t border-gray-100">
            <div className="px-6 pt-4 pb-1 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Reçu</p>
              <button
                onClick={() => onReceipt(tx)}
                className="text-xs text-tenir-600 hover:text-tenir-700 font-medium flex items-center gap-1"
              >
                <Edit2 size={11} /> Gérer
              </button>
            </div>
            {receiptLoading ? (
              <div className="px-6 pb-5 flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Chargement…
              </div>
            ) : linkedReceipt ? (
              <div className="px-6 pb-5 space-y-3">
                <ReceiptImagePreview filePath={linkedReceipt.file_path} fileName={linkedReceipt.file_name} />
                <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                  {linkedReceipt.vendor && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Fournisseur</p>
                      <p className="text-sm font-semibold text-gray-900">{linkedReceipt.vendor}</p>
                    </div>
                  )}
                  {linkedReceipt.amount != null && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Montant</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(linkedReceipt.amount)}</p>
                    </div>
                  )}
                  {linkedReceipt.date && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Date</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(linkedReceipt.date)}</p>
                    </div>
                  )}
                  {linkedReceipt.gst_amount != null && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">TPS</p>
                      <p className="text-sm font-medium text-gray-700">{formatCurrency(linkedReceipt.gst_amount)}</p>
                    </div>
                  )}
                  {linkedReceipt.qst_amount != null && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">TVQ</p>
                      <p className="text-sm font-medium text-gray-700">{formatCurrency(linkedReceipt.qst_amount)}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-6 pb-5 text-sm text-gray-400">Reçu introuvable.</div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-2 border-t border-gray-50 pt-4">
          {!tx.receipt_id && (
            <button
              onClick={() => onReceipt(tx)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-1 justify-center bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              <Paperclip size={14} /> Attacher un reçu
            </button>
          )}
          <button
            onClick={() => onEdit(tx)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex-1 justify-center"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button
            onClick={() => onDelete(tx.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  isNegative,
  subtitle,
}: {
  title: string;
  value: number;
  isNegative?: boolean;
  subtitle?: string;
}) {
  return (
    <Card padding="md" shadow="sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p
            className={cn(
              'text-2xl font-bold',
              isNegative ? 'text-red-600' : 'text-green-600'
            )}
          >
            {formatCurrency(value)}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
        </div>
        <div
          className={cn(
            'p-3 rounded-lg',
            isNegative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
          )}
        >
          {isNegative ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
        </div>
      </div>
    </Card>
  );
}

export default function ExpensesPage() {
  const t = useTranslations('expenses');
  const commonT = useTranslations('common');
  const supabase = createClient();
  const { orgId, user, loading: orgLoading } = useOrganization();

  const typeOptions = [
    { value: 'expense', label: t('expense') },
    { value: 'income', label: t('income') },
    { value: 'dividend', label: t('dividend') },
    { value: 'capital_gain', label: t('capitalGain') },
    { value: 'interest', label: t('interest') },
  ];

  const categoryOptions = [
    { value: 'office', label: t('categories.office') },
    { value: 'professional', label: t('categories.professional') },
    { value: 'insurance', label: t('categories.insurance') },
    { value: 'travel', label: t('categories.travel') },
    { value: 'meals', label: t('categories.meals') },
    { value: 'supplies', label: t('categories.supplies') },
    { value: 'technology', label: t('categories.technology') },
    { value: 'bank', label: t('categories.bank') },
    { value: 'legal', label: t('categories.legal') },
    { value: 'accounting', label: t('categories.accounting') },
    { value: 'dividend', label: t('dividend') },
    { value: 'capital_gain', label: t('capitalGain') },
    { value: 'interest', label: t('interest') },
    { value: 'other', label: t('categories.other') },
  ];
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [viewTx, setViewTx] = useState<Transaction | null>(null);
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Sync searchQuery when the URL param changes (e.g. navigating from header search)
  useEffect(() => {
    const paramValue = searchParams.get('search') ?? '';
    setSearchQuery(paramValue);
  }, [searchParams]);

  useEffect(() => {
    if (!orgId) return;
    async function fetchTransactions() {
      setTxLoading(true);
      setTxError(null);
      try {
        const { data, error } = await (supabase as any)
          .from('transactions')
          .select('*')
          .eq('organization_id', orgId)
          .order('date', { ascending: false });
        if (error) throw error;
        setTransactions(data || []);
      } catch (e: any) {
        setTxError(e.message);
      } finally {
        setTxLoading(false);
      }
    }
    fetchTransactions();
  }, [orgId]);

  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
    if (dateRange.start && tx.date < dateRange.start) return false;
    if (dateRange.end && tx.date > dateRange.end) return false;
    return true;
  });

  // Calculate summaries
  const totalExpenses = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalIncome = transactions
    .filter((tx) => ['income', 'dividend', 'capital_gain', 'interest'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netIncome = totalIncome - totalExpenses;

  // Tax deductible (all expenses + professional income, excluding dividends/capital gains)
  const taxDeductible = totalExpenses +
    transactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

  // Category breakdown
  const categoryBreakdown = categoryOptions.map((cat) => {
    const amount = transactions
      .filter((tx) => tx.category === cat.value)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return { ...cat, amount };
  }).filter((cat) => cat.amount > 0);

  const handleAddTransaction = async (data: ModalFormData) => {
    if (!orgId || !user) return;
    try {
      const insertData = {
        organization_id: orgId,
        type: data.type,
        category: data.category,
        date: data.date,
        description: data.description,
        amount: data.amount,
        vendor: data.vendor || null,
        is_recurring: data.is_recurring,
        recurrence_frequency: data.recurrence_frequency || null,
        currency: 'CAD',
        created_by: user.id,
      };
      const { data: newTx, error } = await (supabase as any)
        .from('transactions')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      setTransactions([newTx, ...transactions]);
    } catch (e: any) {
      setTxError(e.message);
    }
  };

  const handleEditTransaction = async (data: ModalFormData) => {
    if (!editTx) return;
    try {
      const { data: updated, error } = await (supabase as any)
        .from('transactions')
        .update({
          type: data.type,
          category: data.category,
          date: data.date,
          description: data.description,
          amount: data.amount,
          vendor: data.vendor || null,
          is_recurring: data.is_recurring,
          recurrence_frequency: data.recurrence_frequency || null,
        })
        .eq('id', editTx.id)
        .select()
        .single();
      if (error) throw error;
      setTransactions((prev) => prev.map((tx) => tx.id === editTx.id ? updated : tx));
      // update viewTx if it's open on the same record
      if (viewTx?.id === editTx.id) setViewTx(updated);
    } catch (e: any) {
      setTxError(e.message);
    }
  };

  const handleReceiptLinked = (txId: string, receiptId: string | null, updates?: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((tx) => tx.id === txId ? { ...tx, receipt_id: receiptId, ...updates } : tx)
    );
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter((tx) => tx.id !== id));
    } catch (e: any) {
      setTxError(e.message);
    }
  };

  const isLoading = orgLoading || txLoading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {txError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {txError}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCard
              title={t('totalExpenses')}
              value={totalExpenses}
              isNegative
              subtitle={t('deductibleCosts')}
            />
            <SummaryCard
              title={t('totalIncome')}
              value={totalIncome}
              subtitle={t('allRevenueSources')}
            />
            <SummaryCard
              title={t('netIncome')}
              value={netIncome}
              isNegative={netIncome < 0}
              subtitle={t('incomeMinus')}
            />
            <SummaryCard
              title={t('taxDeductible')}
              value={taxDeductible}
              isNegative
              subtitle={t('forTaxFiling')}
            />
          </div>

          {/* Filters */}
          <Card padding="md" shadow="sm" className="mb-8">
            <CardHeader>
              <CardTitle level="h3">{t('filters')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select
                  label={t('type')}
                  value={typeFilter}
                  onChange={(value) => setTypeFilter(value as string)}
                  options={[{ value: 'all', label: t('allTypes') }, ...typeOptions]}
                />
                <Select
                  label={commonT('category')}
                  value={categoryFilter}
                  onChange={(value) => setCategoryFilter(value as string)}
                  options={[{ value: 'all', label: t('allCategories') }, ...categoryOptions]}
                />
                <Input
                  label={t('startDate')}
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
                <Input
                  label={t('endDate')}
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    fullWidth
                    size="md"
                    onClick={() => {
                      setTypeFilter('all');
                      setCategoryFilter('all');
                      setDateRange({ start: '', end: '' });
                    }}
                  >
                    {t('clearFilters')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Transaction Button */}
          <div className="mb-8">
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setIsModalOpen(true)}
              disabled={!orgId}
            >
              {t('addTransaction')}
            </Button>
          </div>

          {/* Transactions Table */}
          <Card padding="none" shadow="sm" className="mb-8">
            <CardHeader className="px-6 pt-6">
              <CardTitle level="h3">
                Transactions ({filteredTransactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">{t('loadingTransactions')}</div>
              ) : (
                <Table hoverable>
                  <TableHeader>
                    <TableRow isHeader>
                      <TableHead>{commonT('date')}</TableHead>
                      <TableHead>{commonT('description')}</TableHead>
                      <TableHead>{commonT('category')}</TableHead>
                      <TableHead>{commonT('type')}</TableHead>
                      <TableHead align="right">{commonT('amount')}</TableHead>
                      <TableHead align="center">{commonT('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((tx) => (
                        <TableRow key={tx.id} onClick={() => setViewTx(tx)} className="cursor-pointer">
                          <TableCell>{formatDate(tx.date)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{tx.description}</p>
                                {tx.receipt_id && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-tenir-50 text-tenir-600 border border-tenir-100">
                                    <Paperclip size={10} />
                                    {t('receiptBadge')}
                                  </span>
                                )}
                              </div>
                              {tx.vendor && (
                                <p className="text-sm text-gray-500">{tx.vendor}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{tx.category}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tx.type === 'expense'
                                  ? 'error'
                                  : tx.type === 'income'
                                    ? 'success'
                                    : 'info'
                              }
                              size="sm"
                            >
                              {typeOptions.find((o) => o.value === tx.type)?.label ?? tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell align="right">
                            <span
                              className={cn(
                                'font-semibold',
                                tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                              )}
                            >
                              {formatCurrency(tx.amount)}
                            </span>
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                title={tx.receipt_id ? 'Voir le reçu' : 'Attacher un reçu'}
                                onClick={(e) => { e.stopPropagation(); tx.receipt_id ? setViewTx(tx) : setReceiptModalTx(tx); }}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  tx.receipt_id
                                    ? 'bg-tenir-50 text-tenir-600 hover:bg-tenir-100'
                                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'
                                )}
                              >
                                <Paperclip size={14} />
                              </button>
                              <button
                                title="Edit"
                                onClick={(e) => { e.stopPropagation(); setEditTx(tx); }}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                title="Delete"
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                                onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id); }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <p className="text-gray-600">
                            {transactions.length === 0
                              ? t('noTransactionsYet')
                              : commonT('noResults')}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <Card padding="md" shadow="sm">
              <CardHeader>
                <CardTitle level="h3">{t('categoryBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryBreakdown.map((cat) => (
                    <div key={cat.value} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{cat.label}</span>
                      <div className="flex items-center gap-4">
                        <div className="w-40 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-tenir-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${(cat.amount / Math.max(...categoryBreakdown.map((c) => c.amount))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900 w-24 text-right">
                          {formatCurrency(cat.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add transaction */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
      />

      {/* Edit transaction */}
      {editTx && (
        <TransactionModal
          isOpen={true}
          onClose={() => setEditTx(null)}
          onSubmit={handleEditTransaction}
          initialData={editTx}
        />
      )}

      {/* View transaction detail */}
      {viewTx && (
        <TransactionDetailModal
          tx={viewTx}
          onClose={() => setViewTx(null)}
          onEdit={(tx) => { setViewTx(null); setEditTx(tx); }}
          onDelete={(id) => { setViewTx(null); handleDeleteTransaction(id); }}
          onReceipt={(tx) => { setViewTx(null); setReceiptModalTx(tx); }}
          categoryOptions={categoryOptions}
        />
      )}

      {receiptModalTx && orgId && user && (
        <TransactionReceiptModal
          tx={receiptModalTx}
          orgId={orgId}
          userId={user.id}
          onClose={() => setReceiptModalTx(null)}
          onLinked={handleReceiptLinked}
        />
      )}
    </div>
  );
}
