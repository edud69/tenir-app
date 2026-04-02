'use client';

import React, { useState, useCallback } from 'react';
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

interface ExtractedData {
  vendor: string;
  amount: number;
  date: string;
  gst: number;
  qst: number;
}

interface Receipt {
  id: string;
  fileName: string;
  vendor: string;
  amount: number;
  date: string;
  status: 'pending' | 'verified' | 'rejected';
  extractedData?: ExtractedData;
  uploadedAt: string;
  thumbnail?: string;
}

const mockReceipts: Receipt[] = [
  {
    id: '1',
    fileName: 'staples_office_supplies.pdf',
    vendor: 'Staples Canada',
    amount: 245.67,
    date: '2024-03-15',
    status: 'verified',
    extractedData: {
      vendor: 'Staples Canada',
      amount: 245.67,
      date: '2024-03-15',
      gst: 12.28,
      qst: 17.12,
    },
    uploadedAt: '2024-03-16',
    thumbnail: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=100&h=100&fit=crop',
  },
  {
    id: '2',
    fileName: 'bell_internet_march.pdf',
    vendor: 'Bell Canada',
    amount: 89.99,
    date: '2024-03-10',
    status: 'verified',
    extractedData: {
      vendor: 'Bell Canada',
      amount: 89.99,
      date: '2024-03-10',
      gst: 4.50,
      qst: 6.30,
    },
    uploadedAt: '2024-03-11',
    thumbnail: 'https://images.unsplash.com/photo-1633356284129-ce99ee4b4f0f?w=100&h=100&fit=crop',
  },
  {
    id: '3',
    fileName: 'uber_travel_march.jpg',
    vendor: 'Uber',
    amount: 156.42,
    date: '2024-03-12',
    status: 'pending',
    extractedData: {
      vendor: 'Uber',
      amount: 156.42,
      date: '2024-03-12',
      gst: 7.82,
      qst: 10.95,
    },
    uploadedAt: '2024-03-13',
    thumbnail: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=100&h=100&fit=crop',
  },
  {
    id: '4',
    fileName: 'aws_subscription.png',
    vendor: 'Amazon Web Services',
    amount: 342.15,
    date: '2024-03-01',
    status: 'rejected',
    uploadedAt: '2024-03-02',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f5ae4e8ac1e?w=100&h=100&fit=crop',
  },
  {
    id: '5',
    fileName: 'co_working_space.pdf',
    vendor: 'WeWork',
    amount: 1200.00,
    date: '2024-03-01',
    status: 'verified',
    extractedData: {
      vendor: 'WeWork',
      amount: 1200.00,
      date: '2024-03-01',
      gst: 60.00,
      qst: 84.00,
    },
    uploadedAt: '2024-03-02',
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
  },
];

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const t = useTranslations('receipts');

  const statusConfig = {
    verified: { variant: 'success' as const, icon: CheckCircle, label: t('verified') },
    pending: { variant: 'warning' as const, icon: AlertCircle, label: t('pending') },
    rejected: { variant: 'error' as const, icon: AlertCircle, label: t('rejected') },
  };

  const config = statusConfig[receipt.status];
  const StatusIcon = config.icon;

  return (
    <Card shadow="sm" interactive className="overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="w-full h-40 bg-gray-100 overflow-hidden">
        <img
          src={receipt.thumbnail || 'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=200&h=160&fit=crop'}
          alt={receipt.fileName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm text-gray-600 truncate">{receipt.fileName}</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{receipt.vendor}</p>
          </div>
          <Badge variant={config.variant} size="sm" className="ml-2">
            {config.label}
          </Badge>
        </div>

        <div className="mb-4 flex-1">
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(receipt.amount)}
          </p>
          <p className="text-sm text-gray-600">{formatDate(receipt.date)}</p>
        </div>

        {receipt.extractedData && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">Extracted</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">GST:</span>
                <span className="font-medium text-gray-900">{formatCurrency(receipt.extractedData.gst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">QST:</span>
                <span className="font-medium text-gray-900">{formatCurrency(receipt.extractedData.qst)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" fullWidth>
            View
          </Button>
          <Button variant="ghost" size="sm" fullWidth>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DropzoneArea() {
  const t = useTranslations('receipts');
  const [uploadedReceipts, setUploadedReceipts] = useState<Receipt[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Simulate processing
    acceptedFiles.forEach((file) => {
      const newReceipt: Receipt = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        vendor: 'Unknown Vendor',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        uploadedAt: new Date().toISOString().split('T')[0],
      };

      // Simulate processing delay
      setTimeout(() => {
        setUploadedReceipts((prev) =>
          prev.map((r) =>
            r.id === newReceipt.id
              ? {
                  ...r,
                  status: 'verified',
                  vendor: `${file.name.split('_')[0].charAt(0).toUpperCase()}${file.name.split('_')[0].slice(1)}`,
                  amount: Math.random() * 500 + 50,
                  extractedData: {
                    vendor: `${file.name.split('_')[0].charAt(0).toUpperCase()}${file.name.split('_')[0].slice(1)}`,
                    amount: Math.random() * 500 + 50,
                    date: new Date().toISOString().split('T')[0],
                    gst: Math.random() * 50,
                    qst: Math.random() * 50,
                  },
                }
              : r
          )
        );
      }, 1500);

      setUploadedReceipts((prev) => [...prev, newReceipt]);
    });
  }, []);

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

      {uploadedReceipts.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">
            {uploadedReceipts.length} receipt{uploadedReceipts.length !== 1 ? 's' : ''} uploaded
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {uploadedReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{receipt.fileName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {receipt.status === 'pending' && (
                      <div className="inline-flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        <span className="text-xs text-yellow-700">{t('processing')}</span>
                      </div>
                    )}
                    {receipt.status === 'verified' && (
                      <span className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircle size={12} />
                        {t('verified')}
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const allReceipts = mockReceipts;

  const filteredReceipts = allReceipts.filter((receipt) => {
    if (statusFilter !== 'all' && receipt.status !== statusFilter) return false;
    if (dateRange.start && receipt.date < dateRange.start) return false;
    if (dateRange.end && receipt.date > dateRange.end) return false;
    return true;
  });

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
  const verifiedCount = filteredReceipts.filter((r) => r.status === 'verified').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Upload Zone */}
          <div className="mb-8">
            <DropzoneArea />
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
