'use client';

import React, { useState, useEffect, useCallback } from 'react'; // useCallback used in fetchAll
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  Plus, Building2, User, ArrowRight, Edit2, Trash2, GitBranch,
  TrendingUp, DollarSign, AlertTriangle, ChevronRight as ChevronRightIcon,
  X, Info, Loader2, ArrowUpRight, ArrowDownLeft, RefreshCw, Clock,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

const EntityGraph = dynamic(() => import('./entity-graph'), {
  ssr: false,
  loading: () => <div style={{ height: 420 }} className="rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />,
});

// ─── NativeSelect ─────────────────────────────────────────────────────────────

function NativeSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          'appearance-none cursor-pointer bg-white text-gray-800',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
          className
        )}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L1 3h10L6 8z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityType = 'corporation' | 'individual';
type CorporationType = 'ccpc' | 'general' | 'professional' | 'holding' | 'operating' | 'other';

interface Entity {
  id: string;
  organization_id: string;
  name: string;
  entity_type: EntityType;
  neq: string | null;
  business_number: string | null;
  incorporation_date: string | null;
  province: string | null;
  corporation_type: CorporationType | null;
  sin_last4: string | null;
  is_shareholder: boolean;
  is_current_org: boolean;
  notes: string | null;
  created_at: string;
}

interface EntityRelation {
  id: string;
  parent_entity_id: string;
  child_entity_id: string;
  ownership_percentage: number;
  share_class: string | null;
  num_shares: number | null;
  share_value: number | null;
  effective_date: string;
  end_date: string | null;
  notes: string | null;
  parent_entity?: Pick<Entity, 'id' | 'name' | 'entity_type' | 'corporation_type'>;
  child_entity?: Pick<Entity, 'id' | 'name' | 'entity_type' | 'corporation_type'>;
}

type FlowType =
  | 'dividend_eligible'
  | 'dividend_non_eligible'
  | 'dividend_capital'
  | 'shareholder_loan'
  | 'loan_repayment'
  | 'advance'
  | 'advance_repayment'
  | 'management_fee'
  | 'capital_contribution';

type FlowStatus = 'recorded' | 'confirmed' | 'overdue' | 'repaid' | 'cancelled';

