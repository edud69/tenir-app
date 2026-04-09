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
  // joined
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
}

type UploadStatus = 'uploading' | 'processing' | 'done' | 'error';

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useSignedUrl(filePath: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    (supabase.storage as any)
      .from('receipts')
      .createSignedUrl(filePath, 3600)
      .then(({ data }: any) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      })
      .finally(() => setLoading(false));
  }, [filePath]);

  return { url, loading };
}

// ─── Receipt Thumbnail ────────────────────────────────────────────────────────

function ReceiptThumbnail({ filePath, fileName, className }: { filePath: string | null; fileName: string | null; className?: string }) {
  const { url, loading } = useSignedUrl(filePath);
  const isPdf = fileName?.toLowerCase().endsWith('.pdf');

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-50', className)}>
        <Loader2 size={20} className="text-gray-300 animate-spin" />
      </div>
    );
  }

  if (isPdf && url) {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-gray-50 gap-2', className)}>
        <FileText size={28} className="text-gray-400" />
        <span className="text-xs text-gray-400 font-medium">PDF</span>
      </div>
    );
  }

  if (url) {
    return (
      <img
        src={url}
        alt={fileName || 'Receipt'}
        className={cn('object-cover w-full h-full', className)}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <div className={cn('flex items-center justify-center bg-gray-50', className)}>
      <ImageOff size={20} className="text-gray-300" />
    </div>
  );
}

// ─── Receipt Card ─────────────────────────────────────────────────────────────

