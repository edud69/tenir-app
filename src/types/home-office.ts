export interface HomeOfficeCalculation {
  homeOfficeId: string;
  label: string;
  totalAreaSqft: number;
  officeAreaSqft: number;
  usageRatio: number;
  monthsUsedPerYear: number;
  annualExpensesByType: Record<string, number>;
  totalAnnualExpenses: number;
  deductibleAmount: number;
  monthlyReimbursement: number;
  expenseBreakdown: HomeOfficeExpenseBreakdown[];
}

export interface HomeOfficeExpenseBreakdown {
  expenseType: string;
  label: string;
  annualAmount: number;
  deductibleAmount: number;
}

export type ExpenseType =
  | 'rent'
  | 'mortgage_interest'
  | 'municipal_taxes'
  | 'school_taxes'
  | 'electricity'
  | 'gas'
  | 'home_insurance'
  | 'maintenance'
  | 'other';

export type DocumentType =
  | 'mortgage_statement'
  | 'lease_agreement'
  | 'sublease_agreement'
  | 'municipal_tax_bill'
  | 'school_tax_bill'
  | 'electricity_bill'
  | 'gas_bill'
  | 'insurance_policy'
  | 'floor_plan'
  | 'other';

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, { fr: string; en: string }> = {
  rent: { fr: 'Loyer', en: 'Rent' },
  mortgage_interest: { fr: 'Intérêts hypothécaires', en: 'Mortgage Interest' },
  municipal_taxes: { fr: 'Taxes municipales', en: 'Municipal Taxes' },
  school_taxes: { fr: 'Taxes scolaires', en: 'School Taxes' },
  electricity: { fr: 'Électricité', en: 'Electricity' },
  gas: { fr: 'Gaz / chauffage', en: 'Gas / Heating' },
  home_insurance: { fr: 'Assurance habitation', en: 'Home Insurance' },
  maintenance: { fr: 'Entretien commun', en: 'Common Maintenance' },
  other: { fr: 'Autre', en: 'Other' },
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, { fr: string; en: string }> = {
  mortgage_statement: { fr: 'Relevé hypothécaire', en: 'Mortgage Statement' },
  lease_agreement: { fr: 'Bail', en: 'Lease Agreement' },
  sublease_agreement: { fr: 'Contrat de sous-location', en: 'Sublease Agreement' },
  municipal_tax_bill: { fr: 'Compte de taxes municipales', en: 'Municipal Tax Bill' },
  school_tax_bill: { fr: 'Compte de taxes scolaires', en: 'School Tax Bill' },
  electricity_bill: { fr: 'Facture d\'électricité', en: 'Electricity Bill' },
  gas_bill: { fr: 'Facture de gaz', en: 'Gas Bill' },
  insurance_policy: { fr: 'Police d\'assurance', en: 'Insurance Policy' },
  floor_plan: { fr: 'Plan du domicile', en: 'Floor Plan' },
  other: { fr: 'Autre document', en: 'Other Document' },
};

export function annualizeExpense(amount: number, startDate: Date, endDate: Date): number {
  const days = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return (amount / days) * 365;
}
