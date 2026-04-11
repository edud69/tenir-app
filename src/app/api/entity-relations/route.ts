import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/entity-relations — list all relations for the current org
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const { data: relations, error } = await (supabase as any)
      .from('entity_relations')
      .select(`
        *,
        parent_entity:entities!entity_relations_parent_entity_id_fkey(id, name, entity_type, corporation_type),
        child_entity:entities!entity_relations_child_entity_id_fkey(id, name, entity_type, corporation_type)
      `)
      .eq('organization_id', membership.organization_id)
      .order('effective_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ relations: relations ?? [] });
  } catch (err: any) {
    console.error('GET /api/entity-relations error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

// POST /api/entity-relations — create a relation
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      parent_entity_id,
      child_entity_id,
      ownership_percentage,
      share_class,
      num_shares,
      share_value,
      effective_date,
      end_date,
      notes,
    } = body;

    if (!parent_entity_id || !child_entity_id || !effective_date) {
      return NextResponse.json({
        error: 'parent_entity_id, child_entity_id, and effective_date are required',
      }, { status: 400 });
    }

    if (parent_entity_id === child_entity_id) {
      return NextResponse.json({ error: 'An entity cannot own itself' }, { status: 400 });
    }

    const { data: relation, error } = await (supabase as any)
      .from('entity_relations')
      .insert({
        organization_id: membership.organization_id,
        parent_entity_id,
        child_entity_id,
        ownership_percentage: ownership_percentage ?? 100,
        share_class: share_class ?? 'A',
        num_shares: num_shares ?? null,
        share_value: share_value ?? null,
        effective_date,
        end_date: end_date ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ relation }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/entity-relations error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
