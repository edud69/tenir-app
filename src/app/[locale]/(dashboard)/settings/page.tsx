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
  Landmark,
  Check,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { createClient } from '@/lib/supabase/client';

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Tab labels are set dynamically in the component using translations

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
  { value: 'qc', label: 'Québec' },
  { value: 'on', label: 'Ontario' },
  { value: 'bc', label: 'Colombie-Britannique / British Columbia' },
  { value: 'ab', label: 'Alberta' },
  { value: 'other', label: 'Autre / Other' },
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
          placeholder={t('enterNeq')}
        />
        <Input
          label={t('bn')}
          value={formData.bn}
          onChange={(e) => handleChange('bn', e.target.value)}
          placeholder={t('enterBn')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label={t('fiscalYearEnd')}
          type="text"
          value={formData.fiscalYearEnd}
          onChange={(e) => handleChange('fiscalYearEnd', e.target.value)}
          placeholder="MM-DD"
          helperText={t('fiscalYearHint')}
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

function TaxProfileTab({ onSave }: { onSave: () => void }) {
  const t = useTranslations('settings');
  const commonT = useTranslations('common');
  const [formData, setFormData] = useState<TaxFormData>({
    corporationType: 'ccpc',
    smallBusinessLimit: '500000',
    gripBalance: '0',
    cdaBalance: '0',
  });

  const corporationTypes = [
    { value: 'ccpc',    label: t('ccpc') },
    { value: 'general', label: t('generalCorporation') },
  ];

  const handleChange = (field: keyof TaxFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
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
        helperText={t('smallBusinessLimitHint')}
      />

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">{t('accountBalances')}</h3>
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
              helperText={t('gripHint')}
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
              helperText={t('cdaHint')}
            />
          </div>
        </div>
      </div>

      <Button onClick={onSave} className="w-full">
        {commonT('save')}
      </Button>
    </div>
  );
}

function IntegrationsTab() {
  const t = useTranslations('settings');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [emailScanningEnabled, setEmailScanningEnabled] = useState(false);

  return (
    <div className="space-y-6">
      {/* Google Drive Integration */}
      <Card padding="md" shadow="sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Globe2 size={24} className="text-blue-600" />
            <div>
              <CardTitle level="h3">Google Drive</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Connect your Google Drive to automatically import receipts
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {googleConnected && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check size={16} />
                  <span className="text-sm font-medium">Connected as john@example.com</span>
                </div>
              )}
              {!googleConnected && (
                <p className="text-sm text-gray-600">Not connected</p>
              )}
            </div>
            <Button
              variant={googleConnected ? 'outline' : 'primary'}
              onClick={() => setGoogleConnected(!googleConnected)}
            >
              {googleConnected ? 'Disconnect' : 'Connect Google Drive'}
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
                {t('enableEmailScanning')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {emailScanningEnabled && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check size={16} />
                  <span className="text-sm font-medium">Email scanning enabled</span>
                </div>
              )}
              {!emailScanningEnabled && (
                <p className="text-sm text-gray-600">Email scanning disabled</p>
              )}
            </div>
            <Button
              variant={emailScanningEnabled ? 'outline' : 'primary'}
              onClick={() => setEmailScanningEnabled(!emailScanningEnabled)}
            >
              {emailScanningEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bank Connection */}
      <Card padding="md" shadow="sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Landmark size={24} className="text-orange-600" />
            <div>
              <CardTitle level="h3">{t('bankConnection')}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Connect your bank account for automatic transaction import (Coming soon)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            {t('connectBank')}
          </Button>
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

  const tabs: TabProps[] = [
    { id: 'company',      label: t('tabs.company'),      icon: <Building2 size={20} /> },
    { id: 'taxProfile',   label: t('tabs.taxProfile'),   icon: <FileText size={20} /> },
    { id: 'integrations', label: t('tabs.integrations'), icon: <Zap size={20} /> },
    { id: 'language',     label: t('tabs.language'),     icon: <Globe size={20} /> },
  ];
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
                    <TaxProfileTab onSave={handleSave} />
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
