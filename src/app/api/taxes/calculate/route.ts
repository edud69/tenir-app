import { createServerSupabaseClient } from '@/lib/supabase/server';
import { annualizeExpense } from '@/types/home-office';

// 2024-2025 Canadian and Quebec tax rates
const TAX_RATES = {
  federal: {
    smallBusinessRate: 0.09,
    smallBusinessLimit: 500000,
    generalRate: 0.15,
    investmentIncome: 0.3867,
    capitalGainsInclusion: 0.666667,
  },
  quebec: {
    smallBusinessRate: 0.032,
    smallBusinessLimit: 500000,
    generalRate: 0.115,
    investmentIncome: 0.4596,
    capitalGainsInclusion: 0.666667,
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, taxYear } = body as { orgId: string; taxYear: number };

    if (!orgId || !taxYear) {
      return new Response(JSON.stringify({ error: 'orgId and taxYear are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = await createServerSupabaseClient();

    // Fetch organization's tax profile settings
    const { data: profile } = await (supabase as any)
      .from('tax_profiles')
      .select('corporation_type, small_business_limit, grip_balance, cda_balance, active_business_income, aggregate_investment_income')
      .eq('organization_id', orgId)
      .eq('tax_year', taxYear)
      .single();

    // Fetch income from transactions for the tax year
    const yearStart = `${taxYear}-01-01`;
    const yearEnd = `${taxYear}-12-31`;

    const { data: transactions } = await (supabase as any)
      .from('transactions')
      .select('amount, type, category')
      .eq('organization_id', orgId)
      .gte('date', yearStart)
      .lte('date', yearEnd);

    // Aggregate income by category
    let activeBusinessIncome = 0;
    let investmentIncome = 0;
    let capitalGains = 0;
    let dividendsReceived = 0;

    if (transactions && transactions.length > 0) {
      for (const tx of transactions) {
        const amount = Math.abs(tx.amount);
        if (tx.type === 'income' || tx.amount > 0) {
          const cat = (tx.category || '').toLowerCase();
          if (cat.includes('investment') || cat.includes('interest')) {
            investmentIncome += amount;
          } else if (cat.includes('capital') || cat.includes('gain')) {
            capitalGains += amount;
          } else if (cat.includes('dividend')) {
            dividendsReceived += amount;
          } else {
            activeBusinessIncome += amount;
          }
        }
      }
    }

    // Fall back to stored values if no transactions
    if (activeBusinessIncome === 0 && investmentIncome === 0) {
      activeBusinessIncome = profile?.active_business_income ?? 250000;
      investmentIncome = profile?.aggregate_investment_income ?? 0;
    }

    // Home office deduction (corporate deduction, reduces active business income)
    let homeOfficeDeduction = 0;
    const { data: homeOffices } = await (supabase as any)
      .from('home_offices')
      .select('id, total_area_sqft, office_area_sqft, months_used_per_year')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (homeOffices && homeOffices.length > 0) {
      for (const office of homeOffices) {
        const { data: officeExpenses } = await (supabase as any)
          .from('home_office_expenses')
          .select('amount, period_start, period_end')
          .eq('home_office_id', office.id);

        const annualTotal = (officeExpenses ?? []).reduce(
          (sum: number, exp: { amount: number; period_start: string; period_end: string }) => {
            return sum + annualizeExpense(Number(exp.amount), new Date(exp.period_start), new Date(exp.period_end));
          },
          0
        );

        const usageRatio = Number(office.office_area_sqft) / Number(office.total_area_sqft);
        const monthsRatio = Number(office.months_used_per_year) / 12;
        homeOfficeDeduction += annualTotal * usageRatio * monthsRatio;
      }
    }

    activeBusinessIncome = Math.max(0, activeBusinessIncome - homeOfficeDeduction);

    const corporationType = profile?.corporation_type ?? 'ccpc';
    const smallBusinessLimit = profile?.small_business_limit ?? TAX_RATES.federal.smallBusinessLimit;
    const gripBalance = profile?.grip_balance ?? 0;
    const cdaBalance = profile?.cda_balance ?? 0;

    // Federal tax
    const fedSmallIncome = Math.min(activeBusinessIncome, smallBusinessLimit);
    const fedGeneralIncome = Math.max(0, activeBusinessIncome - smallBusinessLimit);
    const capitalGainsTaxable = capitalGains * TAX_RATES.federal.capitalGainsInclusion;

    const federalTax =
      fedSmallIncome * TAX_RATES.federal.smallBusinessRate +
      fedGeneralIncome * TAX_RATES.federal.generalRate +
      investmentIncome * TAX_RATES.federal.investmentIncome +
      capitalGainsTaxable * TAX_RATES.federal.generalRate +
      dividendsReceived * 0.20;

    // Quebec tax
    const qcSmallIncome = Math.min(activeBusinessIncome, TAX_RATES.quebec.smallBusinessLimit);
    const qcGeneralIncome = Math.max(0, activeBusinessIncome - TAX_RATES.quebec.smallBusinessLimit);
    const qcCapGainsTaxable = capitalGains * TAX_RATES.quebec.capitalGainsInclusion;

    const provincialTax =
      qcSmallIncome * TAX_RATES.quebec.smallBusinessRate +
      qcGeneralIncome * TAX_RATES.quebec.generalRate +
      investmentIncome * TAX_RATES.quebec.investmentIncome +
      qcCapGainsTaxable * TAX_RATES.quebec.generalRate +
      dividendsReceived * 0.15;

    const totalTax = federalTax + provincialTax;
    const taxableIncome = activeBusinessIncome + investmentIncome + capitalGainsTaxable + dividendsReceived;
    const effectiveRate = taxableIncome > 0 ? totalTax / taxableIncome : 0;

    const rdtohEligible = investmentIncome * 0.30;
    const rdtohNonEligible = investmentIncome * 0.1067;

    // Quarterly installments
    const quarterlyAmount = totalTax / 4;
    const installments = [
      { quarter: 1, dueDate: `${taxYear}-03-15`, amount: Math.round(quarterlyAmount) },
      { quarter: 2, dueDate: `${taxYear}-06-15`, amount: Math.round(quarterlyAmount) },
      { quarter: 3, dueDate: `${taxYear}-09-15`, amount: Math.round(quarterlyAmount) },
      { quarter: 4, dueDate: `${taxYear}-12-15`, amount: Math.round(totalTax - quarterlyAmount * 3) },
    ];

    // Tax breakdown for chart
    const taxBreakdown = [
      { name: 'Federal Tax', value: Math.round(federalTax), color: '#3b82f6' },
      { name: 'Quebec Tax', value: Math.round(provincialTax), color: '#8b5cf6' },
    ];
    if (rdtohEligible > 0) {
      taxBreakdown.push({ name: 'RDTOH (Eligible)', value: Math.round(rdtohEligible), color: '#10b981' });
    }

    // Integration model (salary vs dividend comparison)
    const integrationData = [
      {
        method: 'Salary',
        salary: activeBusinessIncome,
        eligibleDiv: 0,
        nonEligibleDiv: 0,
        totalCost: Math.round(activeBusinessIncome * 0.53),
        savings: 0,
      },
      {
        method: 'Eligible Dividend',
        salary: 0,
        eligibleDiv: activeBusinessIncome,
        nonEligibleDiv: 0,
        totalCost: Math.round(activeBusinessIncome * 0.39),
        savings: Math.round(activeBusinessIncome * (0.53 - 0.39)),
      },
      {
        method: 'Non-Eligible Dividend',
        salary: 0,
        eligibleDiv: 0,
        nonEligibleDiv: activeBusinessIncome,
        totalCost: Math.round(activeBusinessIncome * 0.46),
        savings: Math.round(activeBusinessIncome * (0.53 - 0.46)),
      },
    ];

    return new Response(
      JSON.stringify({
        federal_tax: Math.round(federalTax * 100) / 100,
        provincial_tax: Math.round(provincialTax * 100) / 100,
        total_tax: Math.round(totalTax * 100) / 100,
        taxable_income: Math.round(taxableIncome * 100) / 100,
        effective_rate: Math.round(effectiveRate * 10000) / 10000,
        rdtoh_eligible: Math.round(rdtohEligible * 100) / 100,
        rdtoh_non_eligible: Math.round(rdtohNonEligible * 100) / 100,
        grip_balance: gripBalance,
        cda_balance: cdaBalance,
        installments,
        tax_breakdown: taxBreakdown,
        integration_data: integrationData,
        corporation_type: corporationType,
        active_business_income: Math.round(activeBusinessIncome * 100) / 100,
        aggregate_investment_income: Math.round(investmentIncome * 100) / 100,
        home_office_deduction: Math.round(homeOfficeDeduction * 100) / 100,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tax calculation API:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
