import { createServerSupabaseClient } from '@/lib/supabase/server';

interface FormGenerationRequest {
  formType: 'T2' | 'CO-17' | 'T5' | 'RL-3';
  taxYear: number;
  organizationId?: string;
}

interface FormField {
  code: string;
  label: string;
  value: string | number | null;
  type: 'text' | 'number' | 'date' | 'currency';
}

interface GeneratedForm {
  formType: string;
  formCode: string;
  taxYear: number;
  status: 'draft';
  generatedAt: string;
  fields: FormField[];
  sections: Array<{
    name: string;
    fields: FormField[];
  }>;
}

const FORM_TEMPLATES: Record<string, any> = {
  T2: {
    code: 'T2',
    label: 'Corporation Income Tax Return (Canada)',
    sections: [
      {
        name: 'Identification',
        fields: [
          { code: '1', label: 'Business Number (BN)', type: 'text' },
          { code: '2', label: 'Corporation Name', type: 'text' },
          { code: '3', label: 'Address', type: 'text' },
          { code: '4', label: 'Fiscal Period End', type: 'date' },
        ],
      },
      {
        name: 'Income Statement',
        fields: [
          { code: '10', label: 'Gross Business Income', type: 'currency' },
          { code: '11', label: 'Cost of Goods Sold', type: 'currency' },
          { code: '12', label: 'Gross Profit', type: 'currency' },
          { code: '20', label: 'Salaries and Wages', type: 'currency' },
          { code: '21', label: 'Rent', type: 'currency' },
          { code: '22', label: 'Interest and Bank Charges', type: 'currency' },
          { code: '23', label: 'Utilities', type: 'currency' },
          { code: '24', label: 'Professional Fees', type: 'currency' },
          { code: '25', label: 'Advertising', type: 'currency' },
          { code: '26', label: 'Office Expenses', type: 'currency' },
          { code: '27', label: 'Depreciation', type: 'currency' },
          { code: '28', label: 'Other Expenses', type: 'currency' },
          { code: '30', label: 'Net Business Income', type: 'currency' },
        ],
      },
      {
        name: 'Investment Income',
        fields: [
          { code: '40', label: 'Dividend Income', type: 'currency' },
          { code: '41', label: 'Interest Income', type: 'currency' },
          { code: '42', label: 'Capital Gains', type: 'currency' },
          { code: '43', label: 'Other Investment Income', type: 'currency' },
        ],
      },
      {
        name: 'Deductions and Credits',
        fields: [
          { code: '50', label: 'Small Business Deduction Claim', type: 'currency' },
          { code: '51', label: 'Dividend Tax Credit', type: 'currency' },
          { code: '52', label: 'Research and Development Claim', type: 'currency' },
          { code: '53', label: 'Other Credits', type: 'currency' },
        ],
      },
      {
        name: 'Tax Payable',
        fields: [
          { code: '60', label: 'Total Taxable Income', type: 'currency' },
          { code: '61', label: 'Federal Tax', type: 'currency' },
          { code: '62', label: 'Federal Tax Credits', type: 'currency' },
          { code: '63', label: 'Net Federal Tax', type: 'currency' },
          { code: '64', label: 'Provincial Tax', type: 'currency' },
          { code: '65', label: 'Total Tax Payable', type: 'currency' },
          { code: '66', label: 'Installments Paid', type: 'currency' },
          { code: '67', label: 'Tax Balance Due', type: 'currency' },
        ],
      },
    ],
  },

  'CO-17': {
    code: 'CO-17',
    label: 'Corporation Income Tax Return (Quebec)',
    sections: [
      {
        name: 'Identification',
        fields: [
          { code: '100', label: 'Quebec Enterprise Number (NEQ)', type: 'text' },
          { code: '101', label: 'Corporation Name', type: 'text' },
          { code: '102', label: 'Address', type: 'text' },
          { code: '103', label: 'Fiscal Period End', type: 'date' },
          { code: '104', label: 'Business Number (BN)', type: 'text' },
        ],
      },
      {
        name: 'Business Income',
        fields: [
          { code: '200', label: 'Gross Business Income', type: 'currency' },
          { code: '201', label: 'Cost of Goods Sold', type: 'currency' },
          { code: '202', label: 'Gross Profit', type: 'currency' },
          { code: '210', label: 'Salaries and Wages', type: 'currency' },
          { code: '211', label: 'Professional Fees', type: 'currency' },
          { code: '212', label: 'Rent and Utilities', type: 'currency' },
          { code: '213', label: 'Depreciation', type: 'currency' },
          { code: '214', label: 'Other Business Expenses', type: 'currency' },
          { code: '220', label: 'Net Business Income', type: 'currency' },
        ],
      },
      {
        name: 'Investment Income',
        fields: [
          { code: '300', label: 'Eligible Dividends', type: 'currency' },
          { code: '301', label: 'Non-Eligible Dividends', type: 'currency' },
          { code: '302', label: 'Interest Income', type: 'currency' },
          { code: '303', label: 'Rental Income', type: 'currency' },
          { code: '304', label: 'Capital Gains', type: 'currency' },
        ],
      },
      {
        name: 'Deductions',
        fields: [
          { code: '400', label: 'DPE (Déduction pour Petite Entreprise)', type: 'currency' },
          { code: '401', label: 'Tax Credits', type: 'currency' },
          { code: '402', label: 'Other Deductions', type: 'currency' },
        ],
      },
      {
        name: 'Tax Calculation',
        fields: [
          { code: '500', label: 'Total Income', type: 'currency' },
          { code: '501', label: 'Quebec Tax Before Credits', type: 'currency' },
          { code: '502', label: 'Quebec Tax Credits', type: 'currency' },
          { code: '503', label: 'Net Quebec Tax', type: 'currency' },
          { code: '504', label: 'Installments Paid', type: 'currency' },
          { code: '505', label: 'Balance Due/Refund', type: 'currency' },
        ],
      },
    ],
  },

  T5: {
    code: 'T5',
    label: 'Statement of Investment Income',
    sections: [
      {
        name: 'Payer Information',
        fields: [
          { code: '1000', label: 'Payer Name', type: 'text' },
          { code: '1001', label: 'Business Number', type: 'text' },
          { code: '1002', label: 'Address', type: 'text' },
        ],
      },
      {
        name: 'Recipient Information',
        fields: [
          { code: '2000', label: 'Recipient Name', type: 'text' },
          { code: '2001', label: 'Social Insurance Number / Business Number', type: 'text' },
          { code: '2002', label: 'Address', type: 'text' },
        ],
      },
      {
        name: 'Income Information',
        fields: [
          { code: '3000', label: 'Dividend Income (Box 10)', type: 'currency' },
          { code: '3001', label: 'Interest from Canadian Sources (Box 11)', type: 'currency' },
          { code: '3002', label: 'Amount Not Included in Income (Box 12)', type: 'currency' },
          { code: '3003', label: 'Capital Gains (Box 13)', type: 'currency' },
          { code: '3004', label: 'Capital Losses (Box 14)', type: 'currency' },
          { code: '3005', label: 'Eligible Dividend Designation (Box 20)', type: 'text' },
          { code: '3006', label: 'Foreign Exchange Gain/Loss (Box 21)', type: 'currency' },
          { code: '3007', label: 'Other Income (Box 22)', type: 'currency' },
          { code: '3008', label: 'Return of Capital (Box 23)', type: 'currency' },
        ],
      },
      {
        name: 'Tax Information',
        fields: [
          { code: '4000', label: 'US Tax Withheld (Box 24)', type: 'currency' },
          { code: '4001', label: 'Canadian Tax Withheld (Box 25)', type: 'currency' },
          { code: '4002', label: 'Exempt Dividends (Box 26)', type: 'currency' },
        ],
      },
    ],
  },

  'RL-3': {
    code: 'RL-3',
    label: 'Investment Income (Quebec)',
    sections: [
      {
        name: 'Payer Information',
        fields: [
          { code: '5000', label: 'Payer Name', type: 'text' },
          { code: '5001', label: 'Quebec Enterprise Number (NEQ)', type: 'text' },
          { code: '5002', label: 'Business Number (BN)', type: 'text' },
          { code: '5003', label: 'Address', type: 'text' },
        ],
      },
      {
        name: 'Recipient Information',
        fields: [
          { code: '6000', label: 'Recipient Name', type: 'text' },
          { code: '6001', label: 'Québec File Number / Business Number', type: 'text' },
          { code: '6002', label: 'Address', type: 'text' },
        ],
      },
      {
        name: 'Income Details',
        fields: [
          { code: '7000', label: 'Dividend Income - Eligible', type: 'currency' },
          { code: '7001', label: 'Dividend Income - Non-Eligible', type: 'currency' },
          { code: '7002', label: 'Interest Income', type: 'currency' },
          { code: '7003', label: 'Capital Gains', type: 'currency' },
          { code: '7004', label: 'Capital Losses', type: 'currency' },
          { code: '7005', label: 'Other Income', type: 'currency' },
          { code: '7006', label: 'Return of Capital', type: 'currency' },
        ],
      },
      {
        name: 'Tax Credits',
        fields: [
          { code: '8000', label: 'Quebec Tax Withheld', type: 'currency' },
          { code: '8001', label: 'Foreign Tax Withheld', type: 'currency' },
          { code: '8002', label: 'Quebec Abatement', type: 'currency' },
        ],
      },
    ],
  },
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FormGenerationRequest;
    const { formType, taxYear } = body;

    if (!(formType in FORM_TEMPLATES)) {
      return new Response(
        JSON.stringify({ error: `Unsupported form type: ${formType}. Supported: T2, CO-17, T5, RL-3` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── Fetch real org + tax data ─────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    let orgData: any = null;
    let taxProfile: any = null;
    let flowData = { eligibleDividends: 0, nonEligibleDividends: 0, managementFees: 0 };

    if (user) {
      const { data: membership } = await (supabase as any)
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        const orgId = membership.organization_id;

        const [orgRes, profileRes, entityRes] = await Promise.all([
          (supabase as any).from('organizations').select('*').eq('id', orgId).single(),
          (supabase as any).from('tax_profiles').select('*').eq('organization_id', orgId).eq('tax_year', taxYear).single(),
          (supabase as any).from('entities').select('id').eq('organization_id', orgId).eq('is_current_org', true).single(),
        ]);

        orgData = orgRes.data;
        taxProfile = profileRes.data;

        if (entityRes.data) {
          const yearStart = `${taxYear}-01-01`;
          const yearEnd = `${taxYear}-12-31`;
          const { data: flows } = await (supabase as any)
            .from('financial_flows')
            .select('flow_type, amount, from_entity_id, to_entity_id')
            .eq('organization_id', orgId)
            .gte('date', yearStart)
            .lte('date', yearEnd);

          if (flows) {
            const currentEntityId = entityRes.data.id;
            for (const f of flows) {
              const amt = Number(f.amount);
              const isFrom = f.from_entity_id === currentEntityId;
              const isTo = f.to_entity_id === currentEntityId;
              if (f.flow_type === 'dividend_eligible' && isFrom) flowData.eligibleDividends += amt;
              if (f.flow_type === 'dividend_non_eligible' && isFrom) flowData.nonEligibleDividends += amt;
              if (f.flow_type === 'management_fee' && isTo) flowData.managementFees += amt;
            }
          }
        }
      }
    }

    // ── Build form with populated values ──────────────────────────────────────
    const template = FORM_TEMPLATES[formType];

    // Value lookup map per form type
    const valueMap: Record<string, string | number | null> = {};

    if (orgData) {
      const fyEnd = `${taxYear}-${String(orgData.fiscal_year_end_month ?? 12).padStart(2, '0')}-${String(orgData.fiscal_year_end_day ?? 31).padStart(2, '0')}`;
      // T2 / CO-17 identification
      valueMap['1'] = orgData.business_number ?? null;
      valueMap['2'] = orgData.name ?? null;
      valueMap['4'] = fyEnd;
      valueMap['100'] = orgData.neq ?? null;
      valueMap['101'] = orgData.name ?? null;
      valueMap['103'] = fyEnd;
      valueMap['104'] = orgData.business_number ?? null;
      // T5 / RL-3 payer
      valueMap['1000'] = orgData.name ?? null;
      valueMap['1001'] = orgData.business_number ?? null;
      valueMap['5000'] = orgData.name ?? null;
      valueMap['5001'] = orgData.neq ?? null;
      valueMap['5002'] = orgData.business_number ?? null;
    }

    if (taxProfile) {
      valueMap['10'] = taxProfile.active_business_income ?? null;
      valueMap['30'] = taxProfile.active_business_income ?? null;
      valueMap['60'] = taxProfile.taxable_income ?? null;
      valueMap['61'] = taxProfile.federal_tax ?? null;
      valueMap['64'] = taxProfile.provincial_tax ?? null;
      valueMap['65'] = taxProfile.total_tax ?? null;
      // CO-17
      valueMap['200'] = taxProfile.active_business_income ?? null;
      valueMap['220'] = taxProfile.active_business_income ?? null;
      valueMap['500'] = taxProfile.taxable_income ?? null;
      valueMap['501'] = taxProfile.provincial_tax ?? null;
      valueMap['503'] = taxProfile.provincial_tax ?? null;
    }

    // Flow-derived values
    if (flowData.eligibleDividends > 0 || flowData.nonEligibleDividends > 0) {
      valueMap['40'] = (flowData.eligibleDividends + flowData.nonEligibleDividends) || null; // T2 dividend income
      valueMap['300'] = flowData.eligibleDividends || null;   // CO-17
      valueMap['301'] = flowData.nonEligibleDividends || null;
      valueMap['3000'] = (flowData.eligibleDividends + flowData.nonEligibleDividends) || null; // T5
      valueMap['7000'] = flowData.eligibleDividends || null;  // RL-3
      valueMap['7001'] = flowData.nonEligibleDividends || null;
    }

    const generatedForm: GeneratedForm = {
      formType,
      formCode: template.code,
      taxYear,
      status: 'draft',
      generatedAt: new Date().toISOString(),
      fields: [],
      sections: template.sections.map((section: { name: string; fields: Array<{ code: string; label: string; type: string }> }) => ({
        name: section.name,
        fields: section.fields.map((field) => ({
          code: field.code,
          label: field.label,
          value: valueMap[field.code] ?? null,
          type: field.type,
        })),
      })),
    };

    generatedForm.fields = generatedForm.sections.flatMap((section) => section.fields);

    return new Response(JSON.stringify(generatedForm), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in form generation API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
