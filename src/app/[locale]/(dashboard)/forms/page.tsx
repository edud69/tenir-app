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
  FileText, Plus, CheckCircle, Clock, AlertCircle, Trash2, Eye, Building2, MapPin,
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

type JurisdictionTab = 'federal' | 'provincial';

const FEDERAL_FORMS = ['t2', 't5', 't5013', 't106'];
const PROVINCIAL_FORMS = ['co17', 'rl3'];

const FORM_TYPE_MAP: Record<string, string> = {
  t2: 'T2',
  co17: 'CO-17',
  t5: 'T5',
  rl3: 'RL-3',
  t5013: 'T5013',
  t106: 'T106',
};

const FEDERAL_FORM_OPTIONS = [
  { value: 't2', label: 'T2 — Corporation Income Tax Return' },
  { value: 't5', label: 'T5 — Statement of Investment Income' },
  { value: 't5013', label: 'T5013 — Statement of Partnership Income' },
  { value: 't106', label: 'T106 — Non-Resident Transactions' },
];

const PROVINCIAL_FORM_OPTIONS = [
  { value: 'co17', label: 'CO-17 — Déclaration de revenus des sociétés (Québec)' },
  { value: 'rl3', label: 'RL-3 — Revenus de placement' },
];

const yearOptions = ['2025', '2024', '2023', '2022'].map((y) => ({ value: y, label: y }));

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

