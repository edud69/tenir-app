'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useDropzone } from 'react-dropzone';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, AlertCircle, Cloud, FileText, Receipt, X, Link2, Unlink,
  ExternalLink, ChevronRight, Search, Calendar, Tag, Building2,
  DollarSign, Loader2, ImageOff, Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'office',       label: 'Office supplies' },
  { value: 'meals',        label: 'Meals & entertainment' },
  { value: 'travel',       label: 'Travel & transport' },
  { value: 'professional', label: 'Professional services' },
  { value: 'insurance',    label: 'Insurance' },
  { value: 'technology',   label: 'Technology & software' },
  { value: 'bank',         label: 'Bank fees' },
  { value: 'legal',        label: 'Legal fees' },
  { value: 'accounting',   label: 'Accounting fees' },
  { value: 'supplies',     label: 'Supplies' },
  { value: 'other',        label: 'Other' },
];

function normalizeOcrCategory(raw: string | null): string | null {
  if (!raw) return null;
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReceiptItem {
  id: string;
  organization_id: string;
  uploaded_by: string | null;
  file_path: string | null;
  file_name: string | null;
  vendor: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  gst_amount: number | null;
  qst_amount: number | null;
  tax_number: string | null;
  category: string | null;
  description: string | null;
  status: 'pending' | 'verified' | 'rejected';
  ocr_data: any;
  source: string | null;
  created_at: string;
  transaction_id?: string | null;
}

interface TxItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: string;
  receipt_id: string | null;
  vendor?: string | null;
}

type UploadStatus = 'uploading' | 'processing' | 'creating' | 'done' | 'error';

// ─── Signed URL hook (via server route to bypass storage RLS) ─────────────────

function useSignedUrl(filePath: string | null) {
  const [url, setUrl]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filePath) { setUrl(null); return; }
    let cancelled = false;
    setLoading(true);
    setUrl(null);
    fetch(`/api/receipts/signed-url?path=${encodeURIComponent(filePath)}`)
      .then((r) => r.json())
      .then(({ url: signedUrl }) => { if (!cancelled && signedUrl) setUrl(signedUrl); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filePath]);

  return { url, loading };
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function ReceiptThumbnail({ filePath, fileName, className }: {
  filePath: string | null; fileName: string | null; className?: string;
}) {
  const { url, loading } = useSignedUrl(filePath);
  const isPdf = (fileName || filePath || '').toLowerCase().endsWith('.pdf');

  if (loading) return (
    <div className={cn('flex items-center justify-center bg-gray-50', className)}>
      <Loader2 size={18} className="text-gray-300 animate-spin" />
    </div>
  );

  if (isPdf) return (
    <div className={cn('flex flex-col items-center justify-center bg-gray-50 gap-1.5', className)}>
      <FileText size={26} className="text-gray-400" />
      <span className="text-xs font-semibold text-gray-400 tracking-wide">PDF</span>
    </div>
  );

  if (url) return (
    <img
      src={url}
      alt={fileName || 'Receipt'}
      className={cn('w-full h-full object-cover', className)}
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = 'none';
        el.nextElementSibling?.classList.remove('hidden');
      }}
    />
  );

  return (
    <div className={cn('flex items-center justify-center bg-gray-50', className)}>
      <ImageOff size={18} className="text-gray-300" />
    </div>
  );
}

// ─── Receipt Card ─────────────────────────────────────────────────────────────

