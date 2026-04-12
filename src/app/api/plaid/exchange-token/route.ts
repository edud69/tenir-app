import { createClient } from '@supabase/supabase-js';
import { plaidClient, mapPlaidAccountType } from '@/lib/plaid';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Auth check
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

    const orgId = member.organization_id;
    const body = await request.json();
    const { public_token, metadata } = body;

    if (!public_token) return Response.json({ error: 'public_token required' }, { status: 400 });

    // Exchange public token for access token
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchangeRes.data.access_token;
    const plaidItemId = exchangeRes.data.item_id;

    // Get institution info
    const institutionId = metadata?.institution?.institution_id;
    const institutionName = metadata?.institution?.name || 'Unknown Bank';

    // Save plaid item
    const { data: item, error: itemErr } = await supabase
      .from('plaid_items')
      .upsert({
        organization_id: orgId,
        plaid_item_id: plaidItemId,
        access_token: accessToken,
        institution_id: institutionId || null,
        institution_name: institutionName,
        is_active: true,
      }, { onConflict: 'organization_id,plaid_item_id' })
      .select()
      .single();

    if (itemErr) throw itemErr;

    // Fetch accounts from Plaid
    const accountsRes = await plaidClient.accountsGet({ access_token: accessToken });
    const plaidAccounts = accountsRes.data.accounts;

    const savedAccounts = [];

    for (const plaidAcc of plaidAccounts) {
      const accountType = mapPlaidAccountType(plaidAcc.type, plaidAcc.subtype || null);
      const currency = plaidAcc.balances.iso_currency_code || 'CAD';

      // Create matching bank_account entry
      const { data: bankAcc } = await supabase
        .from('bank_accounts')
        .insert({
          organization_id: orgId,
          name: plaidAcc.name,
          type: accountType,
          institution: institutionName,
          last_four: plaidAcc.mask || null,
          currency,
          current_balance: plaidAcc.balances.current || 0,
          credit_limit: plaidAcc.balances.limit || null,
          is_active: true,
        })
        .select()
        .single();

      // Save plaid account linked to bank_account
      const { data: savedAcc } = await supabase
        .from('plaid_accounts')
        .upsert({
          organization_id: orgId,
          plaid_item_id: item.id,
          bank_account_id: bankAcc?.id || null,
          plaid_account_id: plaidAcc.account_id,
          name: plaidAcc.name,
          official_name: plaidAcc.official_name || null,
          type: plaidAcc.type,
          subtype: plaidAcc.subtype || null,
          mask: plaidAcc.mask || null,
          currency,
          current_balance: plaidAcc.balances.current || null,
          available_balance: plaidAcc.balances.available || null,
          credit_limit: plaidAcc.balances.limit || null,
          is_active: true,
        }, { onConflict: 'plaid_account_id' })
        .select()
        .single();

      if (savedAcc) savedAccounts.push(savedAcc);
    }

    return Response.json({
      item_id: item.id,
      institution_name: institutionName,
      accounts: savedAccounts,
    });
  } catch (err: any) {
    console.error('Plaid exchange-token error:', err?.response?.data || err.message);
    return Response.json({ error: err?.response?.data?.error_message || err.message }, { status: 500 });
  }
}
