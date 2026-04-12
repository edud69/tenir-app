import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!member) return Response.json({ error: 'No organization found' }, { status: 403 });

    const { data: items } = await supabase
      .from('plaid_items')
      .select(`
        id,
        institution_name,
        institution_id,
        last_synced_at,
        is_active,
        plaid_accounts (
          id,
          name,
          official_name,
          type,
          subtype,
          mask,
          currency,
          current_balance,
          available_balance,
          credit_limit,
          bank_account_id,
          is_active
        )
      `)
      .eq('organization_id', member.organization_id)
      .eq('is_active', true);

    return Response.json({ items: items || [] });
  } catch (err: any) {
    console.error('Plaid accounts error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