function ReceiptCard({ receipt, onDelete, onClick }: {
  receipt: ReceiptItem;
  onDelete: (id: string) => void;
  onClick: (r: ReceiptItem) => void;
}) {
  const t = useTranslations('receipts');
  const sv = { verified: 'success' as const, pending: 'warning' as const, rejected: 'error' as const };
  const sl = { verified: t('verified'), pending: t('pending'), rejected: t('rejected') };
  const catLabel = CATEGORIES.find((c) => c.value === receipt.category)?.label;

  return (
    <div
      onClick={() => onClick(receipt)}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:border-tenir-200 hover:shadow-md transition-all duration-150"
    >
      {/* Thumbnail */}
      <div className="relative h-44 bg-gray-50 overflow-hidden">
        <ReceiptThumbnail filePath={receipt.file_path} fileName={receipt.file_name} className="h-44" />
        {/* Fallback overlay — hidden by default, shown by img onError */}
        <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-50">
          <ImageOff size={20} className="text-gray-300" />
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700 px-2.5 py-1 rounded-full shadow-sm">
            {t('viewDetails')}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(receipt.id); }}
          className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 z-10"
        >
          <X size={11} />
        </button>
        {receipt.transaction_id && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="flex items-center gap-1 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
              <Link2 size={9} /> {t('linked')}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400 truncate">{receipt.file_name}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
              {receipt.vendor || <span className="text-gray-400 font-normal italic">Unknown vendor</span>}
            </p>
          </div>
          <Badge variant={sv[receipt.status]} size="sm">{sl[receipt.status]}</Badge>
        </div>
        {catLabel && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full mb-2.5">
            <Tag size={9} />{catLabel}
          </span>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-base font-bold text-gray-900">
            {receipt.amount != null ? formatCurrency(receipt.amount) : <span className="text-gray-400 font-normal text-sm">—</span>}
          </span>
          <span className="text-xs text-gray-400">
            {receipt.date ? formatDate(receipt.date) : receipt.created_at?.split('T')[0]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Category Picker Modal ────────────────────────────────────────────────────

function CategoryPickerModal({ receipt, onConfirm, onSkip }: {
  receipt: ReceiptItem;
  onConfirm: (receipt: ReceiptItem, category: string) => void;
  onSkip: (receipt: ReceiptItem) => void;
}) {
  const [selected, setSelected] = useState('other');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Tag size={15} className="text-amber-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Categorize receipt</h3>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            Pick a category for <strong>{receipt.vendor || receipt.file_name}</strong> to finalize the transaction.
          </p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
          {CATEGORIES.map((cat) => (
            <button key={cat.value} onClick={() => setSelected(cat.value)}
              className={cn(
                'text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                selected === cat.value
                  ? 'border-tenir-400 bg-tenir-50 text-tenir-700'
                  : 'border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50'
              )}>
              {cat.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-3">
          <Button variant="ghost" size="sm" onClick={() => onSkip(receipt)} className="flex-1">
            Skip for now
          </Button>
          <Button variant="primary" size="sm" onClick={() => onConfirm(receipt, selected)} className="flex-1">
            Create transaction
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Detail Modal ─────────────────────────────────────────────────────

function ReceiptDetailModal({ receipt, linkedTx, orphanTxs, onClose, onLink, onUnlink, onUpdateCategory }: {
  receipt: ReceiptItem;
  linkedTx: TxItem | null;
  orphanTxs: TxItem[];
  onClose: () => void;
  onLink: (receiptId: string, txId: string) => void;
  onUnlink: (receiptId: string, txId: string) => void;
  onUpdateCategory: (receiptId: string, category: string) => void;
}) {
  const t = useTranslations('receipts');
  const { url } = useSignedUrl(receipt.file_path);
  const isPdf = (receipt.file_name || receipt.file_path || '').toLowerCase().endsWith('.pdf');
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const catLabel = CATEGORIES.find((c) => c.value === receipt.category)?.label;
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const filteredOrphans = orphanTxs.filter((tx) => {
    if (!txSearch) return true;
    const q = txSearch.toLowerCase();
    return (tx.description || '').toLowerCase().includes(q) || (tx.category || '').toLowerCase().includes(q) || (tx.vendor || '').toLowerCase().includes(q);
  });

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-tenir-50 flex items-center justify-center flex-shrink-0">
              <Receipt size={15} className="text-tenir-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{receipt.vendor || receipt.file_name || 'Receipt'}</p>
              <p className="text-xs text-gray-400 truncate">{receipt.file_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 ml-3">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Image panel */}
          <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-100 flex flex-col items-center justify-center p-5 gap-3">
            {isPdf ? (
              <>
                <div className="w-16 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <FileText size={28} className="text-gray-400" />
                </div>
                <span className="text-xs font-medium text-gray-500">PDF Document</span>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-tenir-600 hover:text-tenir-700 font-medium">
                    <ExternalLink size={11} /> Open PDF
                  </a>
                )}
              </>
            ) : url ? (
              <div className="w-full flex flex-col gap-3">
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                  <img
                    src={url}
                    alt="Receipt"
                    className="w-full object-contain max-h-72"
                    onError={(e) => {
                      e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-32 text-gray-400"><svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\'><line x1=\'2\' y1=\'2\' x2=\'22\' y2=\'22\'/><path d=\'M10.41 10.41a2 2 0 1 1-2.83-2.83\'/><line x1=\'13.5\' y1=\'6\' x2=\'6\' y2=\'13.5\'/><path d=\'M14.19 14.19A6 6 0 0 1 6 12\'/></svg></div>';
                    }}
                  />
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-tenir-600 hover:text-tenir-700 font-medium">
                  <ExternalLink size={11} /> Full size
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageOff size={28} className="text-gray-300" />
                <span className="text-xs">Preview unavailable</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Status row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={receipt.status === 'verified' ? 'success' : receipt.status === 'rejected' ? 'error' : 'warning'}>
                {receipt.status}
              </Badge>
              {receipt.transaction_id && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <Link2 size={10} /> Transaction linked
                </span>
              )}
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field icon={<Building2 size={12} />} label="Vendor"   value={receipt.vendor} />
              <Field icon={<DollarSign size={12} />} label="Amount"  value={receipt.amount != null ? formatCurrency(receipt.amount) : null} />
              <Field icon={<Calendar size={12} />}   label="Date"    value={receipt.date ? formatDate(receipt.date) : null} />
              <Field icon={<Tag size={12} />}         label="Category" value={catLabel || receipt.category} />
              {receipt.gst_amount != null && <Field icon={null} label="TPS / GST" value={formatCurrency(receipt.gst_amount)} />}
              {receipt.qst_amount != null && <Field icon={null} label="TVQ / QST" value={formatCurrency(receipt.qst_amount)} />}
              {receipt.tax_number  && <Field icon={null} label="Tax number" value={receipt.tax_number} />}
            </div>

            {/* Category picker if missing */}
            {!receipt.category && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 mb-2">No category — select one to create a transaction</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button key={cat.value} onClick={() => onUpdateCategory(receipt.id, cat.value)}
                      className="text-xs px-2.5 py-1 rounded-full border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Line items */}
            {receipt.ocr_data?.lineItems?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Line items</p>
                <div className="space-y-1 border border-gray-100 rounded-xl overflow-hidden">
                  {receipt.ocr_data.lineItems.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm px-3 py-2 border-b border-gray-50 last:border-0 odd:bg-white even:bg-gray-50/50">
                      <span className="text-gray-700">{item.description}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction section */}
            <div className="pt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('linkedTransaction')}</p>
              {linkedTx ? (
                <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{linkedTx.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{CATEGORIES.find(c => c.value === linkedTx.category)?.label || linkedTx.category} · {linkedTx.date}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(Math.abs(linkedTx.amount))}</span>
                    <button onClick={() => onUnlink(receipt.id, linkedTx.id)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium ml-2">
                      <Unlink size={11} /> Unlink
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button onClick={() => setShowLinkSearch((v) => !v)}
                    className="flex items-center gap-2 text-sm text-tenir-600 hover:text-tenir-700 font-medium">
                    <Link2 size={13} />
                    {showLinkSearch ? 'Cancel' : 'Link to an existing transaction'}
                    <ChevronRight size={11} className={cn('transition-transform', showLinkSearch && 'rotate-90')} />
                  </button>
                  {showLinkSearch && (
                    <div className="mt-3 space-y-2">
                      <div className="relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input autoFocus value={txSearch} onChange={(e) => setTxSearch(e.target.value)}
                          placeholder="Search transactions…"
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400 bg-gray-50" />
                      </div>
                      {filteredOrphans.length === 0 ? (
                        <p className="text-xs text-gray-400 py-3 text-center">No unlinked transactions</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-xl overflow-hidden p-1">
                          {filteredOrphans.map((tx) => (
                            <button key={tx.id}
                              onClick={() => { onLink(receipt.id, tx.id); setShowLinkSearch(false); }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-tenir-50 transition-colors text-left">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{tx.category} · {tx.date}</p>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 ml-3 flex-shrink-0">{formatCurrency(Math.abs(tx.amount))}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">{icon}{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || <span className="text-gray-300 font-normal">—</span>}</p>
    </div>
  );
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────

function DropzoneArea({ orgId, userId, onReceiptCreated }: {
  orgId: string; userId: string;
  onReceiptCreated: (receipt: ReceiptItem) => Promise<void>;
}) {
  const t = useTranslations('receipts');
  const supabase = createClient();
  const [queue, setQueue] = useState<{ id: string; name: string; status: UploadStatus; msg?: string }[]>([]);

  const setItemStatus = (tempId: string, status: UploadStatus, msg?: string) =>
    setQueue((p) => p.map((q) => q.id === tempId ? { ...q, status, msg } : q));

  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      const tempId = Math.random().toString(36).slice(2);
      setQueue((p) => [...p, { id: tempId, name: file.name, status: 'uploading' }]);

      try {
        // 1. Upload file
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        uploadForm.append('orgId', orgId);
        uploadForm.append('userId', userId);
        const uploadRes = await fetch('/api/receipts/upload', { method: 'POST', body: uploadForm });
        if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || 'Upload failed');
        const { path: filePath } = await uploadRes.json();

        setItemStatus(tempId, 'processing');

        // 2. OCR
        let ocr: any = null;
        try {
          const ocrForm = new FormData();
          ocrForm.append('file', file);
          const ocrRes = await fetch('/api/receipts/ocr', { method: 'POST', body: ocrForm });
          if (ocrRes.ok) ocr = await ocrRes.json();
        } catch { /* OCR optional */ }

        const category = normalizeOcrCategory(ocr?.category);

        // 3. Insert receipt
        const { data: receipt, error: insertErr } = await (supabase as any)
          .from('receipts')
          .insert({
            organization_id: orgId,
            uploaded_by: userId,
            file_path: filePath,
            file_name: file.name,
            vendor: ocr?.vendorName || null,
            amount: ocr?.totalAmount || null,
            currency: 'CAD',
            date: ocr?.date || null,
            gst_amount: ocr?.gst || null,
            qst_amount: ocr?.qst || null,
            tax_number: ocr?.taxNumbers?.[0] || null,
            category,
            status: ocr?.totalAmount ? 'verified' : 'pending',
            ocr_data: ocr || null,
            source: 'upload',
          })
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);

        setItemStatus(tempId, 'creating');
        await onReceiptCreated(receipt);
        const label = [
          receipt.vendor,
          ocr?.totalAmount ? formatCurrency(ocr.totalAmount) : null,
          category && category !== 'other' ? category : null,
        ].filter(Boolean).join(' · ');
        setItemStatus(tempId, 'done', label || 'Receipt saved — transaction created');
      } catch (e: any) {
        setItemStatus(tempId, 'error', e.message || 'Error');
      }
    }
  }, [orgId, userId, onReceiptCreated]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div>
      <div {...getRootProps()} className={cn(
        'border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
        isDragActive ? 'border-tenir-500 bg-tenir-50' : 'border-gray-200 hover:border-tenir-300 hover:bg-gray-50 bg-white'
      )}>
        <input {...getInputProps()} />
        <div className={cn('w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors', isDragActive ? 'bg-tenir-100' : 'bg-gray-100')}>
          <Cloud size={22} className={isDragActive ? 'text-tenir-600' : 'text-gray-400'} />
        </div>
        <p className="font-semibold text-gray-800 mb-1">{isDragActive ? t('dropToUpload') : t('upload')}</p>
        <p className="text-sm text-gray-400 mb-1">{t('dragAndDrop')}</p>
        <p className="text-xs text-gray-300">{t('fileTypes')}</p>
      </div>

      {queue.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-100 text-sm">
              <FileText size={14} className="text-gray-400 shrink-0" />
              <span className="flex-1 truncate text-gray-700 text-xs">{item.name}</span>
              {item.status === 'uploading'  && <span className="text-xs text-blue-500 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> {t('uploading')}</span>}
              {item.status === 'processing' && <span className="text-xs text-amber-500 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> {t('scanning')}</span>}
              {item.status === 'creating'   && <span className="text-xs text-tenir-500 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> {t('creatingTransaction')}</span>}
              {item.status === 'done'       && <span className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle size={13} />{item.msg || '✓'}</span>}
              {item.status === 'error'      && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{item.msg}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReceiptsPage() {
  const t = useTranslations('receipts');
  const commonT = useTranslations('common');
  const { orgId, user, loading: orgLoading } = useOrganization();
  const supabase = createClient();

  const [receipts, setReceipts]         = useState<ReceiptItem[]>([]);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [dataLoading, setDataLoading]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [dateRange, setDateRange]       = useState({ start: '', end: '' });
  const [detailReceipt, setDetailReceipt]     = useState<ReceiptItem | null>(null);
  const [categoryReceipt, setCategoryReceipt] = useState<ReceiptItem | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!orgId) return;
    setDataLoading(true);
    const [rRes, tRes] = await Promise.all([
      (supabase as any).from('receipts').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      (supabase as any).from('transactions').select('id,description,amount,date,category,type,receipt_id,vendor').eq('organization_id', orgId).order('date', { ascending: false }),
    ]);

    const txList: TxItem[] = tRes.data || [];
    const txByReceipt: Record<string, TxItem> = {};
    txList.forEach((tx) => { if (tx.receipt_id) txByReceipt[tx.receipt_id] = tx; });

    setReceipts((rRes.data || []).map((r: ReceiptItem) => ({ ...r, transaction_id: txByReceipt[r.id]?.id ?? null })));
    setTransactions(txList);
    setDataLoading(false);
  }, [orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Transaction helpers ───────────────────────────────────────────────────

  /**
   * Try to find a matching transaction (same org, similar amount and date).
   * Returns the tx if a close match is found.
   */
  function findMatchingTx(receipt: ReceiptItem): TxItem | null {
    if (!receipt.amount && !receipt.date) return null;
    return transactions.find((tx) => {
      if (tx.receipt_id) return false; // already linked
      if (tx.type !== 'expense') return false;
      const amountMatch = receipt.amount != null && Math.abs(Math.abs(tx.amount) - receipt.amount) < 0.02;
      const dateMatch   = receipt.date && tx.date === receipt.date;
      const vendorMatch = receipt.vendor && tx.vendor && receipt.vendor.toLowerCase() === tx.vendor.toLowerCase();
      // Strong match: amount + date, or vendor + date
      return (amountMatch && dateMatch) || (vendorMatch && dateMatch);
    }) ?? null;
  }

  /**
   * Always try to create or link a transaction for a receipt.
   * - If a matching transaction already exists, link it.
   * - Otherwise create a new one using whatever info is available,
   *   filling gaps with sensible defaults.
   */
  const ensureTransaction = useCallback(async (receipt: ReceiptItem, overrideCategory?: string) => {
    if (!orgId || !user) return;

    const category    = overrideCategory || receipt.category || 'other';
    const amount      = receipt.amount ?? 0;
    const date        = receipt.date || receipt.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
    const description = receipt.vendor || receipt.file_name?.replace(/\.[^.]+$/, '') || 'Receipt';

    // 1. Try to find and link an existing match
    const match = findMatchingTx({ ...receipt, category });
    if (match) {
      await (supabase as any).from('transactions').update({ receipt_id: receipt.id }).eq('id', match.id);
      await (supabase as any).from('receipts').update({ category, status: 'verified', transaction_id: match.id }).eq('id', receipt.id);
      setTransactions((prev) => prev.map((tx) => tx.id === match.id ? { ...tx, receipt_id: receipt.id } : tx));
      setReceipts((prev) => prev.map((r) => r.id === receipt.id ? { ...r, category, status: 'verified', transaction_id: match.id } : r));
      if (detailReceipt?.id === receipt.id) setDetailReceipt((r) => r ? { ...r, category, status: 'verified', transaction_id: match.id } : r);
      return;
    }

    // 2. Create a new transaction
    const { data: tx, error: txErr } = await (supabase as any)
      .from('transactions')
      .insert({
        organization_id: orgId,
        created_by: user.id,
        type: 'expense',
        amount: amount > 0 ? -amount : amount === 0 ? 0 : amount,
        date,
        description,
        category,
        vendor: receipt.vendor || null,
        receipt_id: receipt.id,
        currency: 'CAD',
        is_recurring: false,
      })
      .select()
      .single();

    if (txErr) {
      console.error('[ensureTransaction] insert error:', txErr.message);
      return;
    }

    // Update receipt with transaction link + verified status
    await (supabase as any)
      .from('receipts')
      .update({ category, status: 'verified', transaction_id: tx.id })
      .eq('id', receipt.id);

    setTransactions((prev) => [...prev, tx]);
    setReceipts((prev) => prev.map((r) => r.id === receipt.id ? { ...r, category, status: 'verified', transaction_id: tx.id } : r));
    if (detailReceipt?.id === receipt.id) setDetailReceipt((r) => r ? { ...r, category, status: 'verified', transaction_id: tx.id } : r);
  }, [orgId, user, transactions, detailReceipt]);

  // Called when a new receipt arrives from the dropzone
  const handleReceiptCreated = useCallback(async (receipt: ReceiptItem): Promise<void> => {
    setReceipts((prev) => [receipt, ...prev]);
    if (receipt.category) {
      // Category known from OCR — auto-create/link transaction immediately
      await ensureTransaction(receipt);
    } else {
      // Ask user for category then create
      setCategoryReceipt(receipt);
    }
  }, [ensureTransaction]);

  const handleCategoryConfirm = async (receipt: ReceiptItem, category: string) => {
    setCategoryReceipt(null);
    await ensureTransaction(receipt, category);
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('receipts').delete().eq('id', id);
    setReceipts((p) => p.filter((r) => r.id !== id));
  };

  const handleLink = async (receiptId: string, txId: string) => {
    await (supabase as any).from('transactions').update({ receipt_id: receiptId }).eq('id', txId);
    setTransactions((prev) => prev.map((tx) => tx.id === txId ? { ...tx, receipt_id: receiptId } : tx));
    setReceipts((prev) => prev.map((r) => r.id === receiptId ? { ...r, transaction_id: txId } : r));
    if (detailReceipt?.id === receiptId) setDetailReceipt((r) => r ? { ...r, transaction_id: txId } : r);
  };

  const handleUnlink = async (receiptId: string, txId: string) => {
    await (supabase as any).from('transactions').update({ receipt_id: null }).eq('id', txId);
    setTransactions((prev) => prev.map((tx) => tx.id === txId ? { ...tx, receipt_id: null } : tx));
    setReceipts((prev) => prev.map((r) => r.id === receiptId ? { ...r, transaction_id: null } : r));
    if (detailReceipt?.id === receiptId) setDetailReceipt((r) => r ? { ...r, transaction_id: null } : r);
  };

  const handleUpdateCategory = async (receiptId: string, category: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;
    setReceipts((prev) => prev.map((r) => r.id === receiptId ? { ...r, category } : r));
    if (detailReceipt?.id === receiptId) setDetailReceipt((r) => r ? { ...r, category } : r);
    await ensureTransaction({ ...receipt, category }, category);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = receipts.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const d = r.date || r.created_at?.split('T')[0] || '';
    if (dateRange.start && d < dateRange.start) return false;
    if (dateRange.end && d > dateRange.end) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (r.vendor || '').toLowerCase().includes(q) ||
        (r.file_name || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  const totalAmount   = filtered.reduce((s, r) => s + (r.amount ?? 0), 0);
  const verifiedCount = filtered.filter((r) => r.status === 'verified').length;
  const linkedCount   = filtered.filter((r) => r.transaction_id).length;
  const pendingCount  = filtered.filter((r) => r.status === 'pending').length;

  const linkedTx   = detailReceipt?.transaction_id ? transactions.find((tx) => tx.id === detailReceipt.transaction_id) ?? null : null;
  const orphanTxs  = transactions.filter((tx) => !tx.receipt_id && tx.type === 'expense');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />
      <div className="flex-1 overflow-y-auto bg-gray-50/40">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {/* Upload */}
          <div className="mb-6">
            {!orgLoading && orgId && user ? (
              <DropzoneArea orgId={orgId} userId={user.id} onReceiptCreated={handleReceiptCreated} />
            ) : (
              <div className="border-2 border-dashed rounded-2xl p-10 text-center border-gray-200 bg-white">
                <Cloud size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-400 text-sm">{commonT('loading')}</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: t('totalAmount'), value: formatCurrency(totalAmount), color: 'text-gray-900' },
              { label: t('title'),       value: String(filtered.length),     color: 'text-gray-900' },
              { label: t('verified'),    value: String(verifiedCount),       color: 'text-emerald-600' },
              { label: t('linked'),      value: String(linkedCount),         color: 'text-tenir-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Pending banner */}
          {pendingCount > 0 && !categoryReceipt && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
              <span className="text-amber-800">
                <strong>{pendingCount}</strong> receipt{pendingCount > 1 ? 's need' : ' needs'} review — click to categorize and create transactions.
              </span>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" placeholder={commonT('search')} value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400 bg-gray-50 focus:bg-white transition-all" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400">
              <option value="all">{t('allStatuses')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="verified">{t('verified')}</option>
              <option value="rejected">{t('rejected')}</option>
            </select>
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400" />
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400" />
          </div>

          {/* Grid */}
          {dataLoading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 size={22} className="text-gray-300 animate-spin" />
              <p className="text-sm text-gray-400">{commonT('loading')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 bg-white rounded-2xl border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Receipt size={22} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">{receipts.length === 0 ? t('noReceipts') : commonT('noResults')}</p>
              {receipts.length === 0 && <p className="text-xs text-gray-400">Upload a receipt above to get started</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((r) => (
                <ReceiptCard key={r.id} receipt={r} onDelete={handleDelete} onClick={setDetailReceipt} />
              ))}
            </div>
          )}
        </div>
      </div>

      {categoryReceipt && (
        <CategoryPickerModal
          receipt={categoryReceipt}
          onConfirm={handleCategoryConfirm}
          onSkip={() => setCategoryReceipt(null)}
        />
      )}

      {detailReceipt && (
        <ReceiptDetailModal
          receipt={detailReceipt}
          linkedTx={linkedTx}
          orphanTxs={orphanTxs}
          onClose={() => setDetailReceipt(null)}
          onLink={handleLink}
          onUnlink={handleUnlink}
          onUpdateCategory={handleUpdateCategory}
        />
      )}
    </div>
  );
}
