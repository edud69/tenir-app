import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side upload using service role key — bypasses storage RLS
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const orgId = formData.get('orgId') as string;
    const userId = formData.get('userId') as string;

    if (!file || !orgId || !userId) {
      return NextResponse.json({ error: 'Missing file, orgId or userId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const storagePath = `${orgId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const buffer = await file.arrayBuffer();

    const { data: storageData, error: storageError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    return NextResponse.json({ path: storageData.path, fullPath: storageData.fullPath });
  } catch (e: any) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
