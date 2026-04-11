import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/entities/[id] — update an entity
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Block editing the current org entity — it syncs from org settings
    const { data: target } = await (supabase as any)
      .from('entities')
      .select('is_current_org')
      .eq('id', id)
      .single();
    if (target?.is_current_org) {
      return NextResponse.json(
        { error: 'The current organization entity is managed by app settings and cannot be edited here.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Only allow updating safe fields
    const allowed = [
      'name', 'neq', 'business_number', 'incorporation_date', 'province',
      'corporation_type', 'sin_last4', 'is_shareholder', 'notes',
    ];

    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: entity, error } = await (supabase as any)
      .from('entities')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ entity });
  } catch (err: any) {
    console.error('PATCH /api/entities/[id] error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/entities/[id] — delete an entity
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Block deleting the current org entity
    const { data: target } = await (supabase as any)
      .from('entities')
      .select('is_current_org')
      .eq('id', id)
      .single();
    if (target?.is_current_org) {
      return NextResponse.json(
        { error: 'The current organization entity cannot be deleted.' },
        { status: 403 }
      );
    }

    const { error } = await (supabase as any)
      .from('entities')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/entities/[id] error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
