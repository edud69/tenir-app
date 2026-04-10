import { NextRequest, NextResponse } from 'next/server';
import YahooFinanceClass from 'yahoo-finance2';

// yahoo-finance2 v3 exports the class as default — must instantiate
const yf = new (YahooFinanceClass as any)();

export interface SymbolSuggestion {
  symbol: string;
  shortName: string;
  exchange: string;
  type: string;       // EQUITY, ETF, MUTUALFUND, etc.
  typeLabel: string;  // friendly label
}

const TYPE_LABELS: Record<string, string> = {
  EQUITY:     'Action',
  ETF:        'FNB / ETF',
  MUTUALFUND: 'Fonds commun',
  INDEX:      'Indice',
  OPTION:     'Option',
  CURRENCY:   'Devise',
  FUTURE:     'Contrat à terme',
};

/**
 * GET /api/investments/search?q=royal+bank
 * Returns up to 8 symbol suggestions from Yahoo Finance.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await yf.search(q, { quotesCount: 8, newsCount: 0 });
    const quotes: any[] = data?.quotes ?? [];

    const results: SymbolSuggestion[] = quotes
      .filter((item: any) => item.symbol && item.quoteType !== 'OPTION')
      .map((item: any) => ({
        symbol:    item.symbol,
        shortName: item.shortname ?? item.longname ?? item.symbol,
        exchange:  item.exchDisp ?? item.exchange ?? '',
        type:      item.quoteType ?? 'EQUITY',
        typeLabel: TYPE_LABELS[item.quoteType ?? ''] ?? item.typeDisp ?? 'Titre',
      }));

    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 's-maxage=60' },
    });
  } catch (err: any) {
    return NextResponse.json({ results: [], error: err.message }, { status: 200 });
  }
}
