import { NextRequest, NextResponse } from 'next/server';

export interface QuoteResult {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  shortName: string;
  marketState: string; // REGULAR | PRE | POST | CLOSED
  error?: string;
}

/**
 * GET /api/investments/quote?symbols=RY.TO,TD.TO,AAPL
 *
 * Fetches real-time quotes from Yahoo Finance (no API key required).
 * TSX tickers must include .TO suffix (e.g. RY.TO, TD.TO).
 * Results are cached for 5 minutes via Next.js route segment config.
 */
export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 });
  }

  const symbolList = symbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (symbolList.length === 0) {
    return NextResponse.json({ error: 'No valid symbols' }, { status: 400 });
  }

  try {
    // Yahoo Finance v7 quote endpoint — no auth required
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList.join(',')}&lang=en&region=CA&corsDomain=finance.yahoo.com`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      // Fallback to query2 mirror
      const res2 = await fetch(url.replace('query1', 'query2'), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
          'Accept': 'application/json',
        },
      });
      if (!res2.ok) throw new Error(`Yahoo Finance returned ${res2.status}`);
      const data2 = await res2.json();
      return NextResponse.json(parseQuotes(data2, symbolList));
    }

    const data = await res.json();
    return NextResponse.json(parseQuotes(data, symbolList));
  } catch (err: any) {
    console.error('[quote] fetch error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

function parseQuotes(data: any, requested: string[]): Record<string, QuoteResult> {
  const results: Record<string, QuoteResult> = {};
  const quotes: any[] = data?.quoteResponse?.result ?? [];

  for (const q of quotes) {
    const sym = (q.symbol as string).toUpperCase();
    const price = q.regularMarketPrice ?? q.ask ?? q.bid ?? null;
    const prev  = q.regularMarketPreviousClose ?? price;
    if (price == null) continue;
    results[sym] = {
      symbol:        sym,
      price:         price,
      previousClose: prev,
      change:        q.regularMarketChange ?? (price - prev),
      changePercent: q.regularMarketChangePercent ?? 0,
      currency:      q.currency ?? 'CAD',
      shortName:     q.shortName ?? q.longName ?? sym,
      marketState:   q.marketState ?? 'CLOSED',
    };
  }

  // Mark symbols that had no result
  for (const sym of requested) {
    if (!results[sym]) {
      results[sym] = {
        symbol: sym, price: 0, previousClose: 0,
        change: 0, changePercent: 0, currency: 'CAD',
        shortName: sym, marketState: 'CLOSED',
        error: 'Symbol not found',
      };
    }
  }

  return results;
}
