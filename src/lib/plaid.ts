import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const env = (process.env.PLAID_ENV || 'sandbox') as keyof typeof PlaidEnvironments;

const config = new Configuration({
  basePath: PlaidEnvironments[env],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(config);

// Map Plaid transaction categories to tenir categories
export function mapPlaidCategory(plaidCategory: string[] | null | undefined): string {
  if (!plaidCategory || plaidCategory.length === 0) return 'other';
  const cat = plaidCategory.join(' ').toLowerCase();

  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dining') || cat.includes('coffee')) return 'meals';
  if (cat.includes('travel') || cat.includes('airline') || cat.includes('hotel') || cat.includes('transport') || cat.includes('taxi') || cat.includes('uber') || cat.includes('parking')) return 'travel';
  if (cat.includes('office') || cat.includes('stationery') || cat.includes('printing')) return 'office';
  if (cat.includes('insurance')) return 'insurance';
  if (cat.includes('legal')) return 'legal';
  if (cat.includes('accounting') || cat.includes('bookkeeping')) return 'accounting';
  if (cat.includes('software') || cat.includes('computer') || cat.includes('tech') || cat.includes('internet') || cat.includes('phone') || cat.includes('subscription')) return 'technology';
  if (cat.includes('bank') || cat.includes('fee') || cat.includes('interest charge') || cat.includes('service charge')) return 'bank';
  if (cat.includes('supply') || cat.includes('supplies') || cat.includes('hardware')) return 'supplies';
  if (cat.includes('professional') || cat.includes('consultant')) return 'professional';
  if (cat.includes('dividend')) return 'other';
  return 'other';
}

// Map Plaid account type/subtype to tenir account type
export function mapPlaidAccountType(type: string, subtype: string | null): string {
  if (type === 'credit') return 'credit_card';
  if (subtype === 'checking' || subtype === 'chequing') return 'checking';
  if (subtype === 'savings') return 'savings';
  if (subtype === 'line of credit') return 'line_of_credit';
  return 'checking';
}
