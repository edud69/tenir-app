'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Building2,
  FileText,
  Zap,
  Globe,
  Globe2,
  Mail,
  Check,
} from 'lucide-react';
import { PlaidLinkButton } from '@/components/plaid/PlaidLinkButton';
import { useOrganization } from '@/hooks/useOrganization';
import { createClient } from '@/lib/supabase/client';

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabProps[] = [
  {
    id: 'company',
    label: 'Company Info',
    icon: <Building2 size={20} />,
  },
  {
    id: 'taxProfile',
    label: 'Tax Profile',
    icon: <FileText size={20} />,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: <Zap size={20} />,
  },
  {
    id: 'language',
    label: 'Language',
    icon: <Globe size={20} />,
  },
];

interface CompanyFormData {
  companyName: string;
  neq: string;
  bn: string;
  fiscalYearEnd: string;
  incorporationDate: string;
  province: string;
}

interface TaxFormData {
  corporationType: string;
  smallBusinessLimit: string;
  gripBalance: string;
  cdaBalance: string;
}

const provinceOptions = [
  { value: 'qc', label: 'Quebec' },
  { value: 'on', label: 'Ontario' },
  { value: 'bc', label: 'British Columbia' },
  { value: 'ab', label: 'Alberta' },
  { value: 'other', label: 'Other' },
];

const corporationTypes = [
  { value: 'ccpc', label: 'CCPC (Canadian-Controlled Private Corporation)' },
  { value: 'general', label: 'General Corporation' },
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
];

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: TabProps;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
        isActive
          ? 'border-tenir-600 text-tenir-600'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {tab.icon}
      {tab.label}
    </button>
  );
}

function CompanyInfoTab({
  org,
  orgId,
  onSave,
}: {
  org: any;
  orgId: string | null;
  onSave: (message?: string) => void;
}) {
  const t = useTranslations('settings');
  const commonT = useTranslations('common');
  const supabase = createClient();

  const [formData, setFormData] = useState<CompanyFormData>({
    companyName: '',
    neq: '',
    bn: '',
    fiscalYearEnd: '',
    incorporationDate: '',
    province: 'qc',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pre-fill form when org data is available
  useEffect(() => {
    if (!org) return;
    const fyEnd =
      org.fiscal_year_end_month && org.fiscal_year_end_day
        ? `${String(org.fiscal_year_end_month).padStart(2, '0')}-${String(org.fiscal_year_end_day).padStart(2, '0')}`
        : org.fiscal_year_end || '';
    setFormData({
      companyName: org.name || '',
      neq: org.neq || '',
      bn: org.business_number || '',
      fiscalYearEnd: fyEnd,
      incorporationDate: org.incorporation_date || '',
      province: org.province || 'qc',
    });
  }, [org]);

  const handleChange = (field: keyof CompanyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Parse fiscal year end MM-DD into month/day
      let fyMonth: number | null = null;
      let fyDay: number | null = null;
      if (formData.fiscalYearEnd) {
        const parts = formData.fiscalYearEnd.split('-');
        if (parts.length === 2) {
          fyMonth = parseInt(parts[0], 10);
          fyDay = parseInt(parts[1], 10);
        }
      }
      const updateData: Record<string, any> = {
        name: formData.companyName,
        neq: formData.neq || null,
        business_number: formData.bn || null,
        incorporation_date: formData.incorporationDate || null,
        province: formData.province || null,
      };
      if (fyMonth !== null) updateData.fiscal_year_end_month = fyMonth;
      if (fyDay !== null) updateData.fiscal_year_end_day = fyDay;

      const { error } = await (supabase as any)
        .from('organizations')
        .update(updateData)
        .eq('id', orgId);
      if (error) throw error;
      onSave();
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {saveError}
        </div>
      )}

      <Input
        label={t('companyName')}
        value={formData.companyName}
        onChange={(e) => handleChange('companyName', e.target.value)}
        placeholder="Enter company name"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label={t('neq')}
          value={formData.neq}
          onChange={(e) => handleChange('neq', e.target.value)}
          placeholder="Enter NEQ"
        />
        <Input
          label={t('bn')}
          value={formData.bn}
          onChange={(e) => handleChange('bn', e.target.value)}
          placeholder="Enter BN"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label={t('fiscalYearEnd')}
          type="text"
          value={formData.fiscalYearEnd}
          onChange={(e) => handleChange('fiscalYearEnd', e.target.value)}
          placeholder="MM-DD"
          helperText="Format: MM-DD (e.g., 12-31)"
        />
        <Input
          label={t('incorporationDate')}
          type="date"
          value={formData.incorporationDate}
          onChange={(e) => handleChange('incorporationDate', e.target.value)}
        />
      </div>

      <Select
        label={t('province')}
        options={provinceOptions}
        value={formData.province}
        onChange={(value) => handleChange('province', value as string)}
      />

      <Button onClick={handleSave} className="w-full" disabled={saving || !orgId}>
        {saving ? 'Saving...' : commonT('save')}
      </Button>
    </div>
  );
}

