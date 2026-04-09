import { createClient } from '@supabase/supabase-js';

interface ExtractedReceiptData {
  vendorName: string | null;
  totalAmount: number | null;
  date: string | null;
  gst: number | null;
  qst: number | null;
  taxNumbers: string[];
  lineItems: Array<{ description: string; amount: number }>;
  category: string | null;
  raw: string;
}

const systemPrompt = `You are an expert receipt analyzer. Extract the following information from receipts in a structured JSON format:

{
  "vendorName": "string or null",
  "totalAmount": "number or null (in dollars, e.g., 123.45)",
  "date": "string in YYYY-MM-DD format or null",
  "gst": "number or null (GST amount, e.g., 12.30)",
  "qst": "number or null (QST amount, e.g., 18.50)",
  "taxNumbers": ["array of tax numbers found"],
  "lineItems": [{ "description": "item description", "amount": "item amount as number" }],
  "category": "string or null (e.g., 'office supplies', 'meals', 'travel', 'professional services', 'insurance', 'technology', 'bank fees', 'legal fees', 'accounting fees', or 'other')"
}

Be precise with numbers. Return null for any fields you cannot determine. Always return valid JSON.`;

function getMediaType(fileType: string): string | null {
  if (fileType === 'application/pdf') return 'application/pdf';
  if (fileType === 'image/jpeg' || fileType === 'image/jpg') return 'image/jpeg';
  if (fileType === 'image/png') return 'image/png';
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'File is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mediaType = getMediaType(file.type);

    if (!mediaType) {
      return new Response(JSON.stringify({ error: 'Unsupported file type. Use PDF, JPG, or PNG.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              {
                type: 'text',
                text: 'Please extract all receipt information from this image and return it as JSON.',
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', errText);
      return new Response(JSON.stringify({ error: 'OCR service error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await anthropicRes.json();
    const textContent = result.content?.find((block: any) => block.type === 'text');

    if (!textContent) {
      return new Response(JSON.stringify({ error: 'No text in OCR response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let extractedData: ExtractedReceiptData;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      extractedData = { ...JSON.parse(jsonMatch[0]), raw: textContent.text };
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse extracted data', raw: textContent.text }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Optionally upload to Supabase Storage
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const fileName = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await supabase.storage.from('receipts').upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });
      }
    } catch (storageError) {
      console.error('Storage upload failed:', storageError);
    }

    return new Response(JSON.stringify(extractedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('OCR error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
