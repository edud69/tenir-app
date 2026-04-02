interface TaxCalculationRequest {
  activeBusinessIncome: number;
  investmentIncome: number;
  capitalGains: number;
  dividendsReceived: number;
  taxYear: number;
  corporationType: 'ccpc' | 'general';
}

interface TaxCalculationResult {
  activeBusinessIncome: number;
  federalSmallBusinessTax: number;
  federalGeneralTax: number;
  federalInvestmentIncomeTax: number;
  federalCapitalGainsTax: number;
  federalDividendTax: number;
  totalFederalTax: number;

  quebecSmallBusinessTax: number;
  quebecGeneralTax: number;
  quebecInvestmentIncomeTax: number;
  quebecCapitalGainsTax: number;
  quebecDividendTax: number;
  totalQuebecTax: number;

  totalTax: number;
  effectiveRate: number;

  capitalGainInclusionRate: number;
  capitalGainsTaxable: number;

  rdtohEligible: number;
  rdtohNonEligible: number;

  details: {
    notes: string[];
  };
}

// 2024-2025 Canadian and Quebec tax rates
const TAX_RATES = {
  federal: {
    smallBusinessRate: 0.09, // 9% on first $500k
    smallBusinessLimit: 500000,
    generalRate: 0.15, // 15% above $500k
    investmentIncome: 0.3867, // 38.67% on investment income (includes 10.67% refundable)
    investmentIncomeRefundable: 0.1067, // 10.67% refundable
    capitalGainsInclusion: 0.666667, // 2/3 inclusion rate post June 2024
    capitalGainsInclusionOver250k: 0.666667, // Same for amounts over $250k
  },
  quebec: {
    smallBusinessRate: 0.032, // 3.2% on first $500k
    smallBusinessLimit: 500000,
    generalRate: 0.115, // 11.5% above $500k
    investmentIncome: 0.4596, // 45.96% on investment income
    capitalGainsInclusion: 0.666667, // 2/3 inclusion rate
  },
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TaxCalculationRequest;
    const {
      activeBusinessIncome,
      investmentIncome,
      capitalGains,
      dividendsReceived,
      taxYear,
      corporationType,
    } = body;

    const result: TaxCalculationResult = {
      activeBusinessIncome,
      federalSmallBusinessTax: 0,
      federalGeneralTax: 0,
      federalInvestmentIncomeTax: 0,
      federalCapitalGainsTax: 0,
      federalDividendTax: 0,
      totalFederalTax: 0,

      quebecSmallBusinessTax: 0,
      quebecGeneralTax: 0,
      quebecInvestmentIncomeTax: 0,
      quebecCapitalGainsTax: 0,
      quebecDividendTax: 0,
      totalQuebecTax: 0,

      totalTax: 0,
      effectiveRate: 0,

      capitalGainInclusionRate: TAX_RATES.federal.capitalGainsInclusion,
      capitalGainsTaxable: 0,

      rdtohEligible: 0,
      rdtohNonEligible: 0,

      details: {
        notes: [],
      },
    };

    // Calculate capital gains taxable amount
    result.capitalGainsTaxable = capitalGains * TAX_RATES.federal.capitalGainsInclusion;

    // Federal tax calculation
    // Small business income (first $500k)
    const smallBusinessIncome = Math.min(
      activeBusinessIncome,
      TAX_RATES.federal.smallBusinessLimit
    );
    result.federalSmallBusinessTax = smallBusinessIncome * TAX_RATES.federal.smallBusinessRate;

    // General rate income (above $500k)
    const generalIncome = Math.max(0, activeBusinessIncome - TAX_RATES.federal.smallBusinessLimit);
    result.federalGeneralTax = generalIncome * TAX_RATES.federal.generalRate;

    // Investment income tax (federal)
    result.federalInvestmentIncomeTax =
      investmentIncome * TAX_RATES.federal.investmentIncome;

    // Capital gains tax (federal)
    result.federalCapitalGainsTax = result.capitalGainsTaxable * TAX_RATES.federal.generalRate;

    // Dividend tax (federal) - simplified, actual rate depends on dividend type
    result.federalDividendTax = dividendsReceived * 0.20; // Approximate rate

    result.totalFederalTax =
      result.federalSmallBusinessTax +
      result.federalGeneralTax +
      result.federalInvestmentIncomeTax +
      result.federalCapitalGainsTax +
      result.federalDividendTax;

    // Quebec tax calculation
    // Small business income (first $500k)
    const qcSmallBusinessIncome = Math.min(
      activeBusinessIncome,
      TAX_RATES.quebec.smallBusinessLimit
    );
    result.quebecSmallBusinessTax = qcSmallBusinessIncome * TAX_RATES.quebec.smallBusinessRate;

    // General rate income (above $500k)
    const qcGeneralIncome = Math.max(0, activeBusinessIncome - TAX_RATES.quebec.smallBusinessLimit);
    result.quebecGeneralTax = qcGeneralIncome * TAX_RATES.quebec.generalRate;

    // Investment income tax (Quebec)
    result.quebecInvestmentIncomeTax =
      investmentIncome * TAX_RATES.quebec.investmentIncome;

    // Capital gains tax (Quebec)
    result.quebecCapitalGainsTax =
      result.capitalGainsTaxable * TAX_RATES.quebec.generalRate;

    // Dividend tax (Quebec) - simplified
    result.quebecDividendTax = dividendsReceived * 0.15; // Approximate rate

    result.totalQuebecTax =
      result.quebecSmallBusinessTax +
      result.quebecGeneralTax +
      result.quebecInvestmentIncomeTax +
      result.quebecCapitalGainsTax +
      result.quebecDividendTax;

    // Total and effective rate
    result.totalTax = result.totalFederalTax + result.totalQuebecTax;

    const totalIncome =
      activeBusinessIncome + investmentIncome + result.capitalGainsTaxable + dividendsReceived;
    result.effectiveRate = totalIncome > 0 ? result.totalTax / totalIncome : 0;

    // Calculate RDTOH (Refundable Dividend Tax On Hand / IMRTD)
    // 30.67% of investment income for eligible portion
    result.rdtohEligible = investmentIncome * 0.30;
    result.rdtohNonEligible = investmentIncome * 0.1067;

    // Add notes
    result.details.notes = [
      `Calculations based on ${taxYear} tax year`,
      `Corporation type: ${corporationType === 'ccpc' ? 'CCPC' : 'General Corporation'}`,
      `Capital gains inclusion rate: ${(TAX_RATES.federal.capitalGainsInclusion * 100).toFixed(1)}%`,
      'These are estimates. Consult a CPA for precise calculations.',
      'Rates are simplified approximations for planning purposes.',
      'Actual taxes may vary based on provincial credits and deductions.',
    ];

    if (activeBusinessIncome > TAX_RATES.federal.smallBusinessLimit) {
      result.details.notes.push(
        `Income exceeds small business limit ($${TAX_RATES.federal.smallBusinessLimit.toLocaleString()})`
      );
    }

    if (investmentIncome > 0) {
      result.details.notes.push(
        `Investment income attracts higher tax rates and creates RDTOH/IMRTD credits`
      );
    }

    if (capitalGains > 0) {
      result.details.notes.push(
        `Capital gains inclusion rate of 2/3 applies to investment gain`
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in tax calculation API:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