function TaxProfileTab({
  orgId,
  onSave,
}: {
  orgId: string | null;
  onSave: () => void;
}) {
  const t = useTranslations('settings');
  const commonT = useTranslations('common');
  const supabase = createClient();
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<TaxFormData>({
    corporationType: 'ccpc',
    smallBusinessLimit: '500000',
    gripBalance: '0',
    cdaBalance: '0',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load existing tax profile for current year
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('tax_profiles')
        .select('corporation_type, small_business_limit, grip_balance, cda_balance')
        .eq('organization_id', orgId)
        .eq('tax_year', currentYear)
        .single();
      if (data) {
        setFormData({
          corporationType: data.corporation_type ?? 'ccpc',
          smallBusinessLimit: String(data.small_business_limit ?? 500000),
          gripBalance: String(data.grip_balance ?? 0),
          cdaBalance: String(data.cda_balance ?? 0),
        });
      }
      setLoading(false);
    })();
  }, [orgId]);

  const handleChange = (field: keyof TaxFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        organization_id: orgId,
        tax_year: currentYear,
        corporation_type: formData.corporationType,
        small_business_limit: parseFloat(formData.smallBusinessLimit) || 500000,
        grip_balance: parseFloat(formData.gripBalance) || 0,
        cda_balance: parseFloat(formData.cdaBalance) || 0,
      };
      const { error } = await (supabase as any)
        .from('tax_profiles')
        .upsert(payload, { onConflict: 'organization_id,tax_year' });
      if (error) throw error;
      onSave();
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-tenir-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {saveError}
        </div>
      )}

      <Select
        label={t('corporationType')}
        options={corporationTypes}
        value={formData.corporationType}
        onChange={(value) => handleChange('corporationType', value as string)}
      />

      <Input
        label={t('smallBusinessLimit')}
        type="number"
        value={formData.smallBusinessLimit}
        onChange={(e) => handleChange('smallBusinessLimit', e.target.value)}
        placeholder="500000"
        helperText="Plafond annuel de la déduction pour petite entreprise (fédéral)"
      />

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-1">{t('accountBalances') || 'Soldes de compte'}</h3>
        <p className="text-xs text-gray-500 mb-4">
          Soldes d'ouverture pour l'année fiscale {currentYear} — utilisés dans le calcul d'impôt.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('grip')}
            </label>
            <Input
              type="number"
              value={formData.gripBalance}
              onChange={(e) => handleChange('gripBalance', e.target.value)}
              placeholder="0"
              helperText="IMRTD-déterminés — admissible au crédit d'impôt bonifié sur dividende"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('cda')}
            </label>
            <Input
              type="number"
              value={formData.cdaBalance}
              onChange={(e) => handleChange('cdaBalance', e.target.value)}
              placeholder="0"
              helperText="Compte de dividendes en capital — disponible pour distribution non imposable"
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" disabled={saving || !orgId}>
        {saving ? commonT('loading') || 'Sauvegarde…' : commonT('save')}
      </Button>
    </div>
  );
}

function IntegrationsTab() {
  const t = useTranslations('settings');

  return (
    <div className="space-y-6">
      {/* Plaid Bank Connection */}
      <Card padding="md" shadow="sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00B8D9]/10 flex items-center justify-center flex-shrink-0">
              {/* Plaid logo approximation */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#00B8D9]">
                <rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="1"/>
                <rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.7"/>
                <rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.7"/>
                <rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.4"/>
              </svg>
            </div>
            <div>
              <CardTitle level="h3">{t('bankConnection')}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Connectez vos comptes bancaires et cartes de crédit via Plaid pour importer automatiquement vos transactions.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PlaidLinkButton />
        </CardContent>
      </Card>

      {/* Google Drive Integration */}
      <Card padding="md" shadow="sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Globe2 size={24} className="text-blue-600" />
            <div>
              <CardTitle level="h3">Google Drive</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Importez vos reçus automatiquement depuis Google Drive (bientôt disponible)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 italic">Prochainement</p>
            <Button variant="outline" disabled>
              Connecter Google Drive
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Scanning */}
      <Card padding="md" shadow="sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail size={24} className="text-green-600" />
            <div>
              <CardTitle level="h3">{t('emailScanning')}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Détection automatique de reçus dans vos courriels (bientôt disponible)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 italic">Prochainement</p>
            <Button variant="outline" disabled>
              Activer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LanguageTab({ onSave }: { onSave: () => void }) {
  const t = useTranslations('settings');
  const commonT = useTranslations('common');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  return (
    <div className="space-y-6">
      <div className="bg-tenir-50 p-4 rounded-lg border border-tenir-200 mb-6">
        <p className="text-sm text-tenir-900">
          {t('languagePreference')}
        </p>
      </div>

      <Select
        label={t('selectLanguage')}
        options={languageOptions}
        value={selectedLanguage}
        onChange={setSelectedLanguage}
      />

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-2">Language Details</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Interface language will change immediately</li>
          <li>• Date and currency formats will adjust to your locale</li>
          <li>• All forms and reports will be generated in the selected language</li>
        </ul>
      </div>

      <Button onClick={onSave} className="w-full">
        {commonT('save')}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { org, orgId, loading: orgLoading } = useOrganization();
  const [activeTab, setActiveTab] = useState('company');
  const [savedMessage, setSavedMessage] = useState('');

  const handleSave = () => {
    setSavedMessage(t('changeSaved'));
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('title')} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Success Message */}
          {savedMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <Check size={18} />
                <span>{savedMessage}</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Card padding="none" shadow="sm" className="mb-8">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 lg:p-8">
              {orgLoading ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : (
                <>
                  {activeTab === 'company' && (
                    <CompanyInfoTab org={org} orgId={orgId} onSave={handleSave} />
                  )}
                  {activeTab === 'taxProfile' && (
                    <TaxProfileTab orgId={orgId} onSave={handleSave} />
                  )}
                  {activeTab === 'integrations' && (
                    <IntegrationsTab />
                  )}
                  {activeTab === 'language' && (
                    <LanguageTab onSave={handleSave} />
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
