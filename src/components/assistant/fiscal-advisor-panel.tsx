'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Sparkles,
  AlertTriangle,
  Clock,
  TrendingUp,
  Printer,
  RotateCcw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import { useFiscalAdvisor } from '@/hooks/useFiscalAdvisor';

interface FiscalAdvisorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
}

const HORIZON_LABELS: Record<string, Record<string, string>> = {
  fr: {
    '12 months': '12 mois',
    '24 months': '24 mois',
    '36+ months': '36+ mois',
  },
  en: {
    '12 months': '12 months',
    '24 months': '24 months',
    '36+ months': '36+ months',
  },
};

const PRIORITY_STYLES = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const PRIORITY_DOT = {
  critical: 'bg-red-400',
  high: 'bg-amber-400',
  medium: 'bg-blue-400',
};

const SEVERITY_COLOR = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-slate-400',
};

export function FiscalAdvisorPanel({ isOpen, onClose, locale = 'fr' }: FiscalAdvisorPanelProps) {
  const t = useTranslations('fiscalAdvisor');
  const tCommon = useTranslations('common');
  const { org, orgId, loading: orgLoading } = useOrganization();
  const { status, streamedContent, parsedResult, error, analyze, reset } = useFiscalAdvisor();
  const [loadingStep, setLoadingStep] = useState(0);

  // Advance loading steps
  useEffect(() => {
    if (status !== 'loading') {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, 2));
    }, 2000);
    return () => clearInterval(interval);
  }, [status]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = () => {
    if (orgId) analyze(orgId, locale);
  };

  const loadingSteps = [
    t('steps.collecting'),
    t('steps.analyzing'),
    t('steps.generating'),
  ];

  const horizonLabel = (horizon: string) =>
    (HORIZON_LABELS[locale] ?? HORIZON_LABELS['fr'])[horizon] ?? horizon;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 print:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-screen bg-slate-950 border-l border-white/10 z-50',
          'flex flex-col transition-transform duration-300 ease-out',
          'w-full md:w-[560px]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t('panelTitle')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tenir-500 to-accent-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">{t('panelTitle')}</h2>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-tenir-500/20 text-tenir-300 tracking-widest uppercase">
                  {t('beta')}
                </span>
              </div>
              {org && (
                <p className="text-xs text-slate-500 leading-tight">{org.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label={tCommon('close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── IDLE ── */}
          {status === 'idle' && (
            <div className="p-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tenir-500/20 to-accent-600/20 border border-tenir-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={28} className="text-tenir-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{t('buttonLabel')}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{t('description')}</p>
              </div>

              <div className="space-y-2 mb-8">
                {(['immediate', 'strategy', 'risks'] as const).map((key) => (
                  <div key={key} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-tenir-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{t(`featureList.${key}`)}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={orgLoading || !orgId}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-tenir-500 to-accent-600 text-white font-medium text-sm hover:from-tenir-400 hover:to-accent-500 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-tenir-900/30"
              >
                {orgLoading ? tCommon('loading') : t('launchAnalysis')}
              </button>

              <p className="text-xs text-slate-600 text-center mt-4 leading-relaxed">{t('disclaimer')}</p>
            </div>
          )}

          {/* ── LOADING ── */}
          {status === 'loading' && (
            <div className="p-6 flex flex-col items-center justify-center min-h-96">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tenir-500/20 to-accent-600/20 border border-tenir-500/20 flex items-center justify-center mb-6">
                <Sparkles size={28} className="text-tenir-400 animate-pulse" />
              </div>
              <h3 className="text-base font-semibold text-white mb-6">{t('analyzing')}</h3>
              <div className="w-full max-w-sm space-y-3">
                {loadingSteps.map((step, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500',
                      index < loadingStep
                        ? 'bg-tenir-500/10 border-tenir-500/20'
                        : index === loadingStep
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-transparent opacity-40'
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        index < loadingStep
                          ? 'bg-tenir-400'
                          : index === loadingStep
                          ? 'bg-white animate-pulse'
                          : 'bg-slate-600'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm flex-1',
                        index < loadingStep
                          ? 'text-tenir-300'
                          : index === loadingStep
                          ? 'text-white'
                          : 'text-slate-500'
                      )}
                    >
                      {step}
                    </span>
                    {index < loadingStep && (
                      <CheckCircle size={14} className="text-tenir-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STREAMING ── */}
          {status === 'streaming' && (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-tenir-400 animate-pulse" />
                <span className="text-xs text-slate-400">{t('streamingLabel')}</span>
              </div>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-white/5 rounded-xl p-4 overflow-x-auto">
                {streamedContent}
              </pre>
            </div>
          )}

          {/* ── COMPLETE ── */}
          {status === 'complete' && parsedResult && (
            <div className="p-5 space-y-6">
              {/* Summary */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                  {t('sections.summary')}
                </h3>
                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-slate-300 leading-relaxed">{parsedResult.analysis_summary}</p>
                </div>
              </section>

              {/* Immediate recommendations */}
              {parsedResult.immediate_recommendations.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span aria-hidden>⚡</span>
                    {t('sections.immediate')}
                  </h3>
                  <div className="space-y-3">
                    {parsedResult.immediate_recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className={cn('rounded-xl border p-4', PRIORITY_STYLES[rec.priority])}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                              PRIORITY_DOT[rec.priority]
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold uppercase tracking-wide">
                              {t(`priority.${rec.priority}`)}
                            </span>
                            <h4 className="text-sm font-semibold text-white mt-0.5 mb-1">{rec.title}</h4>
                            <p className="text-sm text-slate-300 mb-1.5">{rec.description}</p>
                            <p className="text-xs text-slate-400 mb-2">{rec.rationale}</p>
                            {rec.estimated_impact && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <TrendingUp size={12} className="text-tenir-400 flex-shrink-0" />
                                <span className="text-xs text-tenir-300 font-medium">
                                  {rec.estimated_impact}
                                </span>
                              </div>
                            )}
                            {rec.deadline && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Clock size={12} className="text-slate-500 flex-shrink-0" />
                                <span className="text-xs text-slate-400">
                                  {t('deadline')}: {rec.deadline}
                                </span>
                              </div>
                            )}
                            {rec.references && rec.references.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {rec.references.map((ref, j) => (
                                  <span
                                    key={j}
                                    className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400"
                                  >
                                    {ref}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Long-term strategy */}
              {parsedResult.longterm_strategy.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span aria-hidden>🔭</span>
                    {t('sections.longterm')}
                  </h3>
                  <div className="space-y-3">
                    {parsedResult.longterm_strategy.map((strat, i) => (
                      <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-tenir-500/20 text-tenir-300 font-medium">
                            {horizonLabel(strat.horizon)}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white mb-1">{strat.title}</h4>
                        <p className="text-sm text-slate-300 mb-1.5">{strat.description}</p>
                        <p className="text-xs text-slate-400 mb-2">{strat.rationale}</p>
                        {strat.estimated_impact && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <TrendingUp size={12} className="text-tenir-400 flex-shrink-0" />
                            <span className="text-xs text-tenir-300 font-medium">
                              {strat.estimated_impact}
                            </span>
                          </div>
                        )}
                        {strat.prerequisites && strat.prerequisites.length > 0 && (
                          <p className="text-xs text-slate-500 mt-2">
                            {t('prerequisites')}: {strat.prerequisites.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Risks */}
              {parsedResult.risks_identified.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span aria-hidden>⚠️</span>
                    {t('sections.risks')}
                  </h3>
                  <div className="space-y-3">
                    {parsedResult.risks_identified.map((risk, i) => (
                      <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            size={14}
                            className={cn('mt-0.5 flex-shrink-0', SEVERITY_COLOR[risk.severity])}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white mb-1">{risk.risk}</p>
                            <p className="text-xs text-slate-400">
                              <span className="text-slate-500">{t('mitigation')}: </span>
                              {risk.mitigation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <p className="text-xs text-slate-600 leading-relaxed pb-2">{t('disclaimer')}</p>
            </div>
          )}

          {/* ── ERROR ── */}
          {status === 'error' && (
            <div className="p-6 flex flex-col items-center justify-center min-h-96 text-center">
              <AlertCircle size={40} className="text-red-400 mb-4" />
              <p className="text-sm text-slate-300 mb-6 max-w-xs leading-relaxed">
                {error || t('error')}
              </p>
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors font-medium"
              >
                {t('retry')}
              </button>
            </div>
          )}
        </div>

        {/* Footer — complete state only */}
        {status === 'complete' && (
          <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10 flex-shrink-0 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors font-medium"
            >
              <Printer size={15} />
              {t('exportPdf')}
            </button>
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-tenir-500 to-accent-600 text-white text-sm hover:from-tenir-400 hover:to-accent-500 transition-all font-medium"
            >
              <RotateCcw size={15} />
              {t('newAnalysis')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
