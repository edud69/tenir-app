'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import {
  FileText, Download, Eye, Send, Plus, CheckCircle, Clock, AlertCircle, Trash2,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { createClient } from '@/lib/supabase/client';

interface GovernmentForm {
  id: string;
  organization_id: string;
  form_type: string;
  tax_year: number;
  status: 'draft' | 'ready' | 'submitted' | 'accepted';
  data: any;
  created_at: string;
  submitted_at?: string;
  created_by: string;
}

const FORM_TYPE_MAP: Record<string, string> = {
  t2: 'T2',
  co17: 'CO-17',
  t5: 'T5',
  rl3: 'RL-3',
};

function getStatusVariant(status: string): 'success' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'accepted': return 'success';
    case 'submitted': return 'warning';
    case 'ready': return 'info';
    default: return 'default';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'accepted': return <CheckCircle size={14} />;
    case 'submitted': return <Clock size={14} />;
    case 'ready': return <AlertCircle size={14} />;
    default: return <FileText size={14} />;
  }
}

function FormCard({
  form,
  onPreview,
  onDelete,
}: {
  form: GovernmentForm;
  onPreview: (form: GovernmentForm) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations('forms');
  const tCommon = useTranslations('common');
  const apiFormType = FORM_TYPE_MAP[form.form_type] || form.form_type.toUpperCase();
  const formName = t(form.form_type as any);

  return (
    <Card padding="md" shadow="sm" className="bg-white flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-tenir-600 bg-tenir-50 px-2 py-0.5 rounded">{apiFormType}</span>
            <span className="text-xs text-gray-500">{t('taxYear')} {form.tax_year}</span>
          </div>
          <p className="text-sm text-gray-700 font-medium leading-snug line-clamp-2">{formName}</p>
        </div>
        <FileText className="text-gray-300 ml-2 shrink-0" size={18} />
      </div>

      <div className="mb-4 flex-1">
        <Badge variant={getStatusVariant(form.status)} size="sm" dot>
          {t(`status.${form.status}` as any)}
        </Badge>
        {form.submitted_at && (
          <p className="text-xs text-gray-500 mt-2">{t('submittedOn')} {form.submitted_at.split('T')[0]}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{t('generatedOn')} {form.created_at.split('T')[0]}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" icon={<Eye size={14} />} onClick={() => onPreview(form)}>
          {t('preview')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          onClick={() => {
            if (window.confirm(t('deleteConfirm'))) onDelete(form.id);
          }}
          className="text-red-500 hover:bg-red-50"
        />
      </div>
    </Card>
  );
}

function PreviewModal({ form, onClose }: { form: GovernmentForm | null; onClose: () => void }) {
  const t = useTranslations('forms');
  if (!form) return null;

  const sections = form.data?.sections || [];
  const apiFormType = FORM_TYPE_MAP[form.form_type] || form.form_type.toUpperCase();

  return (
    <Modal isOpen={!!form} onClose={onClose} title={`${apiFormType} — ${t('taxYear')} ${form.tax_year}`} size="lg">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {sections.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('noFormsGenerated')}</p>
        ) : (
          sections.map((section: any, si: number) => (
            <div key={si} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-700">{section.name}</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium w-16">Code</th>
                    <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium">{t('field')}</th>
                    <th className="text-right py-2 px-4 text-xs text-gray-500 font-medium">{t('value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.fields.map((field: any, fi: number) => (
                    <tr key={fi} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 px-4 text-gray-400 font-mono text-xs">{field.code}</td>
                      <td className="py-2 px-4 text-gray-700">{field.label}</td>
                      <td className="py-2 px-4 text-right text-gray-400 italic text-xs">
                        {field.value ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            {t('generateInfo')}
          </p>
        </div>
      </div>
    </Modal>
  );
}

const formOptions = [
  { value: 't2', label: 'T2 — Corporation Income Tax Return' },
  { value: 'co17', label: 'CO-17 — Corporation Income Tax Return (Quebec)' },
  { value: 't5', label: 'T5 — Statement of Investment Income' },
  { value: 'rl3', label: 'RL-3 — Investment Income' },
];

const yearOptions = ['2025', '2024', '2023', '2022'].map((y) => ({ value: y, label: y }));

export default function FormsPage() {
  const t = useTranslations('forms');
  const tCommon = useTranslations('common');
  const supabase = createClient();
  const { orgId, user } = useOrganization();

  const [forms, setForms] = useState<GovernmentForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewForm, setPreviewForm] = useState<GovernmentForm | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('government_forms')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (data) setForms(data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleGenerate = async () => {
    if (!selectedType || !orgId || !user) return;
    setGenerating(true);
    setGenError(null);
    try {
      const apiType = FORM_TYPE_MAP[selectedType];
      const res = await fetch('/api/forms/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formType: apiType, taxYear: parseInt(selectedYear), organizationId: orgId }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const generated = await res.json();

      const { error } = await (supabase as any)
        .from('government_forms')
        .insert({
          organization_id: orgId,
          form_type: selectedType,
          tax_year: parseInt(selectedYear),
          status: 'draft',
          data: generated,
          created_by: user.id,
        });

      if (error) throw error;

      setShowGenerateModal(false);
      setSelectedType('');
      await fetchForms();
    } catch (e: any) {
      setGenError(e.message || 'Failed to generate form');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('government_forms').delete().eq('id', id);
    setForms((prev) => prev.filter((f) => f.id !== id));
  };

  const submitted = forms.filter((f) => ['submitted', 'accepted'].includes(f.status));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('formsOverview')}</h2>
              <p className="text-gray-500 mt-1 text-sm">{t('formsDescription')}</p>
            </div>
            <Button icon={<Plus size={16} />} onClick={() => setShowGenerateModal(true)}>
              {t('generate')}
            </Button>
          </div>

          {/* Forms Grid */}
          {loading ? (
            <p className="text-gray-400 text-sm py-8 text-center">{tCommon('loading')}</p>
          ) : forms.length === 0 ? (
            <Card padding="md" shadow="sm" className="bg-white mb-8">
              <CardContent>
                <div className="text-center py-12">
                  <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">{t('noFormsGenerated')}</p>
                  <p className="text-gray-400 text-sm mt-1">{t('startGenerating')}</p>
                  <Button className="mt-4" icon={<Plus size={16} />} onClick={() => setShowGenerateModal(true)}>
                    {t('generate')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {forms.map((form) => (
                <FormCard key={form.id} form={form} onPreview={setPreviewForm} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {/* Submission History */}
          <Card padding="md" shadow="sm" className="bg-white">
            <CardHeader>
              <CardTitle level="h3">{t('submissionHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted.length === 0 ? (
                <p className="text-gray-400 text-sm py-4">{t('noHistory')}</p>
              ) : (
                <div className="space-y-4">
                  {submitted.map((form, i) => {
                    const apiType = FORM_TYPE_MAP[form.form_type] || form.form_type.toUpperCase();
                    return (
                      <div key={form.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`p-2 rounded-full ${form.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {getStatusIcon(form.status)}
                          </div>
                          {i < submitted.length - 1 && <div className="h-8 border-l-2 border-gray-100 mt-1" />}
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{apiType}</span>
                            <Badge variant={getStatusVariant(form.status)} size="sm">
                              {t(`status.${form.status}` as any)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{t('taxYear')} {form.tax_year} — {form.submitted_at?.split('T')[0] || form.created_at.split('T')[0]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal form={previewForm} onClose={() => setPreviewForm(null)} />

      {/* Generate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => { setShowGenerateModal(false); setSelectedType(''); setGenError(null); }}
        title={t('selectFormType')}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setShowGenerateModal(false); setSelectedType(''); setGenError(null); }}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleGenerate} disabled={!selectedType || generating} isLoading={generating}>
              {generating ? t('generatingForm') : t('generate')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {genError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{genError}</div>
          )}
          <Select
            label={t('selectFormType')}
            options={formOptions}
            value={selectedType}
            onChange={(v) => setSelectedType(v as string)}
            placeholder={t('choosePlaceholder')}
          />
          <Select
            label={t('taxYear')}
            options={yearOptions}
            value={selectedYear}
            onChange={(v) => setSelectedYear(v as string)}
            placeholder={t('chooseYearPlaceholder')}
          />
          <div className="bg-tenir-50 border border-tenir-100 rounded-lg p-3">
            <p className="text-sm text-tenir-800">{t('generateInfo')}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
