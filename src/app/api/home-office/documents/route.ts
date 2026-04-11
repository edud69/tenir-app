import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DocumentType } from '@/types/home-office';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'];
const BUCKET = 'home-office-docs';

function serviceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// POST /api/home-office/documents — upload a document
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const homeOfficeId = formData.get('homeOfficeId') as string | null;
    const orgId = formData.get('orgId') as string | null;
    const userId = formData.get('userId') as string | null;
    const documentType = (formData.get('documentType') as DocumentType | null) ?? 'other';
    const periodStart = formData.get('periodStart') as string | null;
    const periodEnd = formData.get('periodEnd') as string | null;
    const amount = formData.get('amount') as string | null;
    const description = formData.get('description') as string | null;

    if (!file || !homeOfficeId || !orgId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, homeOfficeId, orgId, userId' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Accepted: PDF, JPG, PNG, HEIC, WEBP' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 400 });
    }

    const supabase = serviceRoleClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${orgId}/${homeOfficeId}/${Date.now()}_${safeName}`;
    const buffer = await file.arrayBuffer();

    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    const { data: doc, error: dbError } = await (supabase as any)
      .from('home_office_documents')
      .insert({
        home_office_id: homeOfficeId,
        organization_id: orgId,
        document_type: documentType,
        file_path: storageData.path,
        file_name: file.name,
        file_size: file.size,
        period_start: periodStart ?? null,
        period_end: periodEnd ?? null,
        amount: amount ? Number(amount) : null,
        description: description ?? null,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage upload
      await supabase.storage.from(BUCKET).remove([storageData.path]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error uploading home office document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/home-office/documents?homeOfficeId=xxx
// Returns documents with signed URLs (60 min)
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const homeOfficeId = searchParams.get('homeOfficeId');

    if (!homeOfficeId) {
      return NextResponse.json({ error: 'homeOfficeId is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const adminClient = serviceRoleClient();

    const { data: docs, error } = await (supabase as any)
      .from('home_office_documents')
      .select('*')
      .eq('home_office_id', homeOfficeId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URLs
    const docsWithUrls = await Promise.all(
      (docs ?? []).map(async (doc: { file_path: string; [key: string]: unknown }) => {
        const { data: signedData } = await adminClient.storage
          .from(BUCKET)
          .createSignedUrl(doc.file_path, 3600);
        return { ...doc, signed_url: signedData?.signedUrl ?? null };
      })
    );

    return NextResponse.json(docsWithUrls);
  } catch (error) {
    console.error('Error fetching home office documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/home-office/documents?id=xxx
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const adminClient = serviceRoleClient();

    // Fetch the record first (RLS ensures org membership)
    const { data: doc, error: fetchError } = await (supabase as any)
      .from('home_office_documents')
      .select('file_path')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    await adminClient.storage.from(BUCKET).remove([doc.file_path]);

    // Delete from DB
    const { error: deleteError } = await (supabase as any)
      .from('home_office_documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting home office document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
