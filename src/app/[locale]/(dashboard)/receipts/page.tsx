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
import { Upload, CheckCircle, AlertCircle, Cloud, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface Receipt {
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

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const t = useTranslations('receipts');

  const statusConfig = {
    verified: { variant: 'success' as const, icon: CheckCircle, label: t('verified') },
    pending: { variant: 'warning' as const, icon: AlertCircle, label: t('pending') },
    rejected: { variant: 'error' as const, icon: AlertCircle, label: t('rejected') },
  };

  const config = statusConfig[receipt.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const displayName = receipt.file_name || 'Unknown file';
  const displayVendor = receipt.vendor || 'Unknown Vendor';
  const displayAmount = receipt.amount ?? 0;
  const displayDate = receipt.date || receipt.created_at?.split('T')[0] || '';

  return (
    <Card shadow="sm" interactive className="overflow-hidden flex flex-col">
      {/* Icon placeholder instead of image */}
      <div className="w-full h-40 bg-gray-100 overflow-hidden flex items-center justify-center">
        <FileText size={48} className="text-gray-400" />
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm text-gray-600 truncate">{displayName}</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{displayVendor}</p>
          </div>
          <Badge variant={config.variant} size="sm" className="ml-2">
            {config.label}
          </Badge>
        </div>

        <div className="mb-4 flex-1">
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(displayAmount)}
          </p>
          {displayDate && <p className="text-sm text-gray-600">{formatDate(displayDate)}</p>}
        </div>

        {(receipt.gst_amount != null || receipt.qst_amount != null) && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">Extracted</p>
            <div className="space-y-1 text-xs">
              {receipt.gst_amount != null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">GST:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(receipt.gst_amount)}</span>
                </div>
              )}
              {receipt.qst_amount != null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">QST:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(receipt.qst_amount)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" fullWidth>
            View
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DropzoneArea({
  orgId,
  userId,
  onUploaded,
}: {
  orgId: string;
  userId: string;
  onUploaded: () => void;
}) {
  const t = useTranslations('receipts');
  const supabase = createClient();
  const [uploadQueue, setUploadQueue] = useState<
    { id: string; name: string; status: 'uploading' | 'processing' | 'done' | 'error' }[]
  >([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const tempId = Math.random().toString(36).substr(2, 9);

        setUploadQueue((prev) => [
          ...prev,
          { id: tempId, name: file.name, status: 'uploading' },
        ]);

        try {
          // 1. Upload to Supabase Storage
          const storagePath = `${orgId}/${Date.now()}_${file.name}`;
          const { data: storageData, error: storageError } = await supabase.storage
            .from('receipts')
            .upload(storagePath, file);

          if (storageError) throw storageError;

          setUploadQueue((prev) =>
            prev.map((q) => (q.id === tempId ? { ...q, status: 'processing' } : q))
          );

          // 2. Try OCR API
          let ocrResult: any = null;
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('orgId', orgId);
            const ocrResponse = await fetch('/api/receipts/ocr', {
              method: 'POST',
              body: formData,
            });
            if (ocrResponse.ok) {
              ocrResult = await ocrResponse.json();
            }
          } catch {
            // OCR failed — continue with null values
          }

          // 3. Insert into receipts table
          const { error: insertError } = await (supabase as any)
            .from('receipts')
            .insert({
              organization_id: orgId,
              uploaded_by: userId,
              file_path: storageData?.path || storagePath,
              file_name: file.name,
              vendor: ocrResult?.vendor || null,
              amount: ocrResult?.amount || null,
              currency: ocrResult?.currency || 'CAD',
              date: ocrResult?.date || null,
              gst_amount: ocrResult?.gst_amount || null,
              qst_amount: ocrResult?.qst_amount || null,
              tax_number: ocrResult?.tax_number || null,
              category: ocrResult?.category || null,
              description: ocrResult?.description || null,
              status: ocrResult ? 'verified' : 'pending',
              ocr_data: ocrResult || null,
              source: 'upload',
            });

          if (insertError) throw insertError;

          setUploadQueue((prev) =>
            prev.map((q) => (q.id === tempId ? { ...q, status: 'done' } : q))
          );

          onUploaded();
        } catch (e: any) {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === tempId ? { ...q, status: 'error' } : q))
          );
        }
      }
    },
    [orgId, userId, onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer',
        isDragActive
          ? 'border-tenir-500 bg-tenir-50'
          : 'border-gray-300 hover:border-tenir-400 hover:bg-gray-50'
      )}
    >
      <input {...getInputProps()} />
      <Cloud
        size={48}
        className={cn(
          'mx-auto mb-4 transition-colors',
          isDragActive ? 'text-tenir-500' : 'text-gray-400'
        )}
      />
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('upload')}</h3>
      <p className="text-sm text-gray-600 mb-3">{t('uploadDescription')}</p>
      <p className="text-xs text-gray-500">{t('supportedFormats')}</p>

      {uploadQueue.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">
            {uploadQueue.length} receipt{uploadQueue.length !== 1 ? 's' : ''} uploaded
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {(item.status === 'uploading' || item.status === 'processing') && (
                      <div className="inline-flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        <span className="text-xs text-yellow-700">{t('processing')}</span>
                      </div>
                    )}
                    {item.status === 'done' && (
                      <span className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircle size={12} />
                        {t('verified')}
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-xs text-red-700 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Error
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (!orgId) return;
    fetchReceipts();
  }, [orgId]);

  async function fetchReceipts() {
    setDataLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('receipts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (e: any) {
      // silently fail — show empty state
      setReceipts([]);
    } finally {
      setDataLoading(false);
    }
  }

  const filteredReceipts = receipts.filter((receipt) => {
    if (statusFilter !== 'all' && receipt.status !== statusFilter) return false;
    const receiptDate = receipt.date || receipt.created_at?.split('T')[0] || '';
    if (dateRange.start && receiptDate < dateRange.start) return false;
    if (dateRange.end && receiptDate > dateRange.end) return false;
    return true;
  });

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const verifiedCount = filteredReceipts.filter((r) => r.status === 'verified').length;

  const isLoading = orgLoading || dataLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title={t('title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Upload Zone */}
          <div className="mb-8">
            {orgId && user ? (
              <DropzoneArea
                orgId={orgId}
                userId={user.id}
                onUploaded={fetchReceipts}
              />
            ) : (
              <div className="border-2 border-dashed rounded-lg p-12 text-center border-gray-300">
                <Cloud size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600">{t('upload')}</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Button fullWidth icon={<Cloud size={18} />} variant="outline">
              {t('connectDrive')}
            </Button>
            <Button fullWidth icon={<FileText size={18} />} variant="outline">
              {t('scanEmail')}
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card padding="md" shadow="sm">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
              </div>
            </Card>
            <Card padding="md" shadow="sm">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Receipts</p>
                <p className="text-2xl font-bold text-gray-900">{filteredReceipts.length}</p>
              </div>
            </Card>
            <Card padding="md" shadow="sm">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Verified</p>
                <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card padding="md" shadow="sm" className="mb-8">
            <CardHeader>
              <CardTitle level="h3">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as string)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'pending', label: t('pending') },
                    { value: 'verified', label: t('verified') },
                    { value: 'rejected', label: t('rejected') },
                  ]}
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Receipts Grid */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {filteredReceipts.length} Receipt{filteredReceipts.length !== 1 ? 's' : ''}
            </h3>
            {filteredReceipts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReceipts.map((receipt) => (
                  <ReceiptCard key={receipt.id} receipt={receipt} />
                ))}
              </div>
            ) : (
              <Card padding="lg" shadow="sm" className="text-center">
                <p className="text-gray-600">{commonT('noResults')}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
