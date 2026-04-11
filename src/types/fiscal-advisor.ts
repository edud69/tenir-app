export interface ImmediateRecommendation {
  priority: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  rationale: string;
  estimated_impact: string;
  deadline?: string;
  references?: string[];
}

export interface LongTermStrategy {
  horizon: '12 months' | '24 months' | '36+ months';
  title: string;
  description: string;
  rationale: string;
  estimated_impact: string;
  prerequisites?: string[];
}

export interface IdentifiedRisk {
  severity: 'high' | 'medium' | 'low';
  risk: string;
  mitigation: string;
}

export interface FiscalAnalysisResult {
  analysis_summary: string;
  immediate_recommendations: ImmediateRecommendation[];
  longterm_strategy: LongTermStrategy[];
  risks_identified: IdentifiedRisk[];
  language: 'fr' | 'en';
}