function ReceiptCard({
  receipt, onDelete, onClick,
}: {
  receipt: ReceiptItem;
  onDelete: (id: string) => void;
  onClick: (r: ReceiptItem) => void;
}) {
  const t = useTranslations('receipts');
  const statusVariant = { verified: 'success' as const, pending: 'warning' as const, rejected: 'error' as const };
  const statusLabel  = { verified: t('verified'), pending: t('pending'), rejected: t('rejected') };
  const catLabel = CATEGORIES.find((c) => c.value === receipt.category)?.label;

  return (
    <div
      onClick={() => onClick(receipt)}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-50 overflow-hidden cursor-pointer hover:border-tenir-200 hover:shadow-md hover:shadow-tenir-50 transition-all duration-150"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gray-50 overflow-hidden">
        <ReceiptThumbnail filePath={receipt.file_path} fileName={receipt.file_name} className="h-40" />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-xs font-semibold text-gray-700 px-2.5 py-1 rounded-full shadow">
            View details
          </span>
        </div>
        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(receipt.id); }}
          className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
        >
          <X size={12} />
        </button>
        {/* Transaction linked badge */}
        {receipt.transaction_id && (
          <div className="absolute bottom-2 left-2">
            <span className="flex items-center gap-1 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              <Link2 size={9} /> Linked
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
          <Badge variant={statusVariant[receipt.status]} size="sm">{statusLabel[receipt.status]}</Badge>
        </div>

        {catLabel && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full mb-2">
            <Tag size={9} /> {catLabel}
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

function CategoryPickerModal({
  receipt,
  onConfirm,
  onSkip,
}: {
  receipt: ReceiptItem;
  onConfirm: (receipt: ReceiptItem, category: string) => void;
  onSkip: (receipt: ReceiptItem) => void;
}) {
  const [selected, setSelected] = useState<string>('');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Tag size={16} className="text-amber-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Categorize receipt</h3>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            AI couldn't determine the category for <strong>{receipt.vendor || receipt.file_name}</strong>. Pick one to auto-create the transaction.
          </p>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelected(cat.value)}
              className={cn(
                'text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                selected === cat.value
                  ? 'border-tenir-400 bg-tenir-50 text-tenir-700'
                  : 'border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3">
          <Button variant="ghost" size="sm" onClick={() => onSkip(receipt)} className="flex-1">
            Skip — save as pending
          </Button>
          <Button
            variant="primary" size="sm"
            disabled={!selected}
            onClick={() => selected && onConfirm(receipt, selected)}
            className="flex-1"
          >
            Create transaction
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Detail Modal ─────────────────────────────────────────────────────

function ReceiptDetailModal({
  receipt,
  linkedTx,
  orphanTxs,
  onClose,
  onLink,
  onUnlink,
  onUpdateCategory,
}: {
  receipt: ReceiptItem;
  linkedTx: TxItem | null;
  orphanTxs: TxItem[];
  onClose: () => void;
  onLink: (receiptId: string, txId: string) => void;
  onUnlink: (receiptId: string, txId: string) => void;
  onUpdateCategory: (receiptId: string, category: string) => void;
}) {
  const { url } = useSignedUrl(receipt.file_path);
  const isPdf = receipt.file_name?.toLowerCase().endsWith('.pdf');
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const catLabel = CATEGORIES.find((c) => c.value === receipt.category)?.label;

  const filteredOrphans = orphanTxs.filter((tx) => {
    if (!txSearch) return true;
    const q = txSearch.toLowerCase();
    return tx.description?.toLowerCase().includes(q) || tx.category?.toLowerCase().includes(q);
  });

  // Close on backdrop
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-tenir-50 flex items-center justify-center">
              <Receipt size={16} className="text-tenir-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {receipt.vendor || receipt.file_name || 'Receipt details'}
              </h3>
              <p className="text-xs text-gray-400">{receipt.file_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Image panel */}
          <div className="w-72 flex-shrink-0 bg-gray-50 border-r border-gray-100 flex flex-col items-center justify-center p-4 gap-3">
            {isPdf ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <FileText size={32} className="text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-600">PDF Document</span>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-tenir-600 hover:text-tenir-700 font-medium">
                    <ExternalLink size={12} /> Open PDF
                  </a>
                )}
              </div>
            ) : url ? (
              <div className="w-full">
                <img
                  src={url}
                  alt="Receipt"
                  className="w-full rounded-xl object-contain max-h-80 shadow-sm border border-gray-100"
                />
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs text-tenir-600 hover:text-tenir-700 font-medium">
                  <ExternalLink size={12} /> Open full size
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageOff size={32} className="text-gray-300" />
                <span className="text-xs">Preview unavailable</span>
              </div>
            )}
          </div>

          {/* Details panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge
                variant={receipt.status === 'verified' ? 'success' : receipt.status === 'rejected' ? 'error' : 'warning'}
              >
                {receipt.status}
              </Badge>
              {receipt.transaction_id && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <Link2 size={10} /> Transaction linked
                </span>
              )}
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-4">
              <Field icon={<Building2 size={13} />} label="Vendor" value={receipt.vendor} />
              <Field icon={<DollarSign size={13} />} label="Amount" value={receipt.amount != null ? formatCurrency(receipt.amount) : null} />
              <Field icon={<Calendar size={13} />} label="Date" value={receipt.date ? formatDate(receipt.date) : null} />
              <Field icon={<Tag size={13} />} label="Category" value={catLabel || receipt.category} />
              {receipt.gst_amount != null && <Field icon={null} label="TPS/GST" value={formatCurrency(receipt.gst_amount)} />}
              {receipt.qst_amount != null && <Field icon={null} label="TVQ/QST" value={formatCurrency(receipt.qst_amount)} />}
              {receipt.tax_number && <Field icon={null} label="Tax number" value={receipt.tax_number} />}
            </div>

            {/* Category picker if missing */}
            {!receipt.category && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 mb-2">No category assigned</p>
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

            {/* OCR line items */}
            {receipt.ocr_data?.lineItems?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Line items</p>
                <div className="space-y-1">
                  {receipt.ocr_data.lineItems.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-700">{item.description}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction link section */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Transaction</p>
              {linkedTx ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{linkedTx.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(linkedTx.amount)} · {linkedTx.date}</p>
                  </div>
                  <button
                    onClick={() => onUnlink(receipt.id, linkedTx.id)}
                    className="ml-3 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium flex-shrink-0"
                  >
                    <Unlink size={12} /> Unlink
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setShowLinkSearch((v) => !v)}
                    className="flex items-center gap-2 text-sm text-tenir-600 hover:text-tenir-700 font-medium transition-colors"
                  >
                    <Link2 size={14} />
                    {showLinkSearch ? 'Cancel' : 'Link to an existing transaction'}
                    <ChevronRight size={12} className={cn('transition-transform', showLinkSearch && 'rotate-90')} />
                  </button>

                  {showLinkSearch && (
                    <div className="mt-3 space-y-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          autoFocus
                          value={txSearch}
                          onChange={(e) => setTxSearch(e.target.value)}
                          placeholder="Search transactions…"
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400"
                        />
                      </div>
                      {filteredOrphans.length === 0 ? (
                        <p className="text-xs text-gray-400 py-3 text-center">No unlinked transactions found</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {filteredOrphans.map((tx) => (
                            <button
                              key={tx.id}
                              onClick={() => { onLink(receipt.id, tx.id); setShowLinkSearch(false); }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-100 hover:border-tenir-200 hover:bg-tenir-50/30 transition-all text-left"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{tx.category} · {tx.date}</p>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 ml-3 flex-shrink-0">{formatCurrency(tx.amount)}</span>
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
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">{icon}{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || <span className="text-gray-300 font-normal">—</span>}</p>
    </div>
  );
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────

function DropzoneArea({
  orgId, userId,
  onReceiptCreated,
}: {
  orgId: string;
  userId: string;
  onReceiptCreated: (receipt: ReceiptItem) => void;
}) {
  const supabase = createClient();
  const [queue, setQueue] = useState<{ id: string; name: string; status: UploadStatus; error?: string }[]>([]);

  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      const tempId = Math.random().toString(36).slice(2);
      setQueue((p) => [...p, { id: tempId, name: file.name, status: 'uploading' }]);

      try {
        // 1. Upload
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        uploadForm.append('orgId', orgId);
        uploadForm.append('userId', userId);
        const uploadRes = await fetch('/api/receipts/upload', { method: 'POST', body: uploadForm });
        if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || 'Upload failed');
        const { path: filePath } = await uploadRes.json();

        setQueue((p) => p.map((q) => q.id === tempId ? { ...q, status: 'processing' } : q));

        // 2. OCR
        let ocrResult: any = null;
        try {
          const ocrForm = new FormData();
          ocrForm.append('file', file);
          const ocrRes = await fetch('/api/receipts/ocr', { method: 'POST', body: ocrForm });
          if (ocrRes.ok) ocrResult = await ocrRes.json();
        } catch { /* OCR optional */ }

        const normalizedCategory = normalizeOcrCategory(ocrResult?.category);

        // 3. Insert receipt
        const { data: receipt, error: insertError } = await (supabase as any)
          .from('receipts')
          .insert({
            organization_id: orgId,
            uploaded_by: userId,
            file_path: filePath,
            file_name: file.name,
            vendor: ocrResult?.vendorName || null,
            amount: ocrResult?.totalAmount || null,
            currency: 'CAD',
            date: ocrResult?.date || null,
            gst_amount: ocrResult?.gst || null,
            qst_amount: ocrResult?.qst || null,
            tax_number: ocrResult?.taxNumbers?.[0] || null,
            category: normalizedCategory,
            description: null,
            status: ocrResult?.totalAmount ? 'verified' : 'pending',
            ocr_data: ocrResult || null,
            source: 'upload',
          })
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);

        setQueue((p) => p.map((q) => q.id === tempId ? { ...q, status: 'done' } : q));
        onReceiptCreated(receipt);
      } catch (e: any) {
        setQueue((p) => p.map((q) => q.id === tempId ? { ...q, status: 'error', error: e.message } : q));
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
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
          isDragActive
            ? 'border-tenir-500 bg-tenir-50'
            : 'border-gray-200 hover:border-tenir-300 hover:bg-gray-50 bg-white'
        )}
      >
        <input {...getInputProps()} />
        <div className={cn('w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors', isDragActive ? 'bg-tenir-100' : 'bg-gray-100')}>
          <Cloud size={22} className={isDragActive ? 'text-tenir-600' : 'text-gray-400'} />
        </div>
        <p className="font-semibold text-gray-800 mb-1">
          {isDragActive ? 'Drop to upload' : 'Upload receipts'}
        </p>
        <p className="text-sm text-gray-400 mb-1">Drag & drop, or click to browse</p>
        <p className="text-xs text-gray-300">PDF, JPG, PNG · max 10 MB</p>
      </div>

      {queue.length > 0 && (
        <div className="mt-3 space-y-2">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 text-sm">
              <FileText size={15} className="text-gray-400 shrink-0" />
              <span className="flex-1 truncate text-gray-700 text-xs">{item.name}</span>
              {item.status === 'uploading'   && <span className="text-xs text-blue-500 animate-pulse flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Uploading…</span>}
              {item.status === 'processing'  && <span className="text-xs text-amber-500 animate-pulse flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Analysing…</span>}
              {item.status === 'done'        && <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />}
              {item.status === 'error'       && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={13} /> {item.error || 'Error'}</span>}
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

  const [receipts, setReceipts]       = useState<ReceiptItem[]>([]);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [dateRange, setDateRange]       = useState({ start: '', end: '' });

  // Modals
  const [detailReceipt, setDetailReceipt]     = useState<ReceiptItem | null>(null);
  const [categoryReceipt, setCategoryReceipt] = useState<ReceiptItem | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!orgId) return;
    setDataLoading(true);
    const [receiptsRes, txRes] = await Promise.all([
      (supabase as any).from('receipts').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      (supabase as any).from('transactions').select('id,description,amount,date,category,type,receipt_id').eq('organization_id', orgId).order('date', { ascending: false }),
    ]);

    const txList: TxItem[] = txRes.data || [];
    const txByReceiptId: Record<string, TxItem> = {};
    txList.forEach((tx) => { if (tx.receipt_id) txByReceiptId[tx.receipt_id] = tx; });

    const enrichedReceipts: ReceiptItem[] = (receiptsRes.data || []).map((r: ReceiptItem) => ({
      ...r,
      transaction_id: txByReceiptId[r.id]?.id ?? null,
    }));

    setReceipts(enrichedReceipts);
    setTransactions(txList);
    setDataLoading(false);
  }, [orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Transaction helpers ───────────────────────────────────────────────────

  const createTransactionForReceipt = useCallback(async (receipt: ReceiptItem, category: string) => {
    if (!orgId) return;
    const { data: tx } = await (supabase as any)
      .from('transactions')
      .insert({
        organization_id: orgId,
        type: 'expense',
        amount: receipt.amount,
        date: receipt.date || receipt.created_at?.split('T')[0],
        description: receipt.vendor || receipt.file_name || 'Receipt',
        category,
        vendor: receipt.vendor,
        gst_amount: receipt.gst_amount,
        qst_amount: receipt.qst_amount,
        receipt_id: receipt.id,
        currency: 'CAD',
      })
      .select()
      .single();

    // Update receipt category & status
    await (supabase as any).from('receipts').update({ category, status: 'verified' }).eq('id', receipt.id);

    setReceipts((prev) => prev.map((r) => r.id === receipt.id ? { ...r, category, status: 'verified', transaction_id: tx?.id } : r));
    if (tx) setTransactions((prev) => [...prev, tx]);
  }, [orgId]);

  // Called when a new receipt is created via dropzone
  const handleReceiptCreated = useCallback(async (receipt: ReceiptItem) => {
    const hasRequired = !!(receipt.vendor && receipt.amount && receipt.date);
    if (!hasRequired) {
      // Just add to list as pending
      setReceipts((prev) => [receipt, ...prev]);
      return;
    }
    if (receipt.category) {
      // Auto-create transaction
      setReceipts((prev) => [receipt, ...prev]);
      await createTransactionForReceipt(receipt, receipt.category);
    } else {
      // Ask for category
      setReceipts((prev) => [receipt, ...prev]);
      setCategoryReceipt(receipt);
    }
  }, [createTransactionForReceipt]);

  const handleCategoryConfirm = async (receipt: ReceiptItem, category: string) => {
    setCategoryReceipt(null);
    await createTransactionForReceipt(receipt, category);
  };

  const handleCategorySkip = (receipt: ReceiptItem) => {
    setCategoryReceipt(null);
    // Receipt stays as pending — no transaction created
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
    await (supabase as any).from('receipts').update({ category }).eq('id', receiptId);
    setReceipts((prev) => prev.map((r) => r.id === receiptId ? { ...r, category } : r));
    if (detailReceipt?.id === receiptId) setDetailReceipt((r) => r ? { ...r, category } : r);
    // Auto-create transaction if receipt has required fields and no linked tx
    const receipt = receipts.find((r) => r.id === receiptId);
    if (receipt && !receipt.transaction_id && receipt.vendor && receipt.amount && receipt.date) {
      await createTransactionForReceipt({ ...receipt, category }, category);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

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

  const totalAmount     = filtered.reduce((s, r) => s + (r.amount ?? 0), 0);
  const verifiedCount   = filtered.filter((r) => r.status === 'verified').length;
  const linkedCount     = filtered.filter((r) => r.transaction_id).length;
  const pendingCount    = filtered.filter((r) => r.status === 'pending').length;

  const linkedTx = detailReceipt?.transaction_id
    ? transactions.find((tx) => tx.id === detailReceipt.transaction_id) ?? null
    : null;
  const orphanTxs = transactions.filter((tx) => !tx.receipt_id && tx.type === 'expense');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />
      <div className="flex-1 overflow-y-auto bg-gray-50/40">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {/* Upload zone */}
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total amount',  value: formatCurrency(totalAmount), color: 'text-gray-900' },
              { label: t('title'),      value: filtered.length,  color: 'text-gray-900' },
              { label: t('verified'),   value: verifiedCount,    color: 'text-emerald-600' },
              { label: 'Linked',        value: linkedCount,      color: 'text-tenir-600' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Pending category banner */}
          {pendingCount > 0 && !categoryReceipt && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm">
              <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
              <span className="text-amber-800">
                <strong>{pendingCount}</strong> receipt{pendingCount > 1 ? 's' : ''} pending categorization. Click to review.
              </span>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={commonT('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400 bg-gray-50 focus:bg-white transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400 bg-gray-50 text-gray-700"
            >
              <option value="all">All statuses</option>
              <option value="pending">{t('pending')}</option>
              <option value="verified">{t('verified')}</option>
              <option value="rejected">{t('rejected')}</option>
            </select>
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400 bg-gray-50 text-gray-700" />
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tenir-400/30 focus:border-tenir-400 bg-gray-50 text-gray-700" />
          </div>

          {/* Grid */}
          {dataLoading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 size={24} className="text-gray-300 animate-spin" />
              <p className="text-sm text-gray-400">{commonT('loading')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 bg-white rounded-2xl border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Receipt size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">{receipts.length === 0 ? t('noReceipts') : commonT('noResults')}</p>
              {receipts.length === 0 && (
                <p className="text-xs text-gray-400">Upload a receipt above to get started</p>
              )}
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

      {/* Category picker modal */}
      {categoryReceipt && (
        <CategoryPickerModal
          receipt={categoryReceipt}
          onConfirm={handleCategoryConfirm}
          onSkip={handleCategorySkip}
        />
      )}

      {/* Detail modal */}
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