interface FinancialFlow {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  flow_type: FlowType;
  amount: number;
  currency: string;
  date: string;
  fiscal_year: number | null;
  is_open_balance: boolean;
  outstanding_balance: number | null;
  interest_rate: number | null;
  due_date: string | null;
  rdtoh_refund_eligible: number | null;
  grip_impact: number | null;
  status: FlowStatus;
  description: string | null;
  notes: string | null;
  document_ref: string | null;
  from_entity?: Pick<Entity, 'id' | 'name' | 'entity_type' | 'corporation_type'>;
  to_entity?: Pick<Entity, 'id' | 'name' | 'entity_type' | 'corporation_type'>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FLOW_TYPE_LABELS: Record<FlowType, { fr: string; en: string; color: string }> = {
  dividend_eligible:     { fr: 'Dividende déterminé',    en: 'Eligible dividend',       color: 'emerald' },
  dividend_non_eligible: { fr: 'Dividende non déterminé', en: 'Non-eligible dividend',  color: 'blue' },
  dividend_capital:      { fr: 'Dividende en capital',    en: 'Capital dividend',        color: 'violet' },
  shareholder_loan:      { fr: 'Prêt actionnaire',        en: 'Shareholder loan',        color: 'amber' },
  loan_repayment:        { fr: 'Remb. prêt',              en: 'Loan repayment',          color: 'teal' },
  advance:               { fr: 'Avance',                  en: 'Advance',                 color: 'orange' },
  advance_repayment:     { fr: 'Remb. avance',            en: 'Advance repayment',       color: 'cyan' },
  management_fee:        { fr: 'Frais de gestion',        en: 'Management fee',          color: 'rose' },
  capital_contribution:  { fr: 'Apport en capital',       en: 'Capital contribution',    color: 'indigo' },
};

const FLOW_TYPE_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  violet:  'bg-violet-50 text-violet-700 border-violet-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  teal:    'bg-teal-50 text-teal-700 border-teal-200',
  orange:  'bg-orange-50 text-orange-700 border-orange-200',
  cyan:    'bg-cyan-50 text-cyan-700 border-cyan-200',
  rose:    'bg-rose-50 text-rose-700 border-rose-200',
  indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const FLOW_STATUS_STYLES: Record<FlowStatus, string> = {
  recorded:  'bg-gray-50 text-gray-600 border-gray-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  overdue:   'bg-red-50 text-red-700 border-red-200',
  repaid:    'bg-slate-50 text-slate-500 border-slate-200',
  cancelled: 'bg-gray-50 text-gray-400 border-gray-200',
};

function getFlowLabel(type: FlowType, locale: string): string {
  const entry = FLOW_TYPE_LABELS[type];
  return locale === 'fr' ? entry.fr : entry.en;
}

function isLoanLike(type: FlowType): boolean {
  return ['shareholder_loan', 'advance'].includes(type);
}

function isDividend(type: FlowType): boolean {
  return type.startsWith('dividend_');
}

interface EntityGraphProps {
  entities: Entity[];
  relations: EntityRelation[];
  flows: FinancialFlow[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
}



// ─── Flow Badge ───────────────────────────────────────────────────────────────

function FlowTypeBadge({ type, locale }: { type: FlowType; locale: string }) {
  const info = FLOW_TYPE_LABELS[type];
  const colorClass = FLOW_TYPE_COLORS[info.color];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', colorClass)}>
      {locale === 'fr' ? info.fr : info.en}
    </span>
  );
}

// ─── Entity Card (side panel) ─────────────────────────────────────────────────

function EntityCard({
  entity,
  flows,
  locale,
  onEdit,
  onDelete,
}: {
  entity: Entity;
  flows: FinancialFlow[];
  locale: string;
  onEdit: (e: Entity) => void;
  onDelete: (id: string) => void;
}) {
  const entityFlows = flows.filter(
    (f) => f.from_entity_id === entity.id || f.to_entity_id === entity.id
  );

  const totalOut = entityFlows
    .filter((f) => f.from_entity_id === entity.id)
    .reduce((s, f) => s + f.amount, 0);

  const totalIn = entityFlows
    .filter((f) => f.to_entity_id === entity.id)
    .reduce((s, f) => s + f.amount, 0);

  const hasOverdue = entityFlows.some((f) => f.status === 'overdue');

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white',
          entity.entity_type === 'individual' ? 'bg-sky-500' : entity.is_current_org ? 'bg-indigo-600' : 'bg-slate-700'
        )}>
          {entity.entity_type === 'individual' ? <User size={18} /> : <Building2 size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{entity.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {entity.entity_type === 'individual' ? 'Particulier' : entity.corporation_type ?? 'Société'}
          </p>
          {entity.is_current_org && (
            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
              <RefreshCw size={9} />
              Synchro. Paramètres
            </span>
          )}
        </div>
        {!entity.is_current_org && (
          <div className="flex gap-1.5">
            <button onClick={() => onEdit(entity)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <Edit2 size={14} />
            </button>
            <button onClick={() => onDelete(entity.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-600 font-medium mb-0.5">Entrant</p>
          <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalIn)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3">
          <p className="text-xs text-red-500 font-medium mb-0.5">Sortant</p>
          <p className="text-sm font-bold text-red-600">{formatCurrency(totalOut)}</p>
        </div>
      </div>

      {hasOverdue && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
          <AlertTriangle size={13} className="flex-shrink-0" />
          <span>Un ou plusieurs flux sont en souffrance (prêt non remboursé)</span>
        </div>
      )}

      {entity.neq && <p className="text-xs text-gray-500">NEQ: {entity.neq}</p>}
      {entity.business_number && <p className="text-xs text-gray-500">NE: {entity.business_number}</p>}

      {entityFlows.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Flux récents</p>
          <div className="space-y-1.5">
            {entityFlows.slice(0, 4).map((f) => {
              const isOut = f.from_entity_id === entity.id;
              return (
                <div key={f.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  {isOut
                    ? <ArrowUpRight size={13} className="text-red-400 flex-shrink-0" />
                    : <ArrowDownLeft size={13} className="text-emerald-500 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 font-medium truncate">
                      {isOut ? `→ ${f.to_entity?.name ?? '—'}` : `← ${f.from_entity?.name ?? '—'}`}
                    </p>
                    <FlowTypeBadge type={f.flow_type} locale={locale} />
                  </div>
                  <span className={cn('text-xs font-semibold flex-shrink-0', isOut ? 'text-red-600' : 'text-emerald-600')}>
                    {formatCurrency(f.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Entity Form Modal ────────────────────────────────────────────────────────

interface EntityFormData {
  name: string;
  entity_type: EntityType;
  neq: string;
  business_number: string;
  incorporation_date: string;
  province: string;
  corporation_type: string;
  sin_last4: string;
  is_shareholder: boolean;
  notes: string;
}

const EMPTY_ENTITY_FORM: EntityFormData = {
  name: '',
  entity_type: 'corporation',
  neq: '',
  business_number: '',
  incorporation_date: '',
  province: 'QC',
  corporation_type: '',
  sin_last4: '',
  is_shareholder: true,
  notes: '',
};

function EntityFormModal({
  isOpen,
  onClose,
  initial,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initial: Entity | null;
  onSave: (data: EntityFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<EntityFormData>(EMPTY_ENTITY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        entity_type: initial.entity_type,
        neq: initial.neq ?? '',
        business_number: initial.business_number ?? '',
        incorporation_date: initial.incorporation_date ?? '',
        province: initial.province ?? 'QC',
        corporation_type: initial.corporation_type ?? '',
        sin_last4: initial.sin_last4 ?? '',
        is_shareholder: initial.is_shareholder,
        notes: initial.notes ?? '',
      });
    } else {
      setForm(EMPTY_ENTITY_FORM);
    }
    setError(null);
  }, [initial, isOpen]);

  const set = (key: keyof EntityFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est requis'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const isCorp = form.entity_type === 'corporation';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? "Modifier l'entité" : 'Nouvelle entité'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type d'entité *</label>
          <NativeSelect value={form.entity_type} onChange={(v) => setForm((f) => ({ ...f, entity_type: v as EntityType }))}>
            <option value="corporation">Personne morale (société)</option>
            <option value="individual">Personne physique (particulier)</option>
          </NativeSelect>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
          <Input value={form.name} onChange={set('name')} placeholder={isCorp ? '9999-9999 Québec Inc.' : 'Prénom Nom'} required />
        </div>

        {isCorp && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de société</label>
                <NativeSelect value={form.corporation_type} onChange={(v) => setForm((f) => ({ ...f, corporation_type: v }))}>
                  <option value="">Sélectionner…</option>
                  <option value="holding">Société de portefeuille (holding)</option>
                  <option value="operating">Société opérante (opco)</option>
                  <option value="ccpc">SPCC</option>
                  <option value="professional">Société professionnelle</option>
                  <option value="general">Société par actions générale</option>
                  <option value="other">Autre</option>
                </NativeSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <NativeSelect value={form.province} onChange={(v) => setForm((f) => ({ ...f, province: v }))}>
                  <option value="QC">Québec</option>
                  <option value="ON">Ontario</option>
                  <option value="BC">Colombie-Britannique</option>
                  <option value="AB">Alberta</option>
                  <option value="federal">Fédéral</option>
                  <option value="other">Autre</option>
                </NativeSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NEQ</label>
                <Input value={form.neq} onChange={set('neq')} placeholder="1234567890" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro d'entreprise (fédéral)</label>
                <Input value={form.business_number} onChange={set('business_number')} placeholder="123456789 RC 0001" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de constitution</label>
              <Input type="date" value={form.incorporation_date} onChange={set('incorporation_date')} />
            </div>
          </>
        )}

        {!isCorp && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">4 derniers chiffres du NAS (optionnel)</label>
            <Input value={form.sin_last4} onChange={set('sin_last4')} placeholder="1234" maxLength={4} />
            <p className="text-xs text-gray-400 mt-1">Uniquement les 4 derniers chiffres — à titre d'identifiant, jamais le NAS complet.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Notes internes…"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
            <AlertTriangle size={14} /><span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button type="submit" isLoading={saving}>{initial ? 'Enregistrer' : "Créer l'entité"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Relation Form Modal ──────────────────────────────────────────────────────

interface RelationFormData {
  parent_entity_id: string;
  child_entity_id: string;
  ownership_percentage: string;
  share_class: string;
  num_shares: string;
  share_value: string;
  effective_date: string;
  end_date: string;
  notes: string;
}

function RelationFormModal({
  isOpen,
  onClose,
  entities,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  onSave: (data: RelationFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<RelationFormData>({
    parent_entity_id: '',
    child_entity_id: '',
    ownership_percentage: '100',
    share_class: 'A',
    num_shares: '',
    share_value: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) setError(null);
  }, [isOpen]);

  const set = (key: keyof RelationFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.parent_entity_id || !form.child_entity_id) {
      setError('Sélectionnez les deux entités'); return;
    }
    if (form.parent_entity_id === form.child_entity_id) {
      setError('Une entité ne peut pas se posséder elle-même'); return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle relation de participation" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700">
          <strong>Participation :</strong> l'entité parente détient des actions dans l'entité enfant.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entité parente (actionnaire)</label>
            <NativeSelect value={form.parent_entity_id} onChange={(v) => setForm((f) => ({ ...f, parent_entity_id: v }))}>
              <option value="">Sélectionner…</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entité détenue (filiale)</label>
            <NativeSelect value={form.child_entity_id} onChange={(v) => setForm((f) => ({ ...f, child_entity_id: v }))}>
              <option value="">Sélectionner…</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </NativeSelect>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">% de participation</label>
            <Input type="number" min="0.01" max="100" step="0.01" value={form.ownership_percentage} onChange={set('ownership_percentage')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie d'actions</label>
            <Input value={form.share_class} onChange={set('share_class')} placeholder="A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nb d'actions</label>
            <Input type="number" value={form.num_shares} onChange={set('num_shares')} placeholder="100" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'entrée *</label>
            <Input type="date" value={form.effective_date} onChange={set('effective_date')} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de sortie (si applicable)</label>
            <Input type="date" value={form.end_date} onChange={set('end_date')} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
            <AlertTriangle size={14} /><span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button type="submit" isLoading={saving}>Créer la relation</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Flow Form Modal ──────────────────────────────────────────────────────────

interface FlowFormData {
  from_entity_id: string;
  to_entity_id: string;
  flow_type: FlowType;
  amount: string;
  currency: string;
  date: string;
  fiscal_year: string;
  is_open_balance: boolean;
  interest_rate: string;
  due_date: string;
  description: string;
  notes: string;
}

const EMPTY_FLOW: FlowFormData = {
  from_entity_id: '',
  to_entity_id: '',
  flow_type: 'dividend_eligible',
  amount: '',
  currency: 'CAD',
  date: new Date().toISOString().split('T')[0],
  fiscal_year: String(new Date().getFullYear()),
  is_open_balance: false,
  interest_rate: '',
  due_date: '',
  description: '',
  notes: '',
};

const FLOW_FISCAL_NOTES: Partial<Record<FlowType, string>> = {
  dividend_eligible:
    "Art. 112 LIR : dividende déterminé inter-sociétés généralement reçu sans impôt immédiat. L'Opco peut récupérer 38,33 % via l'IMRTD-déterminés lors du versement.",
  dividend_non_eligible:
    "Dividende non déterminé : traitement similaire art. 112 pour les sociétés. L'Opco récupère via l'IMRTD-non-déterminés.",
  dividend_capital:
    "Dividende en capital (CDC) : non imposable pour le bénéficiaire s'il y a un solde suffisant dans le compte de dividendes en capital.",
  shareholder_loan:
    "Art. 15(2) LIR : si le prêt n'est pas remboursé avant la fin de l'année fiscale suivante, le montant sera inclus dans le revenu de l'actionnaire. Un taux d'intérêt prescrit (5 % en 2025/2026) doit s'appliquer pour éviter un avantage imposable.",
  advance:
    "Avance inter-sociétés : doit respecter les conditions d'affaires normales (taux d'intérêt approprié, terme raisonnable) pour éviter les règles sur les prix de transfert.",
  management_fee:
    "Frais de gestion : déductibles pour la payante si justifiés par des services réels rendus. Doivent refléter la juste valeur marchande.",
};

function FlowFormModal({
  isOpen,
  onClose,
  entities,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  onSave: (data: FlowFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<FlowFormData>(EMPTY_FLOW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) { setForm(EMPTY_FLOW); setError(null); }
  }, [isOpen]);

  const set = (key: keyof FlowFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const needsLoanFields = isLoanLike(form.flow_type);
  const fiscalNote = FLOW_FISCAL_NOTES[form.flow_type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from_entity_id || !form.to_entity_id || !form.amount || !form.date) {
      setError('Remplissez tous les champs obligatoires'); return;
    }
    if (form.from_entity_id === form.to_entity_id) {
      setError("L'entité source et destination doivent être différentes"); return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enregistrer un flux financier" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de flux *</label>
          <NativeSelect value={form.flow_type} onChange={(v) => setForm((f) => ({ ...f, flow_type: v as FlowType }))}>
            <optgroup label="Dividendes">
              <option value="dividend_eligible">Dividende déterminé (art. 112 LIR)</option>
              <option value="dividend_non_eligible">Dividende non déterminé</option>
              <option value="dividend_capital">Dividende en capital (CDC)</option>
            </optgroup>
            <optgroup label="Prêts et avances">
              <option value="shareholder_loan">Prêt à l'actionnaire (art. 15(2) LIR)</option>
              <option value="loan_repayment">Remboursement de prêt actionnaire</option>
              <option value="advance">Avance inter-sociétés</option>
              <option value="advance_repayment">Remboursement d'avance</option>
            </optgroup>
            <optgroup label="Autres flux">
              <option value="management_fee">Frais de gestion inter-sociétés</option>
              <option value="capital_contribution">Apport en capital</option>
            </optgroup>
          </NativeSelect>
        </div>

        {fiscalNote && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <Info size={13} className="flex-shrink-0 mt-0.5" />
            <span>{fiscalNote}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">De (source) *</label>
            <NativeSelect value={form.from_entity_id} onChange={(v) => setForm((f) => ({ ...f, from_entity_id: v }))}>
              <option value="">Sélectionner…</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vers (destination) *</label>
            <NativeSelect value={form.to_entity_id} onChange={(v) => setForm((f) => ({ ...f, to_entity_id: v }))}>
              <option value="">Sélectionner…</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </NativeSelect>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (CAD) *</label>
            <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} placeholder="10 000,00" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année fiscale</label>
            <Input type="number" value={form.fiscal_year} onChange={set('fiscal_year')} min="2000" max="2100" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date du flux *</label>
          <Input type="date" value={form.date} onChange={set('date')} required />
        </div>

        {needsLoanFields && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Détails du prêt / avance</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taux d'intérêt annuel (%)</label>
                <Input type="number" min="0" step="0.01" value={form.interest_rate} onChange={set('interest_rate')} placeholder="5.00 (taux prescrit ARC)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
                <Input type="date" value={form.due_date} onChange={set('due_date')} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_open_balance}
                onChange={(e) => setForm((f) => ({ ...f, is_open_balance: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Solde ouvert (remboursement en cours)
            </label>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <Input value={form.description} onChange={set('description')} placeholder="Ex. : dividende Q3 2025" />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
            <AlertTriangle size={14} /><span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button type="submit" isLoading={saving}>Enregistrer le flux</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EntitiesPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'fr';
  const { orgId, loading: orgLoading } = useOrganization();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<EntityRelation[]>([]);
  const [flows, setFlows] = useState<FinancialFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'flows' | 'structure'>('graph');

  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [flowFilter, setFlowFilter] = useState<FlowType | 'all'>('all');

  const fetchAll = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [entitiesRes, relationsRes, flowsRes] = await Promise.all([
        fetch('/api/entities'),
        fetch('/api/entity-relations'),
        fetch('/api/financial-flows'),
      ]);

      if (!entitiesRes.ok) throw new Error('Erreur lors du chargement des entités');
      if (!relationsRes.ok) throw new Error('Erreur lors du chargement des relations');
      if (!flowsRes.ok) throw new Error('Erreur lors du chargement des flux');

      const [e, r, f] = await Promise.all([
        entitiesRes.json(),
        relationsRes.json(),
        flowsRes.json(),
      ]);

      setEntities(e.entities ?? []);
      setRelations(r.relations ?? []);
      setFlows(f.flows ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgLoading && orgId) fetchAll();
  }, [orgLoading, orgId, fetchAll]);

  // ── CRUD handlers ──

  const handleSaveEntity = async (data: EntityFormData) => {
    const method = editingEntity ? 'PATCH' : 'POST';
    const url = editingEntity ? `/api/entities/${editingEntity.id}` : '/api/entities';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, ownership_percentage: undefined }),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? 'Erreur serveur');
    }
    await fetchAll();
    setEditingEntity(null);
  };

  const handleDeleteEntity = async (id: string) => {
    if (!confirm('Supprimer cette entité? Les relations et flux associés seront aussi supprimés.')) return;
    await fetch(`/api/entities/${id}`, { method: 'DELETE' });
    if (selectedEntityId === id) setSelectedEntityId(null);
    await fetchAll();
  };

  const handleSaveRelation = async (data: RelationFormData) => {
    const res = await fetch('/api/entity-relations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        ownership_percentage: parseFloat(data.ownership_percentage),
        num_shares: data.num_shares ? parseInt(data.num_shares) : null,
        share_value: data.share_value ? parseFloat(data.share_value) : null,
      }),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? 'Erreur serveur');
    }
    await fetchAll();
  };

  const handleSaveFlow = async (data: FlowFormData) => {
    const res = await fetch('/api/financial-flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_entity_id: data.from_entity_id,
        to_entity_id: data.to_entity_id,
        flow_type: data.flow_type,
        amount: parseFloat(data.amount),
        currency: data.currency,
        date: data.date,
        fiscal_year: data.fiscal_year ? parseInt(data.fiscal_year) : null,
        is_open_balance: data.is_open_balance,
        interest_rate: data.interest_rate ? parseFloat(data.interest_rate) : null,
        due_date: data.due_date || null,
        description: data.description || null,
        notes: data.notes || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? 'Erreur serveur');
    }
    await fetchAll();
  };

  const handleDeleteFlow = async (id: string) => {
    if (!confirm('Supprimer ce flux financier?')) return;
    await fetch(`/api/financial-flows/${id}`, { method: 'DELETE' });
    await fetchAll();
  };

  const handleMarkOverdue = async (id: string) => {
    await fetch(`/api/financial-flows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'overdue' }),
    });
    await fetchAll();
  };

  // ── Derived data ──

  const selectedEntity = entities.find((e) => e.id === selectedEntityId) ?? null;

  const filteredFlows = flowFilter === 'all' ? flows : flows.filter((f) => f.flow_type === flowFilter);

  const totalDividends = flows
    .filter((f) => isDividend(f.flow_type))
    .reduce((s, f) => s + f.amount, 0);

  const openLoans = flows.filter((f) => isLoanLike(f.flow_type) && f.is_open_balance && f.status !== 'repaid');
  const totalOpenLoanAmount = openLoans.reduce((s, f) => s + (f.outstanding_balance ?? f.amount), 0);
  const overdueCount = flows.filter((f) => f.status === 'overdue').length;

  const today = new Date().toISOString().split('T')[0];

  // ── Render ──

  if (orgLoading || loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Structure et flux" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Structure et flux inter-entités"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchAll} icon={<RefreshCw size={14} />}>
              Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRelationModalOpen(true)} icon={<GitBranch size={14} />}>
              Relation
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setEditingEntity(null); setEntityModalOpen(true); }} icon={<Plus size={14} />}>
              Entité
            </Button>
            <Button size="sm" onClick={() => setFlowModalOpen(true)} icon={<ArrowRight size={14} />}>
              Flux financier
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertTriangle size={14} /><span>{error}</span>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card padding="sm" shadow="sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Building2 size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Entités</p>
                <p className="text-lg font-bold text-gray-900">{entities.length}</p>
              </div>
            </div>
          </Card>

          <Card padding="sm" shadow="sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Dividendes (total)</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalDividends)}</p>
              </div>
            </div>
          </Card>

          <Card padding="sm" shadow="sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <DollarSign size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Prêts/Avances ouverts</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalOpenLoanAmount)}</p>
              </div>
            </div>
          </Card>

          <Card padding="sm" shadow="sm">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', overdueCount > 0 ? 'bg-red-50' : 'bg-gray-50')}>
                <AlertTriangle size={16} className={overdueCount > 0 ? 'text-red-500' : 'text-gray-400'} />
              </div>
              <div>
                <p className="text-xs text-gray-500">En souffrance</p>
                <p className={cn('text-lg font-bold', overdueCount > 0 ? 'text-red-600' : 'text-gray-900')}>{overdueCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main layout: tabs + side panel */}
        <div className="flex gap-5">

          <div className="flex-1 min-w-0 space-y-4">

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {(['graph', 'flows', 'structure'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                    activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab === 'graph' && 'Graphe'}
                  {tab === 'flows' && `Flux financiers (${flows.length})`}
                  {tab === 'structure' && 'Structure'}
                </button>
              ))}
            </div>

            {/* Tab: Graph */}
            {activeTab === 'graph' && (
              <Card padding="md" shadow="sm">
                <CardHeader>
                  <CardTitle>Visualisation de la structure</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cliquez sur une entité pour voir ses détails. Flèches pleines = participation · Flèches pointillées = flux financiers.
                  </p>
                </CardHeader>
                <CardContent>
                  {entities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <GitBranch size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-medium text-gray-500">Aucune entité configurée</p>
                      <p className="text-xs text-gray-400 mt-1 mb-4">Commencez par ajouter l'entité courante, puis les actionnaires et filiales.</p>
                      <Button size="sm" onClick={() => setEntityModalOpen(true)} icon={<Plus size={14} />}>
                        Ajouter une entité
                      </Button>
                    </div>
                  ) : (
                    <EntityGraph
                      entities={entities}
                      relations={relations}
                      flows={flows}
                      selectedEntityId={selectedEntityId}
                      onSelectEntity={setSelectedEntityId}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tab: Flows */}
            {activeTab === 'flows' && (
              <Card padding="none" shadow="sm">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                  <CardTitle>Flux financiers</CardTitle>
                  <div className="flex-1" />
                  <NativeSelect value={flowFilter} onChange={(v) => setFlowFilter(v as FlowType | 'all')} className="w-48">
                    <option value="all">Tous les types</option>
                    <optgroup label="Dividendes">
                      <option value="dividend_eligible">Dividende déterminé</option>
                      <option value="dividend_non_eligible">Dividende non déterminé</option>
                      <option value="dividend_capital">Dividende en capital</option>
                    </optgroup>
                    <optgroup label="Prêts et avances">
                      <option value="shareholder_loan">Prêt actionnaire</option>
                      <option value="loan_repayment">Remb. prêt</option>
                      <option value="advance">Avance</option>
                      <option value="advance_repayment">Remb. avance</option>
                    </optgroup>
                    <optgroup label="Autres">
                      <option value="management_fee">Frais de gestion</option>
                      <option value="capital_contribution">Apport en capital</option>
                    </optgroup>
                  </NativeSelect>
                </div>

                {filteredFlows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <ArrowRight size={40} className="mb-3 opacity-20" />
                    <p className="text-sm">Aucun flux enregistré</p>
                    <p className="text-xs mt-1 opacity-70">Cliquez sur "Flux financier" pour en ajouter un</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredFlows.map((flow) => {
                      const isOverdue = flow.status === 'overdue';
                      const canMarkOverdue =
                        isLoanLike(flow.flow_type) &&
                        flow.due_date !== null &&
                        flow.due_date < today &&
                        !['overdue', 'repaid', 'cancelled'].includes(flow.status);

                      return (
                        <div key={flow.id} className={cn('px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors', isOverdue && 'bg-red-50/50')}>
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {isDividend(flow.flow_type)
                              ? <TrendingUp size={14} className="text-emerald-600" />
                              : isLoanLike(flow.flow_type)
                              ? <DollarSign size={14} className="text-amber-600" />
                              : <ArrowRight size={14} className="text-gray-500" />
                            }
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <FlowTypeBadge type={flow.flow_type} locale={locale} />
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', FLOW_STATUS_STYLES[flow.status])}>
                                {flow.status === 'recorded' ? 'Enregistré'
                                  : flow.status === 'confirmed' ? 'Confirmé'
                                  : flow.status === 'overdue' ? 'En souffrance'
                                  : flow.status === 'repaid' ? 'Remboursé'
                                  : 'Annulé'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                              <span className="font-medium truncate">{flow.from_entity?.name ?? '—'}</span>
                              <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                              <span className="font-medium truncate">{flow.to_entity?.name ?? '—'}</span>
                            </div>
                            {flow.description && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{flow.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span>{formatDate(flow.date, locale === 'fr' ? 'fr-CA' : 'en-CA')}</span>
                              {flow.fiscal_year && <span>AO {flow.fiscal_year}</span>}
                              {flow.rdtoh_refund_eligible && (
                                <span className="text-indigo-500">IMRTD: {formatCurrency(flow.rdtoh_refund_eligible)}</span>
                              )}
                              {flow.due_date && (
                                <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                  Échéance: {formatDate(flow.due_date, locale === 'fr' ? 'fr-CA' : 'en-CA')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p className="text-base font-bold text-gray-900">{formatCurrency(flow.amount)}</p>
                            {canMarkOverdue && (
                              <button
                                onClick={() => handleMarkOverdue(flow.id)}
                                title="Marquer en souffrance"
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                              >
                                <Clock size={11} />
                                <span className="hidden sm:inline">En souffrance</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteFlow(flow.id)}
                              className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* Tab: Structure */}
            {activeTab === 'structure' && (
              <Card padding="none" shadow="sm">
                <div className="px-6 py-4 border-b border-gray-50">
                  <CardTitle>Relations de participation</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Qui détient quoi, et à quel pourcentage.</p>
                </div>
                {relations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <GitBranch size={40} className="mb-3 opacity-20" />
                    <p className="text-sm">Aucune relation définie</p>
                    <p className="text-xs mt-1 opacity-70">Cliquez sur "Relation" pour lier deux entités</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {relations.map((r) => (
                      <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{r.parent_entity?.name ?? r.parent_entity_id}</span>
                          <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5 font-semibold">
                            <span>{r.ownership_percentage}%</span>
                            {r.share_class && <span>Cat. {r.share_class}</span>}
                          </div>
                          <ArrowRight size={12} className="text-gray-400" />
                          <span className="font-medium text-sm text-gray-900">{r.child_entity?.name ?? r.child_entity_id}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Depuis {formatDate(r.effective_date, locale === 'fr' ? 'fr-CA' : 'en-CA')}
                          {r.end_date && ` → ${formatDate(r.end_date, locale === 'fr' ? 'fr-CA' : 'en-CA')}`}
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('Supprimer cette relation?')) return;
                            await fetch(`/api/entity-relations/${r.id}`, { method: 'DELETE' });
                            fetchAll();
                          }}
                          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right: entity side panel */}
          <div className="w-72 flex-shrink-0">
            {selectedEntity ? (
              <Card padding="md" shadow="sm" className="sticky top-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Entité sélectionnée</p>
                  <button onClick={() => setSelectedEntityId(null)} className="text-gray-300 hover:text-gray-500">
                    <X size={14} />
                  </button>
                </div>
                <EntityCard
                  entity={selectedEntity}
                  flows={flows}
                  locale={locale}
                  onEdit={(e) => { setEditingEntity(e); setEntityModalOpen(true); }}
                  onDelete={handleDeleteEntity}
                />
              </Card>
            ) : (
              <Card padding="md" shadow="none" className="sticky top-6 border-dashed border-gray-200">
                <div className="flex flex-col items-center text-center py-6 text-gray-400">
                  <GitBranch size={28} className="mb-2 opacity-30" />
                  <p className="text-xs">Sélectionnez une entité dans le graphe pour voir ses détails et ses flux.</p>
                </div>

                {entities.length > 0 && (
                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Toutes les entités</p>
                    {entities.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedEntityId(e.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-sm hover:bg-gray-50 text-gray-700"
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                          e.entity_type === 'individual' ? 'bg-sky-50 text-sky-600' : e.is_current_org ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                        )}>
                          {e.entity_type === 'individual' ? <User size={13} /> : <Building2 size={13} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{e.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {e.is_current_org ? 'Entité courante' : e.entity_type === 'individual' ? 'Particulier' : e.corporation_type ?? 'Société'}
                          </p>
                        </div>
                        <ChevronRightIcon size={12} className="text-gray-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <EntityFormModal
        isOpen={entityModalOpen}
        onClose={() => { setEntityModalOpen(false); setEditingEntity(null); }}
        initial={editingEntity}
        onSave={handleSaveEntity}
      />

      <RelationFormModal
        isOpen={relationModalOpen}
        onClose={() => setRelationModalOpen(false)}
        entities={entities}
        onSave={handleSaveRelation}
      />

      <FlowFormModal
        isOpen={flowModalOpen}
        onClose={() => setFlowModalOpen(false)}
        entities={entities}
        onSave={handleSaveFlow}
      />
    </div>
  );
}