const STATUS_NEXT: Record<string, { label: string; next: GovernmentForm['status']; color: string }> = {
  draft:     { label: 'Marquer prêt',    next: 'ready',     color: 'bg-amber-500 hover:bg-amber-600 text-white' },
  ready:     { label: 'Soumettre',       next: 'submitted', color: 'bg-tenir-500 hover:bg-tenir-600 text-white' },
  submitted: { label: 'Marquer accepté', next: 'accepted',  color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
};

function FormCard({
  form,
  onPreview,
  onDelete,
  onAdvanceStatus,
}: {
  form: GovernmentForm;
  onPreview: (form: GovernmentForm) => void;
  onDelete: (id: string) => void;
  onAdvanceStatus: (form: GovernmentForm, next: GovernmentForm['status']) => void;
}) {
  const t = useTranslations('forms');
  const apiFormType = FORM_TYPE_MAP[form.form_type] || form.form_type.toUpperCase();
  const isFederal = FEDERAL_FORMS.includes(form.form_type);
  const nextStep = STATUS_NEXT[form.status];

  return (
    <Card padding="md" shadow="sm" className="bg-white flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-tenir-600 bg-tenir-50 px-2 py-0.5 rounded">{apiFormType}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${isFederal ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              {isFederal ? 'Fédéral' : 'Québec'}
            </span>
            <span className="text-xs text-gray-400">{t('taxYear')} {form.tax_year}</span>
          </div>
          <p className="text-sm text-gray-700 font-medium leading-snug">
            {t(form.form_type as any)}
          </p>
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

      {/* Status progress indicator */}
      <div className="flex items-center gap-1 mb-4">
        {(['draft', 'ready', 'submitted', 'accepted'] as const).map((s, i) => {
          const statuses = ['draft', 'ready', 'submitted', 'accepted'];
          const currentIdx = statuses.indexOf(form.status);
          const stepIdx = statuses.indexOf(s);
          const done = stepIdx < currentIdx;
          const active = stepIdx === currentIdx;
          return (
            <React.Fragment key={s}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-emerald-400' : active ? 'bg-tenir-500' : 'bg-gray-200'}`} />
              {i < 3 && <div className={`flex-1 h-px ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" icon={<Eye size={14} />} onClick={() => onPreview(form)}>
          {t('preview')}
        </Button>
        {nextStep && (
          <button
            onClick={() => onAdvanceStatus(form, nextStep.next)}
            className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${nextStep.color}`}
          >
            {nextStep.label}
          </button>
        )}
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          onClick={() => {
            if (window.confirm(t('deleteConfirm'))) onDelete(form.id);
          }}
          className="text-red-400 hover:bg-red-50"
        />
      </div>
    </Card>
  );
}

function PreviewModal({
  form, onClose, onAdvanceStatus,
}: {
  form: GovernmentForm | null;
  onClose: () => void;
  onAdvanceStatus: (form: GovernmentForm, next: GovernmentForm['status']) => void;
}) {
  const t = useTranslations('forms');
  if (!form) return null;

  const sections = form.data?.sections || [];
  const apiFormType = FORM_TYPE_MAP[form.form_type] || form.form_type.toUpperCase();
  const nextStep = STATUS_NEXT[form.status];

  return (
    <Modal
      isOpen={!!form}
      onClose={onClose}
      title={`${apiFormType} — ${t('taxYear')} ${form.tax_year}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(form.status)} size="sm" dot>
              {t(`status.${form.status}` as any)}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            {nextStep && (
              <button
                onClick={() => { onAdvanceStatus(form, nextStep.next); onClose(); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${nextStep.color}`}
              >
                {nextStep.label}
              </button>
            )}
          </div>
        </div>
      }
    >
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
          <p className="text-xs text-amber-800">{t('generateInfo')}</p>
        </div>
      </div>
    </Modal>
  );
}

export default function FormsPage() {
  const t = useTranslations('forms');
  const tCommon = useTranslations('common');
  const supabase = createClient();
  const { orgId, user } = useOrganization();

  const [activeTab, setActiveTab] = useState<JurisdictionTab>('federal');
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

  const federalForms = forms.filter((f) => FEDERAL_FORMS.includes(f.form_type));
  const provincialForms = forms.filter((f) => PROVINCIAL_FORMS.includes(f.form_type));
  const displayedForms = activeTab === 'federal' ? federalForms : provincialForms;
  const formOptions = activeTab === 'federal' ? FEDERAL_FORM_OPTIONS : PROVINCIAL_FORM_OPTIONS;

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

  const handleAdvanceStatus = async (form: GovernmentForm, next: GovernmentForm['status']) => {
    const updates: Record<string, any> = { status: next };
    if (next === 'submitted') updates.submitted_at = new Date().toISOString();
    const { error } = await (supabase as any)
      .from('government_forms')
      .update(updates)
      .eq('id', form.id);
    if (!error) {
      setForms((prev) => prev.map((f) => f.id === form.id ? { ...f, ...updates } : f));
      // refresh previewForm if open on same record
      setPreviewForm((prev) => prev?.id === form.id ? { ...prev, ...updates } : prev);
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

          {/* Page header */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('formsOverview')}</h2>
              <p className="text-gray-500 mt-1 text-sm">{t('formsDescription')}</p>
            </div>
            <Button icon={<Plus size={16} />} onClick={() => { setSelectedType(''); setShowGenerateModal(true); }}>
              {t('generate')}
            </Button>
          </div>

          {/* Jurisdiction Tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit shadow-sm">
            <button
              onClick={() => setActiveTab('federal')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'federal'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Building2 size={15} />
              Fédéral
              {federalForms.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'federal' ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {federalForms.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('provincial')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'provincial'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MapPin size={15} />
              Québec
              {provincialForms.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'provincial' ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {provincialForms.length}
                </span>
              )}
            </button>
          </div>

          {/* Jurisdiction description */}
          <div className={`mb-6 p-4 rounded-xl border text-sm ${activeTab === 'federal' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
            {activeTab === 'federal' ? (
              <p><strong>Formulaires fédéraux</strong> — Produits auprès de l'Agence du revenu du Canada (ARC). Incluent la déclaration T2, relevés T5 et T5013, et le formulaire T106 pour les opérations avec non-résidents.</p>
            ) : (
              <p><strong>Formulaires provinciaux — Québec</strong> — Produits auprès de Revenu Québec (RQ). Incluent la déclaration CO-17 et les relevés RL-3 pour les revenus de placement.</p>
            )}
          </div>

          {/* Forms Grid */}
          {loading ? (
            <p className="text-gray-400 text-sm py-8 text-center">{tCommon('loading')}</p>
          ) : displayedForms.length === 0 ? (
            <Card padding="md" shadow="sm" className="bg-white mb-8">
              <CardContent>
                <div className="text-center py-12">
                  <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">{t('noFormsGenerated')}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {activeTab === 'federal'
                      ? 'Générez un formulaire fédéral (T2, T5, T5013, T106) pour commencer.'
                      : 'Générez un formulaire québécois (CO-17, RL-3) pour commencer.'}
                  </p>
                  <Button className="mt-4" icon={<Plus size={16} />} onClick={() => { setSelectedType(''); setShowGenerateModal(true); }}>
                    {t('generate')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {displayedForms.map((form) => (
                <FormCard key={form.id} form={form} onPreview={setPreviewForm} onDelete={handleDelete} onAdvanceStatus={handleAdvanceStatus} />
              ))}
            </div>
          )}

          {/* Submission History */}
          {submitted.length > 0 && (
            <Card padding="md" shadow="sm" className="bg-white">
              <CardHeader>
                <CardTitle level="h3">{t('submissionHistory')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submitted.map((form, i) => {
                    const apiType = FORM_TYPE_MAP[form.form_type] || form.form_type.toUpperCase();
                    const isFederal = FEDERAL_FORMS.includes(form.form_type);
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
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isFederal ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                              {isFederal ? 'Fédéral' : 'Québec'}
                            </span>
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal form={previewForm} onClose={() => setPreviewForm(null)} onAdvanceStatus={handleAdvanceStatus} />

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

          {/* Jurisdiction selector inside modal */}
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('federal'); setSelectedType(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                activeTab === 'federal' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Building2 size={14} /> Fédéral
            </button>
            <button
              onClick={() => { setActiveTab('provincial'); setSelectedType(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                activeTab === 'provincial' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MapPin size={14} /> Québec
            </button>
          </div>

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
