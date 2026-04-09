'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDropzone } from 'react-dropzone';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CheckCircle, AlertCircle, Cloud, FileText, Receipt, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

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
}

type UploadStatus = 'uploading' | 'processing' | 'done' | 'error';

function ReceiptCard({ receipt, onDelete }: { receipt: ReceiptItem; onDelete: (id: string) => void }) {
  const t = useTranslations('receipts');
  const statusConfig = {
    verified: { variant: 'success' as const, icon: CheckCircle, label: t('verified') },
    pending: { variant: 'warning' as const, icon: AlertCircle, label: t('pending') },
    rejected: { variant: 'error' as const, icon: AlertCircle, label: t('rejected') },
  };
  const config = statusConfig[receipt.status] || statusConfig.pending;

  return (
    <Card shadow="sm" className="bg-white overflow-hidden flex flex-col group">
      <div className="w-full h-36 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative">
        <Receipt size={36} className="text-gray-300" />
        <button
          onClick={() => onDelete(receipt.id)}
          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
        >
          <X size={14} />
        </button>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 truncate">{receipt.file_name || '—'}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
              {receipt.vendor || <span className="text-gray-400 italic">{t('pending')}</span>}
            </p>
          </div>
          <Badge variant={config.variant} size="sm" className="ml-2 shrink-0">{config.label}</Badge>
        </div>
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <span className="text-lg font-bold text-gray-900">
            {receipt.amount != null ? formatCurrency(receipt.amount) : '—'}
          </span>
          <span className="text-xs text-gray-400">
            {receipt.date ? formatDate(receipt.date) : receipt.created_at?.split('T')[0]}
          </span>
        </div>
        {(receipt.gst_amount != null || receipt.qst_amount != null) && (
          <div className="mt-2 flex gap-3 text-xs text-gray-500">
            {receipt.gst_amount != null && <span>TPS: {formatCurrency(receipt.gst_amount)}</span>}
            {receipt.qst_amount != null && <span>TVQ: {formatCurrency(receipt.qst_amount)}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

function DropzoneArea({ orgId, userId, onUploaded }: { orgId: string; userId: string; onUploaded: () => void }) {
  const t = useTranslations('receipts');
  const supabase = createClient();
  const [queue, setQueue] = useState<{ id: string; name: string; status: UploadStatus; error?: string }[]>([]);

  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      const tempId = Math.random().toString(36).slice(2);
      setQueue((p) => [...p, { id: tempId, name: file.name, status: 'uploading' }]);

      try {
        // 1. Upload via server-side API (uses service role key)
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        uploadForm.append('orgId', orgId);
        uploadForm.append('userId', userId);

        const uploadRes = await fetch('/api/receipts/upload', { method: 'POST', body: uploadForm });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Upload failed');
        }
        const { path: filePath } = await uploadRes.json();

        setQueue((p) => p.map((q) => q.id === tempId ? { ...q, status: 'processing' } : q));

        // 2. Try OCR
        let ocrResult: any = null;
        try {
          const ocrForm = new FormData();
          ocrForm.append('file', file);
          const ocrRes = await fetch('/api/receipts/ocr', { method: 'POST', body: ocrForm });
          if (ocrRes.ok) ocrResult = await ocrRes.json();
        } catch { /* OCR optional */ }

        // 3. Insert into DB
        const { error: insertError } = await (supabase as any).from('receipts').insert({
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
          category: ocrResult?.category || null,
          description: null,
          status: ocrResult?.totalAmount ? 'verified' : 'pending',
          ocr_data: ocrResult || null,
          source: 'upload',
        });

        if (insertError) throw new Error(insertError.message);

        setQueue((p) => p.map((q) => q.id === tempId ? { ...q, status: 'done' } : q));
        onUploaded();
      } catch (e: any) {
        setQueue((p) => p.map((q) => q.id === tempId ? { ...q, status: 'error', error: e.message } : q));
      }
    }
  }, [orgId, userId, onUploaded]);

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
          'border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer',
          isDragActive ? 'border-tenir-500 bg-tenir-50' : 'border-gray-200 hover:border-tenir-300 hover:bg-gray-50 bg-white'
        )}
      >
        <input {...getInputProps()} />
        <Cloud size={40} className={cn('mx-auto mb-3', isDragActive ? 'text-tenir-500' : 'text-gray-300')} />
        <p className="font-semibold text-gray-700 mb-1">{t('upload')}</p>
        <p className="text-sm text-gray-400 mb-1">{t('uploadDescription')}</p>
        <p className="text-xs text-gray-300">{t('supportedFormats')}</p>
      </div>

      {queue.length > 0 && (
        <div className="mt-3 space-y-2">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 text-sm">
              <FileText size={16} className="text-gray-400 shrink-0" />
              <span className="flex-1 truncate text-gray-700">{item.name}</span>
              {item.status === 'uploading' && <span className="text-xs text-blue-500 animate-pulse">Téléversement...</span>}
              {item.status === 'processing' && <span className="text-xs text-amber-500 animate-pulse">Analyse OCR...</span>}
              {item.status === 'done' && <CheckCircle size={16} className="text-green-500" />}
              {item.status === 'error' && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={14} /> {item.error || 'Erreur'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReceiptsPage() {
  const t = useTranslations('receipts');
  const commonT = useTranslations('common');
  const { orgId, user, loading: orgLoading } = useOrganization();
  const supabase = createClient();

  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchReceipts = useCallback(async () => {
    if (!orgId) return;
    setDataLoading(true);
    const { data } = await (supabase as any)
      .from('receipts').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
    setReceipts(data || []);
    setDataLoading(false);
  }, [orgId]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const handleDelete = async (id: string) => {
    await (supabase as any).from('receipts').delete().eq('id', id);
    setReceipts((p) => p.filter((r) => r.id !== id));
  };

  const filtered = receipts.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const d = r.date || r.created_at?.split('T')[0] || '';
    if (dateRange.start && d < dateRange.start) return false;
    if (dateRange.end && d > dateRange.end) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (r.vendor || '').toLowerCase().includes(q) || (r.file_name || '').toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, r) => s + (r.amount ?? 0), 0);
  const verifiedCount = filtered.filter((r) => r.status === 'verified').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {/* Upload */}
          <div className="mb-8">
            {!orgLoading && orgId && user ? (
              <DropzoneArea orgId={orgId} userId={user.id} onUploaded={fetchReceipts} />
            ) : (
              <div className="border-2 border-dashed rounded-xl p-10 text-center border-gray-200 bg-white">
                <Cloud size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-400 text-sm">{commonT('loading')}</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: commonT('total'), value: formatCurrency(totalAmount), color: 'text-gray-900' },
              { label: t('title'), value: filtered.length, color: 'text-gray-900' },
              { label: t('verified'), value: verifiedCount, color: 'text-green-600' },
            ].map((s) => (
              <Card key={s.label} padding="md" shadow="sm" className="bg-white text-center">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card padding="md" shadow="sm" className="bg-white mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder={commonT('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tenir-500"
                />
              </div>
              <Select
                label=""
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as string)}
                options={[
                  { value: 'all', label: commonT('status') + ' — tous' },
                  { value: 'pending', label: t('pending') },
                  { value: 'verified', label: t('verified') },
                  { value: 'rejected', label: t('rejected') },
                ]}
              />
              <Input label="" type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} placeholder="Date début" />
              <Input label="" type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} placeholder="Date fin" />
            </div>
          </Card>

          {/* Receipts grid */}
          {dataLoading ? (
            <p className="text-center text-gray-400 py-12">{commonT('loading')}</p>
          ) : filtered.length === 0 ? (
            <Card padding="lg" shadow="sm" className="bg-white text-center py-16">
              <Receipt size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">{receipts.length === 0 ? t('noReceipts') : commonT('noResults')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((r) => <ReceiptCard key={r.id} receipt={r} onDelete={handleDelete} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
