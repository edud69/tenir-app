'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import {
  FileText,
  Download,
  Eye,
  Send,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface FormData {
  id: string;
  name: string;
  description: string;
  taxYear: string;
  status: 'draft' | 'ready' | 'submitted' | 'accepted';
  submittedDate?: string;
  type: string;
}

interface FormTimeline {
  id: string;
  form: string;
  status: 'draft' | 'ready' | 'submitted' | 'accepted';
  date: string;
  notes?: string;
}

const mockForms: FormData[] = [
  {
    id: '1',
    name: 'T2',
    type: 't2',
    description: 'Corporation Income Tax Return',
    taxYear: '2024',
    status: 'accepted',
    submittedDate: '2025-02-28',
  },
  {
    id: '2',
    name: 'CO-17',
    type: 'co17',
    description: 'Corporation Income Tax Return (Quebec)',
    taxYear: '2024',
    status: 'accepted',
    submittedDate: '2025-03-15',
  },
  {
    id: '3',
    name: 'T5',
    type: 't5',
    description: 'Statement of Investment Income',
    taxYear: '2025',
    status: 'ready',
  },
  {
    id: '4',
    name: 'RL-3',
    type: 'rl3',
    description: 'Investment Income (Quebec)',
    taxYear: '2025',
    status: 'draft',
  },
  {
    id: '5',
    name: 'T5013',
    type: 't5013',
    description: 'Statement of Partnership Income',
    taxYear: '2025',
    status: 'draft',
  },
  {
    id: '6',
    name: 'T106',
    type: 't106',
    description: 'Non-Resident Transactions',
    taxYear: '2024',
    status: 'submitted',
    submittedDate: '2025-01-20',
  },
];

const mockTimeline: FormTimeline[] = [
  {
    id: '1',
    form: 'T2 — Corporation Income Tax Return',
    status: 'accepted',
    date: '2025-02-28',
    notes: 'Accepted by CRA',
  },
  {
    id: '2',
    form: 'CO-17 — Corporation Income Tax Return (Quebec)',
    status: 'accepted',
    date: '2025-03-15',
    notes: 'Accepted by Revenu Québec',
  },
  {
    id: '3',
    form: 'T106 — Non-Resident Transactions',
    status: 'submitted',
    date: '2025-01-20',
    notes: 'Submitted electronically',
  },
];

const formOptions = [
  { value: 't2', label: 'T2 — Corporation Income Tax Return' },
  { value: 'co17', label: 'CO-17 — Corporation Income Tax Return (Quebec)' },
  { value: 't5', label: 'T5 — Statement of Investment Income' },
  { value: 'rl3', label: 'RL-3 — Investment Income' },
  { value: 't5013', label: 'T5013 — Statement of Partnership Income' },
  { value: 't106', label: 'T106 — Non-Resident Transactions' },
];

const yearOptions = [
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'accepted':
      return <CheckCircle size={16} />;
    case 'submitted':
      return <Clock size={16} />;
    case 'ready':
      return <AlertCircle size={16} />;
    case 'draft':
      return <FileText size={16} />;
    default:
      return <FileText size={16} />;
  }
}

function getStatusVariant(status: string): 'success' | 'warning' | 'info' | 'default' | 'error' {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'submitted':
      return 'warning';
    case 'ready':
      return 'info';
    case 'draft':
      return 'default';
    default:
      return 'default';
  }
}

function FormCard({ form }: { form: FormData }) {
  const t = useTranslations('forms');
  const commonT = useTranslations('common');
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <Card padding="md" shadow="sm" interactive className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{form.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{form.description}</p>
          </div>
          <FileText className="text-tenir-600 ml-2" size={20} />
        </div>

        <div className="flex-1 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-gray-600">
              Tax Year: {form.taxYear}
            </span>
          </div>
          <Badge variant={getStatusVariant(form.status)} size="sm" dot>
            {t(`status.${form.status}`)}
          </Badge>
          {form.submittedDate && (
            <p className="text-xs text-gray-600 mt-2">
              {t('submittedOn')} {form.submittedDate}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<Eye size={16} />}
            onClick={() => setShowPreview(true)}
          >
            {t('preview')}
          </Button>
          <Button variant="outline" size="sm" icon={<Download size={16} />}>
            {t('download')}
          </Button>
          {form.status === 'ready' && (
            <Button variant="secondary" size="sm" icon={<Send size={16} />}>
              {t('submit')}
            </Button>
          )}
        </div>
      </Card>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={`${form.name} Preview`}
        size="lg"
      >
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">{form.name}</h2>
            <p className="text-gray-600">{form.description}</p>
            <p className="text-sm text-gray-600 mt-2">Tax Year: {form.taxYear}</p>
          </div>

          {/* Mock Form Layout */}
          <div className="space-y-4 bg-white p-4 rounded border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Number
                </label>
                <div className="bg-gray-100 p-2 rounded text-sm">123 4567 890</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year Ended
                </label>
                <div className="bg-gray-100 p-2 rounded text-sm">December 31, {form.taxYear}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Revenue
              </label>
              <div className="bg-gray-100 p-2 rounded text-sm">$156,800.00</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Expenses
                </label>
                <div className="bg-gray-100 p-2 rounded text-sm">$42,300.00</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Net Income
                </label>
                <div className="bg-gray-100 p-2 rounded text-sm font-semibold">$114,500.00</div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-xs text-gray-600 italic">
                This is a preview of the form data. The actual CRA form layout would be rendered here.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function FormsPage() {
  const t = useTranslations('forms');
  const commonT = useTranslations('common');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2025');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Action Bar */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Forms Overview</h2>
              <p className="text-gray-600 mt-1">
                Generate, preview, and submit government tax forms
              </p>
            </div>
            <Button
              icon={<Plus size={18} />}
              onClick={() => setShowGenerateModal(true)}
            >
              {t('generate')}
            </Button>
          </div>

          {/* Forms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {mockForms.map((form) => (
              <FormCard key={form.id} form={form} />
            ))}
          </div>

          {/* Timeline Section */}
          <Card padding="md" shadow="sm">
            <CardHeader>
              <CardTitle level="h3">Submission History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockTimeline.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="p-2 rounded-full bg-tenir-100">
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="h-12 border-l-2 border-gray-200 mt-2" />
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h4 className="font-semibold text-gray-900">{item.form}</h4>
                        <Badge variant={getStatusVariant(item.status)} size="sm">
                          {t(`status.${item.status}`)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.date}</p>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generate Form Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setSelectedFormType('');
          setSelectedYear('2025');
        }}
        title={t('selectFormType')}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowGenerateModal(false);
                setSelectedFormType('');
                setSelectedYear('2025');
              }}
            >
              {commonT('cancel')}
            </Button>
            <Button
              disabled={!selectedFormType}
              icon={<FileText size={18} />}
            >
              {t('generate')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label={t('selectFormType')}
            options={formOptions}
            value={selectedFormType}
            onChange={(value) => setSelectedFormType(value as string)}
            placeholder="Choose a form..."
            required
          />

          <Select
            label="Tax Year"
            options={yearOptions}
            value={selectedYear}
            onChange={(value) => setSelectedYear(value as string)}
            placeholder="Choose a year..."
          />

          <div className="bg-tenir-50 p-4 rounded-lg border border-tenir-200">
            <p className="text-sm text-tenir-900">
              The form will be generated with your current company information and auto-filled data.
              You can then preview, edit, and submit it online.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
