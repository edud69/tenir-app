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
import {
  Plus, Edit2, Trash2, ArrowUpRight, ArrowDownLeft, Paperclip, Upload,
  Link2, Unlink, FileText, ImageOff, Loader2, CheckCircle, X,
  CreditCard, Landmark, ArrowLeftRight, PiggyBank, Banknote,
  AlertTriangle, FileSpreadsheet, FilePlus, ChevronDown,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { createClient } from '@/lib/supabase/client';

type TransactionType = 'expense' | 'income' | 'dividend' | 'capital_gain' | 'interest' | 'transfer';
type AccountType = 'checking' | 'savings' | 'credit_card' | 'line_of_credit';
type TransferType = 'credit_card_payment' | 'account_advance' | 'transfer';

// ─── Import Transactions Modal ────────────────────────────────────────────────

interface ImportedTransaction {
  type: 'expense' | 'income' | 'dividend' | 'capital_gain' | 'interest' | 'transfer';
  category: string;
  date: string;
  description: string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  isDuplicate?: boolean;
  duplicateId?: string;
}

type ImportStep = 'upload' | 'review' | 'done';

function ImportTransactionsModal({
  orgId,
  userId,
  onClose,
  onImported,
}: {
  orgId: string;
  userId: string;
  onClose: () => void;
  onImported: (txs: unknown[]) => void;
}) {
  const supabase = createClient();
  const [step, setStep] = useState<ImportStep>('upload');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ImportedTransaction[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('orgId', orgId);
      const res = await fetch('/api/transactions/import', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      const txs: ImportedTransaction[] = json.transactions || [];
      setExtracted(txs);
      // Pre-select all non-duplicates
      const preSelected = new Set<number>();
      txs.forEach((tx, i) => { if (!tx.isDuplicate) preSelected.add(i); });
      setSelected(preSelected);
      setStep('review');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === extracted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(extracted.map((_, i) => i)));
    }
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    setError(null);
    try {
      const toImport = extracted.filter((_, i) => selected.has(i));
      const inserts = toImport.map((tx) => ({
        organization_id: orgId,
        created_by: userId,
        type: tx.type,
        category: tx.category,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        vendor: tx.vendor || null,
        notes: tx.notes || null,
        is_recurring: false,
        currency: 'CAD',
      }));

      const { data, error: dbErr } = await (supabase as any)
        .from('transactions')
        .insert(inserts)
        .select();
      if (dbErr) throw dbErr;
      setImportedCount(data?.length || toImport.length);
      onImported(data || []);
      setStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const typeColors: Record<string, string> = {
    expense: 'text-red-600 bg-red-50',
    income: 'text-emerald-600 bg-emerald-50',
    dividend: 'text-blue-600 bg-blue-50',
    capital_gain: 'text-purple-600 bg-purple-50',
    interest: 'text-sky-600 bg-sky-50',
    transfer: 'text-amber-600 bg-amber-50',
  };

  const typeLabels: Record<string, string> = {
    expense: 'Dépense',
    income: 'Revenu',
    dividend: 'Dividende',
    capital_gain: 'Gain cap.',
    interest: 'Intérêt',
    transfer: 'Transfert',
  };

  const duplicates = extracted.filter((tx) => tx.isDuplicate).length;
  const newCount = extracted.length - duplicates;

  return (
    <Modal isOpen onClose={onClose} title="Importer des transactions" size="xl">
      <div className="space-y-4">
        {/* ── Step: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Importez un relevé bancaire ou un fichier comptable. Formats supportés : PDF, Excel (.xlsx/.xls) ou CSV.
            </p>
            <div
              className={cn(
                'relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer',
                dragging ? 'border-tenir-500 bg-tenir-50' : 'border-gray-200 hover:border-tenir-300 hover:bg-gray-50'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="text-tenir-500 animate-spin" />
                  <p className="text-sm font-medium text-gray-700">Analyse en cours avec Claude AI…</p>
                  <p className="text-xs text-gray-400">Extraction des transactions depuis le fichier</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-3">
                    <div className="p-3 rounded-xl bg-red-50"><FileText size={24} className="text-red-400" /></div>
                    <div className="p-3 rounded-xl bg-emerald-50"><FileSpreadsheet size={24} className="text-emerald-400" /></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Glissez votre fichier ici</p>
                    <p className="text-sm text-gray-500 mt-1">ou cliquez pour sélectionner — PDF, XLSX, XLS, CSV</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                <AlertTriangle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Review ── */}
        {step === 'review' && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg text-sm font-medium text-emerald-700">
                <FilePlus size={14} />
                {newCount} nouvelle{newCount !== 1 ? 's' : ''}
              </div>
              {duplicates > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg text-sm font-medium text-amber-700">
                  <AlertTriangle size={14} />
                  {duplicates} doublon{duplicates !== 1 ? 's' : ''} détecté{duplicates !== 1 ? 's' : ''}
                </div>
              )}
              <span className="text-sm text-gray-500 ml-auto">{selected.size} sélectionné{selected.size !== 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selected.size === extracted.length && extracted.length > 0}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Montant</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {extracted.map((tx, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'transition-colors',
                        tx.isDuplicate ? 'bg-amber-50/60' : 'hover:bg-gray-50',
                        selected.has(i) ? 'bg-tenir-50/30' : ''
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(i)}
                          onChange={() => toggleSelect(i)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{tx.date}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-900 truncate max-w-48">{tx.description}</p>
                        {tx.vendor && <p className="text-xs text-gray-400">{tx.vendor}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeColors[tx.type] || 'bg-gray-100 text-gray-600')}>
                          {typeLabels[tx.type] || tx.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {tx.isDuplicate && (
                          <span title="Doublon potentiel" className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangle size={12} />
                            Doublon
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                <AlertTriangle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <Button variant="outline" onClick={() => { setStep('upload'); setExtracted([]); setSelected(new Set()); setError(null); }}>
                Retour
              </Button>
              <Button
                variant="primary"
                icon={importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
              >
                {importing ? 'Importation…' : `Importer ${selected.size} transaction${selected.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Importation réussie</p>
              <p className="text-sm text-gray-500 mt-1">
                {importedCount} transaction{importedCount !== 1 ? 's' : ''} ajoutée{importedCount !== 1 ? 's' : ''} avec succès.
              </p>
            </div>
            <Button variant="primary" onClick={onClose}>Fermer</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

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

// ─── Receipt modal ────────────────────────────────────────────────────────────

interface ReceiptRecord {
  id: string;
  file_path: string | null;
  file_name: string | null;
  vendor: string | null;
  amount: number | null;
  date: string | null;
  category: string | null;
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

type ReceiptTab = 'link' | 'upload';
type UploadPhase = 'idle' | 'uploading' | 'scanning' | 'saving' | 'done' | 'error';

function TransactionReceiptModal({
  tx, orgId, userId, onClose, onLinked,
}: {
  tx: Transaction;
  orgId: string;
  userId: string;
  onClose: () => void;
  onLinked: (txId: string, receiptId: string | null, updates?: Partial<Transaction>) => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ReceiptTab>('link');
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [doneLabel, setDoneLabel] = useState('');

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
      setPhase('uploading');
      const uploadForm = new FormData();
      uploadForm.append('file', file);
      uploadForm.append('orgId', orgId);
      uploadForm.append('userId', userId);
      const uploadRes = await fetch('/api/receipts/upload', { method: 'POST', body: uploadForm });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { path: filePath } = await uploadRes.json();

      setPhase('scanning');
      const ocrForm = new FormData();
      ocrForm.append('file', file);
      const ocrRes = await fetch('/api/receipts/ocr', { method: 'POST', body: ocrForm });
      const ocr = ocrRes.ok ? await ocrRes.json() : {};

      const vendor = ocr.vendorName || null;
      const amount = typeof ocr.totalAmount === 'number' ? ocr.totalAmount : null;
      const date = ocr.date || null;
      const category = normalizeOcrCategory(ocr.category);

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
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Receipt</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{tx.description}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="flex border-b border-gray-100 px-6">
          {(['link', 'upload'] as ReceiptTab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPhase('idle'); setErrorMsg(''); }}
              className={cn('py-3 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors', tab === t ? 'border-tenir-500 text-tenir-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t === 'link' ? 'Link existing' : 'Upload new'}
            </button>
          ))}
        </div>
        <div className="p-6 max-h-[420px] overflow-y-auto">
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
                  {phase === 'error' && <p className="mt-3 text-sm text-red-600 text-center">{errorMsg}</p>}
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

// ─── Link Transaction Modal ───────────────────────────────────────────────────

function LinkTransactionModal({
  tx,
  allTransactions,
  onClose,
  onLinked,
}: {
  tx: Transaction;
  allTransactions: Transaction[];
  onClose: () => void;
  onLinked: (txId: string, linkedId: string | null) => void;
}) {
  const supabase = createClient();
  const [search, setSearch] = useState('');

  const candidates = allTransactions.filter(
    (t) => t.id !== tx.id && !t.linked_transaction_id &&
      (t.description.toLowerCase().includes(search.toLowerCase()) ||
       (t.vendor || '').toLowerCase().includes(search.toLowerCase()))
  );

  async function handleLink(target: Transaction) {
    await (supabase as any).from('transactions').update({ linked_transaction_id: target.id }).eq('id', tx.id);
    await (supabase as any).from('transactions').update({ linked_transaction_id: tx.id }).eq('id', target.id);
    onLinked(tx.id, target.id);
    onClose();
  }

  async function handleUnlink() {
    if (tx.linked_transaction_id) {
      await (supabase as any).from('transactions').update({ linked_transaction_id: null }).eq('id', tx.linked_transaction_id);
    }
    await (supabase as any).from('transactions').update({ linked_transaction_id: null }).eq('id', tx.id);
    onLinked(tx.id, null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Lier une transaction</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{tx.description}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          {tx.linked_transaction_id && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
              <span className="text-sm text-blue-700 font-medium flex items-center gap-2">
                <Link2 size={14} /> Transaction déjà liée
              </span>
              <button onClick={handleUnlink} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium">
                <Unlink size={11} /> Délier
              </button>
            </div>
          )}
          <input
            type="text"
            placeholder="Rechercher une transaction…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tenir-400 focus:border-transparent"
          />
        </div>

        <div className="p-6 pt-3 max-h-[380px] overflow-y-auto space-y-2">
          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <Link2 size={28} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Aucune transaction disponible.</p>
            </div>
          ) : (
            candidates.map((t) => (
              <button key={t.id} onClick={() => handleLink(t)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-tenir-200 hover:bg-tenir-50/30 transition-all text-left group">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', t.amount < 0 ? 'bg-red-50' : 'bg-emerald-50')}>
                  {t.amount < 0 ? <ArrowDownLeft size={14} className="text-red-500" /> : <ArrowUpRight size={14} className="text-emerald-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                  <p className="text-xs text-gray-400">{formatDate(t.date)} · {t.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn('text-sm font-bold', t.amount < 0 ? 'text-red-600' : 'text-emerald-600')}>{formatCurrency(t.amount)}</p>
                  <span className="text-xs text-tenir-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Lier →</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Types & Interfaces ───────────────────────────────────────────────────────

interface BankAccount {
  id: string;
  organization_id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  last_four: string | null;
  currency: string;
  current_balance: number;
  credit_limit: number | null;
  is_active: boolean;
  created_at: string;
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
  account_id?: string | null;
  linked_transaction_id?: string | null;
  transfer_type?: TransferType | null;
}

const categoryOptions = [
  { value: 'office', label: 'Bureau' },
  { value: 'professional', label: 'Services professionnels' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'travel', label: 'Déplacements' },
  { value: 'meals', label: 'Repas et divertissement' },
  { value: 'supplies', label: 'Fournitures' },
  { value: 'technology', label: 'Technologie' },
  { value: 'bank', label: 'Frais bancaires' },
  { value: 'legal', label: 'Frais juridiques' },
  { value: 'accounting', label: 'Frais comptables' },
  { value: 'dividend', label: 'Dividende' },
  { value: 'capital_gain', label: 'Gain en capital' },
  { value: 'interest', label: 'Intérêt' },
  { value: 'other', label: 'Autre' },
];

// ─── Account Icon ─────────────────────────────────────────────────────────────

function AccountIcon({ type, size = 16, className }: { type: AccountType; size?: number; className?: string }) {
  const iconMap: Record<AccountType, React.ElementType> = {
    checking: Landmark,
    savings: PiggyBank,
    credit_card: CreditCard,
    line_of_credit: Banknote,
  };
  const Icon = iconMap[type] || Landmark;
  return <Icon size={size} className={className} />;
}

// ─── Account Modal ────────────────────────────────────────────────────────────

interface AccountFormData {
  name: string;
  type: AccountType;
  institution: string;
  last_four: string;
  current_balance: number;
  credit_limit: number;
}

function AccountModal({
  isOpen, onClose, onSubmit, initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => void;
  initialData?: BankAccount;
}) {
  const t = useTranslations('expenses');
  const commonT = useTranslations('common');
  const [formData, setFormData] = useState<AccountFormData>(
    initialData ? {
      name: initialData.name,
      type: initialData.type,
      institution: initialData.institution || '',
      last_four: initialData.last_four || '',
      current_balance: initialData.current_balance,
      credit_limit: initialData.credit_limit || 0,
    } : {
      name: '',
      type: 'checking',
      institution: '',
      last_four: '',
      current_balance: 0,
      credit_limit: 0,
    }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        institution: initialData.institution || '',
        last_four: initialData.last_four || '',
        current_balance: initialData.current_balance,
        credit_limit: initialData.credit_limit || 0,
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const accountTypeOptions = [
    { value: 'checking', label: t('checking') },
    { value: 'savings', label: t('savings') },
    { value: 'credit_card', label: t('creditCard') },
    { value: 'line_of_credit', label: t('lineOfCredit') },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t('editAccount') : t('addAccount')}
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>{commonT('cancel')}</Button>
          <Button variant="primary" fullWidth onClick={handleSubmit}>{commonT('save')}</Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Nom du compte"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Select
          label={t('accountType')}
          value={formData.type}
          onChange={(value) => setFormData({ ...formData, type: value as AccountType })}
          options={accountTypeOptions}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('institution')}
            value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            placeholder="ex: TD, Desjardins"
          />
          <Input
            label={t('lastFour')}
            value={formData.last_four}
            onChange={(e) => setFormData({ ...formData, last_four: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="1234"
            maxLength={4}
          />
        </div>
        <Input
          label={t('balance')}
          type="number"
          step="0.01"
          value={formData.current_balance}
          onChange={(e) => setFormData({ ...formData, current_balance: parseFloat(e.target.value) || 0 })}
        />
        {(formData.type === 'credit_card' || formData.type === 'line_of_credit') && (
          <Input
            label={t('creditLimit')}
            type="number"
            step="0.01"
            value={formData.credit_limit}
            onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
          />
        )}
      </form>
    </Modal>
  );
}

// ─── Transaction Modal ────────────────────────────────────────────────────────

interface ModalFormData {
  type: TransactionType;
  category: string;
  date: string;
  description: string;
  amount: number;
  vendor: string;
  is_recurring: boolean;
  recurrence_frequency: string;
  account_id: string;
  transfer_type: TransferType | '';
  destination_account_id: string;
}

function TransactionModal({
  isOpen, onClose, onSubmit, initialData, bankAccounts,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ModalFormData) => void;
  initialData?: Transaction;
  bankAccounts: BankAccount[];
}) {
  const t = useTranslations('expenses');
  const commonT = useTranslations('common');

  const defaultAccount = bankAccounts[0]?.id || '';

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
          account_id: initialData.account_id || defaultAccount,
          transfer_type: (initialData.transfer_type as TransferType) || '',
          destination_account_id: '',
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
          account_id: defaultAccount,
          transfer_type: '',
          destination_account_id: '',
        }
  );

  // Reset destination account if same as source
  useEffect(() => {
    if (formData.destination_account_id === formData.account_id) {
      setFormData((prev) => ({ ...prev, destination_account_id: '' }));
    }
  }, [formData.account_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const isTransfer = formData.type === 'transfer';
  const isIncome = ['income', 'dividend', 'capital_gain', 'interest'].includes(formData.type);

  const typeOptions = [
    { value: 'expense', label: t('expense') },
    { value: 'income', label: t('income') },
    { value: 'dividend', label: t('dividend') },
    { value: 'capital_gain', label: t('capitalGain') },
    { value: 'interest', label: t('interest') },
    { value: 'transfer', label: t('transfer') },
  ];

  const transferTypeOptions = [
    { value: 'credit_card_payment', label: t('creditCardPayment') },
    { value: 'account_advance', label: t('accountAdvance') },
    { value: 'transfer', label: t('interAccountTransfer') },
  ];

  const accountOptions = bankAccounts.map((a) => ({
    value: a.id,
    label: `${a.name}${a.last_four ? ` ····${a.last_four}` : ''}`,
  }));

  const destAccountOptions = accountOptions.filter((a) => a.value !== formData.account_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Modifier la transaction' : t('addTransaction')}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>{commonT('cancel')}</Button>
          <Button variant="primary" fullWidth onClick={handleSubmit}>{commonT('save')}</Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
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

        {/* Account selector */}
        {bankAccounts.length > 0 && (
          <Select
            label={isTransfer ? t('sourceAccount') : t('account')}
            value={formData.account_id}
            onChange={(value) => setFormData({ ...formData, account_id: String(value) })}
            options={[{ value: '', label: '— Aucun compte —' }, ...accountOptions]}
          />
        )}

        {/* Transfer-specific fields */}
        {isTransfer && (
          <>
            <Select
              label={t('transferType')}
              value={formData.transfer_type}
              onChange={(value) => setFormData({ ...formData, transfer_type: value as TransferType })}
              options={[{ value: '', label: '— Choisir —' }, ...transferTypeOptions]}
            />
            {bankAccounts.length > 1 && (
              <Select
                label={t('destAccount')}
                value={formData.destination_account_id}
                onChange={(value) => setFormData({ ...formData, destination_account_id: String(value) })}
                options={[{ value: '', label: '— Choisir —' }, ...destAccountOptions]}
              />
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          {!isTransfer && (
            <Select
              label={commonT('category')}
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: String(value) })}
              options={categoryOptions}
            />
          )}
          <Input
            label={commonT('amount')}
            type="number"
            step="0.01"
            value={Math.abs(formData.amount)}
            onChange={(e) => {
              const raw = parseFloat(e.target.value) || 0;
              setFormData({
                ...formData,
                amount: isTransfer || isIncome ? raw : -raw,
              });
            }}
            required
          />
        </div>

        {!isTransfer && (
          <Input
            label="Vendeur / Payeur"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
          />
        )}

        {!isTransfer && (
          <>
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
                onChange={(value) => setFormData({ ...formData, recurrence_frequency: String(value) })}
                options={[
                  { value: 'monthly', label: t('monthly') },
                  { value: 'quarterly', label: t('quarterly') },
                  { value: 'annually', label: t('annually') },
                ]}
              />
            )}
          </>
        )}
      </form>
    </Modal>
  );
}

// ─── Transaction Detail Modal ─────────────────────────────────────────────────

function TransactionDetailModal({
  tx, onClose, onEdit, onDelete, onReceipt, onLinkTx, bankAccounts, linkedTx,
}: {
  tx: Transaction;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onReceipt: (tx: Transaction) => void;
  onLinkTx: (tx: Transaction) => void;
  bankAccounts: BankAccount[];
  linkedTx?: Transaction | null;
}) {
  const t = useTranslations('expenses');
  const catLabel = categoryOptions.find((c) => c.value === tx.category)?.label || tx.category;
  const account = bankAccounts.find((a) => a.id === tx.account_id);

  const typeColors: Record<string, string> = {
    expense: 'text-red-600 bg-red-50',
    income: 'text-emerald-600 bg-emerald-50',
    dividend: 'text-blue-600 bg-blue-50',
    capital_gain: 'text-purple-600 bg-purple-50',
    interest: 'text-sky-600 bg-sky-50',
    transfer: 'text-amber-600 bg-amber-50',
  };

  const transferTypeLabel: Record<string, string> = {
    credit_card_payment: t('creditCardPayment'),
    account_advance: t('accountAdvance'),
    transfer: t('interAccountTransfer'),
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900 truncate">{tx.description}</p>
            {tx.vendor && <p className="text-xs text-gray-400 mt-0.5">{tx.vendor}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 ml-3 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 text-center border-b border-gray-50">
          <p className={cn('text-3xl font-bold', tx.amount < 0 ? 'text-red-600' : 'text-emerald-600')}>
            {tx.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(tx.amount))}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', typeColors[tx.type] || 'text-gray-600 bg-gray-100')}>
              {tx.type === 'capital_gain' ? 'Gain en capital' : tx.type === 'transfer' ? 'Transfert' : tx.type}
            </span>
            {tx.receipt_id && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-tenir-50 text-tenir-600">
                <Paperclip size={10} /> Reçu
              </span>
            )}
            {tx.linked_transaction_id && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                <Link2 size={10} /> {t('linkedTransaction')}
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(tx.date)}</p>
          </div>
          {tx.type !== 'transfer' && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Catégorie</p>
              <p className="text-sm font-medium text-gray-900">{catLabel || '—'}</p>
            </div>
          )}
          {account && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t('account')}</p>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                <AccountIcon type={account.type} size={13} className="text-gray-500" />
                {account.name}
                {account.last_four && <span className="text-gray-400">····{account.last_four}</span>}
              </p>
            </div>
          )}
          {tx.transfer_type && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t('transferType')}</p>
              <p className="text-sm font-medium text-gray-900">{transferTypeLabel[tx.transfer_type] || tx.transfer_type}</p>
            </div>
          )}
          {tx.vendor && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Vendeur</p>
              <p className="text-sm font-medium text-gray-900">{tx.vendor}</p>
            </div>
          )}
          {tx.is_recurring && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Récurrent</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{tx.recurrence_frequency || 'Oui'}</p>
            </div>
          )}
          {linkedTx && (
            <div className="col-span-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-500 mb-1 font-medium">{t('linkedTransaction')}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{linkedTx.description}</p>
                  <p className="text-xs text-gray-500">{formatDate(linkedTx.date)}</p>
                </div>
                <p className={cn('text-sm font-bold', linkedTx.amount < 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {formatCurrency(linkedTx.amount)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-2 border-t border-gray-50 pt-4 flex-wrap">
          <button
            onClick={() => onReceipt(tx)}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-1 justify-center min-w-0',
              tx.receipt_id ? 'bg-tenir-50 text-tenir-600 hover:bg-tenir-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            <Paperclip size={14} />
            {tx.receipt_id ? 'Reçu' : 'Reçu'}
          </button>
          <button
            onClick={() => onLinkTx(tx)}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-1 justify-center min-w-0',
              tx.linked_transaction_id ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            <Link2 size={14} />
            Lier
          </button>
          <button
            onClick={() => onEdit(tx)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex-1 justify-center min-w-0"
          >
            <Edit2 size={14} /> Modifier
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

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ title, value, isNegative, subtitle }: {
  title: string; value: number; isNegative?: boolean; subtitle?: string;
}) {
  return (
    <Card padding="md" shadow="sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={cn('text-2xl font-bold', isNegative ? 'text-red-600' : 'text-green-600')}>
            {formatCurrency(value)}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-lg', isNegative ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')}>
          {isNegative ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
        </div>
      </div>
    </Card>
  );
}

// ─── Account type label helpers ───────────────────────────────────────────────

const accountTypeColor: Record<AccountType, string> = {
  checking: 'bg-blue-50 text-blue-700 border-blue-100',
  savings: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  credit_card: 'bg-purple-50 text-purple-700 border-purple-100',
  line_of_credit: 'bg-amber-50 text-amber-700 border-amber-100',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const t = useTranslations('expenses');
  const commonT = useTranslations('common');
  const supabase = createClient();
  const { orgId, user, loading: orgLoading } = useOrganization();
  const searchParams = useSearchParams();

  // ── State ──────────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [viewTx, setViewTx] = useState<Transaction | null>(null);
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null);
  const [linkTxModal, setLinkTxModal] = useState<Transaction | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [accountOverflowOpen, setAccountOverflowOpen] = useState(false);
  const accountOverflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (accountOverflowRef.current && !accountOverflowRef.current.contains(e.target as Node)) {
        setAccountOverflowOpen(false);
      }
    }
    if (accountOverflowOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [accountOverflowOpen]);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    setSearchQuery(searchParams.get('search') ?? '');
  }, [searchParams]);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    async function fetchAccounts() {
      setAccountsLoading(true);
      const { data } = await (supabase as any)
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      setBankAccounts(data || []);
      setAccountsLoading(false);
    }
    fetchAccounts();
  }, [orgId]);

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

  // ── Filters ────────────────────────────────────────────────────────────────
  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
    if (accountFilter !== 'all' && tx.account_id !== accountFilter) return false;
    if (dateRange.start && tx.date < dateRange.start) return false;
    if (dateRange.end && tx.date > dateRange.end) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !tx.description.toLowerCase().includes(q) &&
        !(tx.vendor || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // ── Summaries ──────────────────────────────────────────────────────────────
  const totalExpenses = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalIncome = transactions
    .filter((tx) => ['income', 'dividend', 'capital_gain', 'interest'].includes(tx.type))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netIncome = totalIncome - totalExpenses;

  const taxDeductible = totalExpenses +
    transactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

  const categoryBreakdown = categoryOptions.map((cat) => {
    const amount = transactions
      .filter((tx) => tx.category === cat.value)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return { ...cat, amount };
  }).filter((cat) => cat.amount > 0);

  // ── Account CRUD ───────────────────────────────────────────────────────────
  const handleSaveAccount = async (data: AccountFormData) => {
    if (!orgId) return;
    if (editAccount) {
      const { data: updated, error } = await (supabase as any)
        .from('bank_accounts')
        .update({ ...data, institution: data.institution || null, last_four: data.last_four || null, credit_limit: data.credit_limit || null })
        .eq('id', editAccount.id)
        .select()
        .single();
      if (!error && updated) {
        setBankAccounts((prev) => prev.map((a) => a.id === editAccount.id ? updated : a));
      }
      setEditAccount(null);
    } else {
      const { data: newAcc, error } = await (supabase as any)
        .from('bank_accounts')
        .insert({
          organization_id: orgId,
          name: data.name,
          type: data.type,
          institution: data.institution || null,
          last_four: data.last_four || null,
          currency: 'CAD',
          current_balance: data.current_balance,
          credit_limit: data.credit_limit || null,
        })
        .select()
        .single();
      if (!error && newAcc) {
        setBankAccounts((prev) => [...prev, newAcc]);
      }
    }
    setIsAccountModalOpen(false);
  };

  // ── Transaction CRUD ───────────────────────────────────────────────────────
  const handleAddTransaction = async (data: ModalFormData) => {
    if (!orgId || !user) return;
    try {
      const isTransfer = data.type === 'transfer';

      if (isTransfer && data.destination_account_id) {
        // Create both sides of the transfer and link them
        const base = {
          organization_id: orgId,
          type: 'transfer',
          category: 'other',
          date: data.date,
          description: data.description,
          currency: 'CAD',
          is_recurring: false,
          recurrence_frequency: null,
          transfer_type: data.transfer_type || null,
          created_by: user.id,
        };
        const absAmount = Math.abs(data.amount);

        const { data: srcTx, error: srcErr } = await (supabase as any)
          .from('transactions')
          .insert({ ...base, amount: -absAmount, account_id: data.account_id || null })
          .select()
          .single();
        if (srcErr) throw srcErr;

        const { data: dstTx, error: dstErr } = await (supabase as any)
          .from('transactions')
          .insert({ ...base, amount: absAmount, account_id: data.destination_account_id })
          .select()
          .single();
        if (dstErr) throw dstErr;

        // Link them to each other
        await (supabase as any).from('transactions').update({ linked_transaction_id: dstTx.id }).eq('id', srcTx.id);
        await (supabase as any).from('transactions').update({ linked_transaction_id: srcTx.id }).eq('id', dstTx.id);

        const linkedSrc = { ...srcTx, linked_transaction_id: dstTx.id };
        const linkedDst = { ...dstTx, linked_transaction_id: srcTx.id };
        setTransactions((prev) => [linkedSrc, linkedDst, ...prev]);
      } else {
        const isIncome = ['income', 'dividend', 'capital_gain', 'interest'].includes(data.type);
        const insertData = {
          organization_id: orgId,
          type: data.type,
          category: data.category,
          date: data.date,
          description: data.description,
          amount: isTransfer ? -Math.abs(data.amount) : data.amount,
          vendor: data.vendor || null,
          is_recurring: data.is_recurring,
          recurrence_frequency: data.recurrence_frequency || null,
          currency: 'CAD',
          created_by: user.id,
          account_id: data.account_id || null,
          transfer_type: data.transfer_type || null,
        };
        const { data: newTx, error } = await (supabase as any)
          .from('transactions')
          .insert(insertData)
          .select()
          .single();
        if (error) throw error;
        setTransactions([newTx, ...transactions]);
      }
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
          account_id: data.account_id || null,
          transfer_type: data.transfer_type || null,
        })
        .eq('id', editTx.id)
        .select()
        .single();
      if (error) throw error;
      setTransactions((prev) => prev.map((tx) => tx.id === editTx.id ? updated : tx));
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

  const handleTxLinked = (txId: string, linkedId: string | null) => {
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id === txId) return { ...tx, linked_transaction_id: linkedId };
        if (linkedId && tx.id === linkedId) return { ...tx, linked_transaction_id: txId };
        return tx;
      })
    );
    if (viewTx?.id === txId) setViewTx((prev) => prev ? { ...prev, linked_transaction_id: linkedId } : null);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const tx = transactions.find((t) => t.id === id);
      // Unlink the paired transaction if any
      if (tx?.linked_transaction_id) {
        await (supabase as any).from('transactions').update({ linked_transaction_id: null }).eq('id', tx.linked_transaction_id);
      }
      const { error } = await (supabase as any).from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter((tx) => tx.id !== id));
    } catch (e: any) {
      setTxError(e.message);
    }
  };

  const isLoading = orgLoading || txLoading;

  const typeOptions = [
    { value: 'expense', label: t('expense') },
    { value: 'income', label: t('income') },
    { value: 'dividend', label: t('dividend') },
    { value: 'capital_gain', label: t('capitalGain') },
    { value: 'interest', label: t('interest') },
    { value: 'transfer', label: t('transfer') },
  ];

  const accountTypeLabels: Record<AccountType, string> = {
    checking: t('checking'),
    savings: t('savings'),
    credit_card: t('creditCard'),
    line_of_credit: t('lineOfCredit'),
  };

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
            <SummaryCard title="Dépenses totales" value={totalExpenses} isNegative subtitle="Coûts déductibles" />
            <SummaryCard title="Revenus totaux" value={totalIncome} subtitle="Toutes sources" />
            <SummaryCard title="Revenu net" value={netIncome} isNegative={netIncome < 0} subtitle="Revenus moins dépenses" />
            <SummaryCard title="Déductible" value={taxDeductible} isNegative subtitle="Pour déclaration fiscale" />
          </div>

          {/* ── Account Tabs ────────────────────────────────────────────────── */}
          {(() => {
            const VISIBLE = 3;
            const visibleAccounts = bankAccounts.slice(0, VISIBLE);
            const overflowAccounts = bankAccounts.slice(VISIBLE);
            const overflowHasSelected = overflowAccounts.some((a) => a.id === accountFilter);

            function AccountPill({ acc, compact = false }: { acc: BankAccount; compact?: boolean }) {
              const isSelected = accountFilter === acc.id;
              const txCount = transactions.filter((tx) => tx.account_id === acc.id).length;
              const isCreditType = acc.type === 'credit_card' || acc.type === 'line_of_credit';
              return (
                <div className="relative group">
                  <button
                    onClick={() => { setAccountFilter(isSelected ? 'all' : acc.id); setAccountOverflowOpen(false); }}
                    className={cn(
                      'flex items-center gap-2 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all',
                      compact ? 'pl-3 pr-3 w-full' : 'pl-3 pr-8',
                      isSelected
                        ? cn(accountTypeColor[acc.type], 'shadow-sm')
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <AccountIcon type={acc.type} size={14} />
                    <div className="text-left leading-tight flex-1 min-w-0">
                      <span className="block truncate">{acc.name}</span>
                      <span className={cn('block text-xs', isSelected ? 'opacity-70' : 'text-gray-400')}>
                        {isCreditType && acc.credit_limit
                          ? `${formatCurrency(Math.abs(acc.current_balance))} / ${formatCurrency(acc.credit_limit)}`
                          : formatCurrency(acc.current_balance)}
                      </span>
                    </div>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold ml-1 flex-shrink-0', isSelected ? 'bg-black/10' : 'bg-gray-100 text-gray-400')}>
                      {txCount}
                    </span>
                  </button>
                  {!compact && (
                    <button
                      title="Modifier le compte"
                      onClick={(e) => { e.stopPropagation(); setEditAccount(acc); setIsAccountModalOpen(true); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 p-1 rounded-md hover:opacity-100 hover:bg-black/10 transition-opacity"
                    >
                      <Edit2 size={11} />
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="mb-6">
                {accountsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                    <Loader2 size={15} className="animate-spin" /> Chargement des comptes…
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* "Tous" pill */}
                    <button
                      onClick={() => setAccountFilter('all')}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all',
                        accountFilter === 'all'
                          ? 'bg-tenir-500 text-white border-tenir-500 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-tenir-300 hover:text-tenir-600'
                      )}
                    >
                      <Landmark size={14} />
                      Tous
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', accountFilter === 'all' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500')}>
                        {transactions.length}
                      </span>
                    </button>

                    {/* Visible account pills */}
                    {visibleAccounts.map((acc) => <AccountPill key={acc.id} acc={acc} />)}

                    {/* Overflow dropdown */}
                    {overflowAccounts.length > 0 && (
                      <div className="relative" ref={accountOverflowRef}>
                        <button
                          onClick={() => setAccountOverflowOpen((o) => !o)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all',
                            overflowHasSelected
                              ? 'bg-tenir-500 text-white border-tenir-500 shadow-sm'
                              : accountOverflowOpen
                                ? 'bg-gray-100 text-gray-700 border-gray-300'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          )}
                        >
                          {overflowHasSelected ? (
                            <>
                              <AccountIcon type={bankAccounts.find((a) => a.id === accountFilter)?.type || 'checking'} size={14} />
                              {bankAccounts.find((a) => a.id === accountFilter)?.name}
                            </>
                          ) : (
                            <>+{overflowAccounts.length}</>
                          )}
                          <ChevronDown size={13} className={cn('transition-transform', accountOverflowOpen && 'rotate-180')} />
                        </button>

                        {accountOverflowOpen && (
                          <div className="absolute top-full left-0 mt-1.5 z-20 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-56 space-y-0.5">
                            {overflowAccounts.map((acc) => (
                              <AccountPill key={acc.id} acc={acc} compact />
                            ))}
                            <div className="border-t border-gray-100 mt-1 pt-1">
                              <button
                                onClick={() => { setEditAccount(overflowAccounts.find((a) => a.id === accountFilter) || null); setIsAccountModalOpen(true); setAccountOverflowOpen(false); }}
                                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <Edit2 size={11} /> Modifier le compte sélectionné
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add account */}
                    <button
                      onClick={() => { setEditAccount(null); setIsAccountModalOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 whitespace-nowrap transition-all"
                    >
                      <Plus size={14} />
                      {t('addAccount')}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <Card padding="md" shadow="sm" className="mb-6">
            <CardHeader>
              <CardTitle level="h3">Filtres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select
                  label={t('type')}
                  value={typeFilter}
                  onChange={(value) => setTypeFilter(String(value))}
                  options={[{ value: 'all', label: 'Tous les types' }, ...typeOptions]}
                />
                <Select
                  label={commonT('category')}
                  value={categoryFilter}
                  onChange={(value) => setCategoryFilter(String(value))}
                  options={[{ value: 'all', label: 'Toutes les catégories' }, ...categoryOptions]}
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
                      setAccountFilter('all');
                      setDateRange({ start: '', end: '' });
                    }}
                  >
                    Effacer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Add / Import Transaction ─────────────────────────────────── */}
          <div className="mb-6 flex items-center gap-3">
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setIsModalOpen(true)}
              disabled={!orgId}
            >
              {t('addTransaction')}
            </Button>
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              onClick={() => setIsImportModalOpen(true)}
              disabled={!orgId}
            >
              Importer PDF / Excel
            </Button>
          </div>

          {/* ── Transactions Table ──────────────────────────────────────────── */}
          <Card padding="none" shadow="sm" className="mb-8">
            <CardHeader className="px-6 pt-6">
              <CardTitle level="h3">
                Transactions ({filteredTransactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Chargement des transactions…</div>
              ) : (
                <Table hoverable>
                  <TableHeader>
                    <TableRow isHeader>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>{t('account')}</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead align="right">Montant</TableHead>
                      <TableHead align="center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((tx) => {
                        const account = bankAccounts.find((a) => a.id === tx.account_id);
                        return (
                          <TableRow key={tx.id} onClick={() => setViewTx(tx)} className="cursor-pointer">
                            <TableCell>{formatDate(tx.date)}</TableCell>
                            <TableCell>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-medium text-gray-900">{tx.description}</p>
                                  {tx.receipt_id && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-tenir-50 text-tenir-600 border border-tenir-100">
                                      <Paperclip size={9} />
                                    </span>
                                  )}
                                  {tx.linked_transaction_id && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                      <Link2 size={9} />
                                    </span>
                                  )}
                                </div>
                                {tx.vendor && <p className="text-xs text-gray-400">{tx.vendor}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              {account ? (
                                <div className="flex items-center gap-1.5">
                                  <AccountIcon type={account.type} size={13} className="text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-600 truncate max-w-[100px]">{account.name}</span>
                                  {account.last_four && <span className="text-xs text-gray-400">····{account.last_four}</span>}
                                </div>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {tx.type === 'transfer' ? (
                                <span className="text-xs text-gray-400 italic">
                                  {tx.transfer_type === 'credit_card_payment' ? 'Paiement carte' :
                                   tx.transfer_type === 'account_advance' ? 'Avance' : 'Transfert'}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-600">{tx.category}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  tx.type === 'expense' ? 'error' :
                                  tx.type === 'transfer' ? 'warning' :
                                  tx.type === 'income' ? 'success' : 'info'
                                }
                                size="sm"
                              >
                                {tx.type === 'capital_gain' ? 'Gain cap.' :
                                 tx.type === 'transfer' ? 'Transfert' : tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell align="right">
                              <span className={cn('font-semibold', tx.amount < 0 ? 'text-red-600' : 'text-green-600')}>
                                {formatCurrency(tx.amount)}
                              </span>
                            </TableCell>
                            <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  title={tx.receipt_id ? 'Gérer le reçu' : 'Attacher un reçu'}
                                  onClick={(e) => { e.stopPropagation(); setReceiptModalTx(tx); }}
                                  className={cn('p-1.5 rounded-lg transition-colors',
                                    tx.receipt_id ? 'bg-tenir-50 text-tenir-600 hover:bg-tenir-100' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700')}
                                >
                                  <Paperclip size={14} />
                                </button>
                                <button
                                  title={tx.linked_transaction_id ? 'Transaction liée' : 'Lier une transaction'}
                                  onClick={(e) => { e.stopPropagation(); setLinkTxModal(tx); }}
                                  className={cn('p-1.5 rounded-lg transition-colors',
                                    tx.linked_transaction_id ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700')}
                                >
                                  <Link2 size={14} />
                                </button>
                                <button
                                  title="Modifier"
                                  onClick={(e) => { e.stopPropagation(); setEditTx(tx); }}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  title="Supprimer"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id); }}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-gray-600">
                            {transactions.length === 0
                              ? t('noTransactions')
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

          {/* ── Category Breakdown ──────────────────────────────────────────── */}
          {categoryBreakdown.length > 0 && (
            <Card padding="md" shadow="sm">
              <CardHeader>
                <CardTitle level="h3">Répartition par catégorie</CardTitle>
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
                            style={{ width: `${(cat.amount / Math.max(...categoryBreakdown.map((c) => c.amount))) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900 w-24 text-right">{formatCurrency(cat.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => { setIsAccountModalOpen(false); setEditAccount(null); }}
        onSubmit={handleSaveAccount}
        initialData={editAccount || undefined}
      />

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
        bankAccounts={bankAccounts}
      />

      {editTx && (
        <TransactionModal
          isOpen={true}
          onClose={() => setEditTx(null)}
          onSubmit={handleEditTransaction}
          initialData={editTx}
          bankAccounts={bankAccounts}
        />
      )}

      {viewTx && (
        <TransactionDetailModal
          tx={viewTx}
          onClose={() => setViewTx(null)}
          onEdit={(tx) => { setViewTx(null); setEditTx(tx); }}
          onDelete={(id) => { setViewTx(null); handleDeleteTransaction(id); }}
          onReceipt={(tx) => { setViewTx(null); setReceiptModalTx(tx); }}
          onLinkTx={(tx) => { setViewTx(null); setLinkTxModal(tx); }}
          bankAccounts={bankAccounts}
          linkedTx={viewTx.linked_transaction_id ? transactions.find((t) => t.id === viewTx.linked_transaction_id) : null}
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

      {linkTxModal && (
        <LinkTransactionModal
          tx={linkTxModal}
          allTransactions={transactions}
          onClose={() => setLinkTxModal(null)}
          onLinked={handleTxLinked}
        />
      )}

      {isImportModalOpen && orgId && user && (
        <ImportTransactionsModal
          orgId={orgId}
          userId={user.id}
          onClose={() => setIsImportModalOpen(false)}
          onImported={(newTxs) => {
            setTransactions((prev) => [...(newTxs as Transaction[]), ...prev]);
            setIsImportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
