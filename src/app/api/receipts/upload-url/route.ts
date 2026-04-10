import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Returns a presigned upload URL so the client can upload directly to Supabase,
// bypassing the Vercel serverless function payload limit (4.5 MB).
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId, filename, contentType } = await request.json();

    if (!orgId || !userId || !filename) {
      return NextResponse.json({ error: 'Missing orgId, userId or filename' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${orgId}/${Date.now()}_${safeName}`;

    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error('Signed URL error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path: storagePath, token: data.token });
  } catch (e: any) {
    console.error('Upload URL error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
