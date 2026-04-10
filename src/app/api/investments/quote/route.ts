import { NextRequest, NextResponse } from 'next/server';
import YahooFinanceClass from 'yahoo-finance2';

// yahoo-finance2 v3 exports the class as default — must instantiate
const yf = new (YahooFinanceClass as any)();

export interface QuoteResult {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  shortName: string;
  marketState: string;
  error?: string;
}

/**
 * GET /api/investments/quote?symbols=RY.TO,TD.TO,AAPL
 *
 * Uses yahoo-finance2 which handles Yahoo Finance auth (cookies + crumb)
 * automatically — works reliably from Vercel servers.
 * TSX tickers need .TO suffix: RY.TO, TD.TO, BNS.TO, etc.
 */
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('symbols');
  if (!param) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 });
  }

  const symbols = param.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (symbols.length === 0) {
    return NextResponse.json({ error: 'No valid symbols' }, { status: 400 });
  }

  const results: Record<string, QuoteResult> = {};

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const q = await yf.quote(symbol);
        const price = q.regularMarketPrice ?? 0;
        const prev  = q.regularMarketPreviousClose ?? price;

        results[symbol] = {
          symbol,
          price,
          previousClose:  prev,
          change:         q.regularMarketChange        ?? price - prev,
          changePercent:  q.regularMarketChangePercent ?? 0,
          currency:       q.currency                   ?? 'CAD',
          shortName:      q.shortName ?? q.longName    ?? symbol,
          marketState:    q.marketState                ?? 'CLOSED',
        };
      } catch (err: any) {
        results[symbol] = {
          symbol, price: 0, previousClose: 0, change: 0, changePercent: 0,
          currency: 'CAD', shortName: symbol, marketState: 'CLOSED',
          error: err?.message ?? 'Symbole introuvable',
        };
      }
    })
  );

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  });
}
