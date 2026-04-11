import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/financial-flows — list all flows for the org (optionally filtered)
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entity_id');
    const flowType = searchParams.get('flow_type');
    const fiscalYear = searchParams.get('fiscal_year');

    const db = supabase as any;
    let query = db
      .from('financial_flows')
      .select(`
        *,
        from_entity:entities!financial_flows_from_entity_id_fkey(id, name, entity_type, corporation_type),
        to_entity:entities!financial_flows_to_entity_id_fkey(id, name, entity_type, corporation_type)
      `)
      .eq('organization_id', membership.organization_id)
      .order('date', { ascending: false });

    if (entityId) {
      // Flows where this entity is involved (either direction)
      query = db
        .from('financial_flows')
        .select(`
          *,
          from_entity:entities!financial_flows_from_entity_id_fkey(id, name, entity_type, corporation_type),
          to_entity:entities!financial_flows_to_entity_id_fkey(id, name, entity_type, corporation_type)
        `)
        .eq('organization_id', membership.organization_id)
        .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`)
        .order('date', { ascending: false });
    }

    if (flowType) {
      query = query.eq('flow_type', flowType);
    }

    if (fiscalYear) {
      query = query.eq('fiscal_year', parseInt(fiscalYear));
    }

    const { data: flows, error } = await query;
    if (error) throw error;

    return NextResponse.json({ flows: flows ?? [] });
  } catch (err: any) {
    console.error('GET /api/financial-flows error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

// POST /api/financial-flows — record a new flow
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
      from_entity_id,
      to_entity_id,
      flow_type,
      amount,
      currency,
      date,
      fiscal_year,
      is_open_balance,
      outstanding_balance,
      interest_rate,
      due_date,
      rdtoh_refund_eligible,
      grip_impact,
      status,
      description,
      notes,
      document_ref,
    } = body;

    if (!from_entity_id || !to_entity_id || !flow_type || !amount || !date) {
      return NextResponse.json({
        error: 'from_entity_id, to_entity_id, flow_type, amount, and date are required',
      }, { status: 400 });
    }

    if (from_entity_id === to_entity_id) {
      return NextResponse.json({ error: 'from and to entity must be different' }, { status: 400 });
    }

    const validFlowTypes = [
      'dividend_eligible', 'dividend_non_eligible', 'dividend_capital',
      'shareholder_loan', 'loan_repayment', 'advance', 'advance_repayment',
      'management_fee', 'capital_contribution',
    ];

    if (!validFlowTypes.includes(flow_type)) {
      return NextResponse.json({ error: `Invalid flow_type: ${flow_type}` }, { status: 400 });
    }

    // Auto-compute RDTOH refund for eligible dividends (38.33% of amount)
    let computedRdtoh = rdtoh_refund_eligible ?? null;
    if (flow_type === 'dividend_eligible' && !rdtoh_refund_eligible) {
      computedRdtoh = Math.round(amount * 0.3833 * 100) / 100;
    }

    const { data: flow, error } = await (supabase as any)
      .from('financial_flows')
      .insert({
        organization_id: membership.organization_id,
        from_entity_id,
        to_entity_id,
        flow_type,
        amount,
        currency: currency ?? 'CAD',
        date,
        fiscal_year: fiscal_year ?? null,
        is_open_balance: is_open_balance ?? false,
        outstanding_balance: outstanding_balance ?? null,
        interest_rate: interest_rate ?? null,
        due_date: due_date ?? null,
        rdtoh_refund_eligible: computedRdtoh,
        grip_impact: grip_impact ?? null,
        status: status ?? 'recorded',
        description: description ?? null,
        notes: notes ?? null,
        document_ref: document_ref ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-create a corresponding transaction so flows appear in the Transactions section
    try {
      // Fetch entity names for the description
      const { data: fromEntity } = await (supabase as any)
        .from('entities').select('id, name, is_current_org').eq('id', from_entity_id).single();
      const { data: toEntity } = await (supabase as any)
        .from('entities').select('id, name, is_current_org').eq('id', to_entity_id).single();

      // Determine transaction type from the org's perspective
      const isDividend = (flow_type as string).startsWith('dividend_');
      let txType: string;
      if (isDividend) {
        txType = 'dividend';
      } else if (toEntity?.is_current_org) {
        txType = 'income';
      } else {
        txType = 'expense';
      }

      // Category mapping
      const categoryMap: Record<string, string> = {
        dividend_eligible: 'other',
        dividend_non_eligible: 'other',
        dividend_capital: 'other',
        management_fee: 'professional',
        shareholder_loan: 'other',
        loan_repayment: 'other',
        advance: 'other',
        advance_repayment: 'other',
        capital_contribution: 'other',
      };

      const flowLabels: Record<string, string> = {
        dividend_eligible: 'Dividende déterminé',
        dividend_non_eligible: 'Dividende non déterminé',
        dividend_capital: 'Dividende en capital',
        management_fee: 'Frais de gestion',
        shareholder_loan: 'Prêt actionnaire',
        loan_repayment: 'Remb. prêt',
        advance: 'Avance',
        advance_repayment: 'Remb. avance',
        capital_contribution: 'Apport en capital',
      };

      const fromName = fromEntity?.name ?? from_entity_id;
      const toName = toEntity?.name ?? to_entity_id;
      const txDescription = description ?? `${flowLabels[flow_type] ?? flow_type} — ${fromName} → ${toName}`;

      await (supabase as any).from('transactions').insert({
        organization_id: membership.organization_id,
        type: txType,
        amount,
        currency: currency ?? 'CAD',
        date,
        description: txDescription,
        category: categoryMap[flow_type] ?? 'other',
        vendor: fromName,
        is_recurring: false,
        notes: `Flux financier: ${flow_type} (ID: ${flow.id})`,
        created_by: user.id,
      });
    } catch (_txErr) {
      // Non-fatal: flow was saved, transaction creation failed silently
      console.warn('POST /api/financial-flows: could not auto-create transaction', _txErr);
    }

    return NextResponse.json({ flow }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/financial-flows error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
