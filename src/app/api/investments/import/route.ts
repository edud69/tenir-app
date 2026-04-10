import { NextRequest, NextResponse } from 'next/server';

export interface ImportedInvestment {
  symbol: string | null;
  name: string;
  type: string;
  shares: number;
  purchase_price: number;
  purchase_date: string | null;
  currency: string;
  account_type: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const SYSTEM_PROMPT = `You are an expert financial data parser for Canadian investment portfolios.
Extract all investment positions from the document and return a JSON object with this exact structure:

{
  "investments": [
    {
      "symbol": "ticker or null (e.g. 'RY.TO', 'AAPL', 'XEF.TO')",
      "name": "company or fund name",
      "type": "stock | etf | mutual_fund | bond | gic | other",
      "shares": 0.0,
      "purchase_price": 0.00,
      "purchase_date": "YYYY-MM-DD or null",
      "currency": "CAD or USD",
      "account_type": "RRSP | TFSA | CELI | REER | Margin | Cash | null",
      "confidence": "high | medium | low"
    }
  ]
}

Rules:
- Combine multiple transactions for the same symbol into one position (weighted-average price, total shares)
- purchase_price is cost per share/unit — not total value
- Default currency to CAD unless clearly USD
- For mutual funds without a ticker, use the fund code or ISIN as symbol
- confidence: high = all fields clear, medium = some fields inferred, low = significant guessing
- Return ONLY valid JSON, no explanation, no markdown fences`;

function getMediaType(mime: string): string | null {
  if (mime === 'application/pdf') return 'application/pdf';
  if (mime.startsWith('image/jpeg') || mime.startsWith('image/jpg')) return 'image/jpeg';
  if (mime.startsWith('image/png')) return 'image/png';
  return null;
}

async function fileToText(file: File, buffer: ArrayBuffer): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  // CSV / TXT / OFX / QFX — read directly as UTF-8 text
  if (['csv', 'txt', 'ofx', 'qfx', 'tsv'].includes(ext)) {
    return new TextDecoder('utf-8').decode(buffer);
  }

  // Excel — use xlsx library to convert first sheet to CSV
  if (['xlsx', 'xls', 'xlsm', 'xlsb'].includes(ext)) {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_csv(sheet);
  }

  // Default: try as UTF-8 text
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
}

async function callClaude(content: any[]): Promise<ImportedInvestment[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Claude API error:', err);
    throw new Error('AI parsing service error');
  }

  const result = await res.json();
  const text = result.content?.find((b: any) => b.type === 'text')?.text ?? '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not extract JSON from AI response');

  const parsed = JSON.parse(jsonMatch[0]);
  return (parsed.investments ?? []) as ImportedInvestment[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isPdf = ext === 'pdf' || file.type === 'application/pdf';
    const isImage = ['jpg', 'jpeg', 'png'].includes(ext);

    let content: any[];

    if (isPdf || isImage) {
      // Vision path — base64 encode the file
      const mediaType = getMediaType(isPdf ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`) ?? 'application/pdf';
      const base64 = Buffer.from(buffer).toString('base64');
      content = [
        {
          type: isPdf ? 'document' : 'image',
          source: isPdf
            ? { type: 'base64', media_type: 'application/pdf', data: base64 }
            : { type: 'base64', media_type: mediaType, data: base64 },
        },
        { type: 'text', text: 'Extract all investment positions from this document and return them as JSON.' },
      ];
    } else {
      // Text path — parse to string first, then send as text
      const text = await fileToText(file, buffer);
      if (!text.trim()) return NextResponse.json({ error: 'File appears to be empty or unreadable' }, { status: 400 });

      // Truncate to avoid token limits (~100k chars is safe)
      const truncated = text.length > 100_000 ? text.slice(0, 100_000) + '\n[truncated]' : text;
      content = [
        { type: 'text', text: `Here is the investment data to parse:\n\n${truncated}` },
      ];
    }

    const investments = await callClaude(content);

    if (!investments.length) {
      return NextResponse.json({ error: 'No investment positions found in the file. Check that the file contains portfolio or transaction data.' }, { status: 422 });
    }

    return NextResponse.json({ investments });
  } catch (e: any) {
    console.error('Import error:', e);
    return NextResponse.json({ error: e.message || 'Import failed' }, { status: 500 });
  }
}
