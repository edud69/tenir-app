import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/entities — list all entities for the current org
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org from membership
    const { data: membership, error: memberError } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const orgId = membership.organization_id;
    const db = supabase as any;

    let { data: entities, error } = await db
      .from('entities')
      .select('*')
      .eq('organization_id', orgId)
      .order('entity_type', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    // ── Auto-sync current org entity from organization settings ──────────────
    const { data: org } = await (supabase as any)
      .from('organizations')
      .select('name, neq, business_number, province, incorporation_date')
      .eq('id', orgId)
      .single();

    if (org) {
      const currentOrgEntity = (entities ?? []).find((e: any) => e.is_current_org);
      const syncPayload = {
        organization_id: orgId,
        name: org.name,
        entity_type: 'corporation',
        corporation_type: 'ccpc',
        neq: org.neq ?? null,
        business_number: org.business_number ?? null,
        incorporation_date: org.incorporation_date ?? null,
        province: org.province ?? 'QC',
        is_current_org: true,
        is_shareholder: false,
      };

      if (!currentOrgEntity) {
        await (supabase as any).from('entities').insert(syncPayload);
      } else {
        const needsUpdate =
          currentOrgEntity.name !== org.name ||
          currentOrgEntity.neq !== (org.neq ?? null) ||
          currentOrgEntity.business_number !== (org.business_number ?? null) ||
          currentOrgEntity.province !== (org.province ?? 'QC');
        if (needsUpdate) {
          await (supabase as any).from('entities').update({
            name: org.name,
            neq: org.neq ?? null,
            business_number: org.business_number ?? null,
            province: org.province ?? 'QC',
          }).eq('id', currentOrgEntity.id);
        }
      }

      if (!currentOrgEntity || (currentOrgEntity && (
        currentOrgEntity.name !== org.name ||
        currentOrgEntity.neq !== (org.neq ?? null) ||
        currentOrgEntity.business_number !== (org.business_number ?? null) ||
        currentOrgEntity.province !== (org.province ?? 'QC')
      ))) {
        const { data: refreshed } = await db
          .from('entities')
          .select('*')
          .eq('organization_id', orgId)
          .order('entity_type', { ascending: true })
          .order('name', { ascending: true });
        entities = refreshed;
      }
    }

    return NextResponse.json({ entities: entities ?? [] });
  } catch (err: any) {
    console.error('GET /api/entities error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

// POST /api/entities — create a new entity
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership, error: memberError } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      entity_type,
      neq,
      business_number,
      incorporation_date,
      province,
      corporation_type,
      sin_last4,
      is_shareholder,
      is_current_org,
      notes,
    } = body;

    if (!name || !entity_type) {
      return NextResponse.json({ error: 'name and entity_type are required' }, { status: 400 });
    }

    if (!['corporation', 'individual'].includes(entity_type)) {
      return NextResponse.json({ error: 'entity_type must be corporation or individual' }, { status: 400 });
    }

    const db2 = supabase as any;
    const { data: entity, error } = await db2
      .from('entities')
      .insert({
        organization_id: membership.organization_id,
        name,
        entity_type,
        neq: neq ?? null,
        business_number: business_number ?? null,
        incorporation_date: incorporation_date ?? null,
        province: province ?? 'QC',
        corporation_type: corporation_type ?? null,
        sin_last4: sin_last4 ?? null,
        is_shareholder: is_shareholder ?? true,
        is_current_org: is_current_org ?? false,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ entity }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/entities error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
