import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export interface ExtractedTransaction {
  type: 'expense' | 'income' | 'dividend' | 'capital_gain' | 'interest' | 'transfer';
  category: string;
  date: string;
  description: string;
  amount: number;
  vendor?: string | null;
  notes?: string | null;
  isDuplicate?: boolean;
  duplicateId?: string;
}

const VALID_TYPES = ['expense', 'income', 'dividend', 'capital_gain', 'interest', 'transfer'];
const VALID_CATEGORIES = [
  'office', 'professional', 'insurance', 'travel', 'meals', 'supplies',
  'technology', 'bank', 'legal', 'accounting', 'dividend', 'capital_gain',
  'interest', 'other',
];

const systemPrompt = `You are an expert financial transaction analyzer. Given financial data from a bank statement, CSV export, or accounting document, extract ALL transactions and return them as a JSON array.

Return ONLY a JSON array with no additional text. Each transaction object must have:
{
  "type": one of: "expense", "income", "dividend", "capital_gain", "interest", "transfer",
  "category": one of: "office", "professional", "insurance", "travel", "meals", "supplies", "technology", "bank", "legal", "accounting", "dividend", "capital_gain", "interest", "other",
  "date": "YYYY-MM-DD format",
  "description": "transaction description",
  "amount": positive number (e.g. 123.45),
  "vendor": "vendor/payee name or null"
}

Rules:
- amount is ALWAYS positive — use "type" to indicate direction ("expense" for money out, "income" for money in)
- If a row has debit/credit columns: debit = expense, credit = income
- Infer the type from description when possible (e.g. "salary" → income, "rent" → expense, "dividend" → dividend)
- Infer category from description (e.g. "AWS" → technology, "restaurant" → meals, "Air Canada" → travel)
- Skip header rows, totals, and non-transaction rows
- Convert all dates to YYYY-MM-DD
- Return an empty array [] if no transactions found`;

async function callClaude(content: Array<{ type: string; [key: string]: unknown }>): Promise<ExtractedTransaction[]> {
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
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const result = await res.json();
  const textBlock = result.content?.find((b: { type: string }) => b.type === 'text');
  if (!textBlock) throw new Error('No text in Claude response');

  const jsonMatch = (textBlock as { text: string }).text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array in Claude response');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array');

  // Normalize and validate
  return parsed
    .filter((tx: ExtractedTransaction) => tx.date && tx.description && tx.amount > 0)
    .map((tx: ExtractedTransaction) => ({
      type: VALID_TYPES.includes(tx.type) ? tx.type : 'expense',
      category: VALID_CATEGORIES.includes(tx.category) ? tx.category : 'other',
      date: tx.date,
      description: String(tx.description).trim(),
      amount: Math.abs(Number(tx.amount)),
      vendor: tx.vendor || null,
      notes: tx.notes || null,
    }));
}

function excelToText(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, dateNF: 'YYYY-MM-DD' });
    lines.push(`=== Sheet: ${sheetName} ===`);
    for (const row of rows as string[][]) {
      if (row.some((cell) => cell != null && cell !== '')) {
        lines.push(row.map((c) => (c ?? '')).join('\t'));
      }
    }
  }

  return lines.join('\n');
}

function isSimilar(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Check if one contains the other (at least 60% overlap)
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  return longer.includes(shorter) && shorter.length / longer.length > 0.6;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const orgId = formData.get('orgId') as string | null;

    if (!file) {
      return Response.json({ error: 'File is required' }, { status: 400 });
    }
    if (!orgId) {
      return Response.json({ error: 'orgId is required' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isExcel =
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv') ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel') ||
      file.type === 'text/csv';

    if (!isPdf && !isExcel) {
      return Response.json(
        { error: 'Unsupported file type. Please upload a PDF, Excel (.xlsx/.xls), or CSV file.' },
        { status: 400 }
      );
    }

    // Build Claude message content
    let messageContent: Array<{ type: string; [key: string]: unknown }>;

    if (isPdf) {
      const base64 = Buffer.from(buffer).toString('base64');
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        {
          type: 'text',
          text: 'Extract all financial transactions from this document and return them as a JSON array.',
        },
      ];
    } else {
      // Excel / CSV → convert to text
      let text: string;
      if (fileName.endsWith('.csv') || file.type === 'text/csv') {
        text = new TextDecoder().decode(buffer);
      } else {
        text = excelToText(buffer);
      }
      messageContent = [
        {
          type: 'text',
          text: `Extract all financial transactions from the following tabular data and return them as a JSON array:\n\n${text}`,
        },
      ];
    }

    // Call Claude
    let extracted: ExtractedTransaction[];
    try {
      extracted = await callClaude(messageContent);
    } catch (err: unknown) {
      console.error('Claude extraction error:', err);
      return Response.json(
        { error: 'Failed to extract transactions from file' },
        { status: 502 }
      );
    }

    if (extracted.length === 0) {
      return Response.json({ transactions: [], message: 'No transactions found in file' });
    }

    // Check duplicates against existing transactions in DB
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch existing transactions for this org (last 2 years to keep it bounded)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const { data: existing } = await supabase
        .from('transactions')
        .select('id, date, amount, description')
        .eq('organization_id', orgId)
        .gte('date', twoYearsAgo.toISOString().split('T')[0]);

      if (existing && existing.length > 0) {
        for (const tx of extracted) {
          const dupe = existing.find(
            (e: { id: string; date: string; amount: number; description: string }) =>
              e.date === tx.date &&
              Math.abs(e.amount - tx.amount) < 0.01 &&
              isSimilar(e.description, tx.description)
          );
          if (dupe) {
            tx.isDuplicate = true;
            tx.duplicateId = dupe.id;
          }
        }
      }
    }

    return Response.json({ transactions: extracted });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
