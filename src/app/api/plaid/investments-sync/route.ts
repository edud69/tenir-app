import { createClient } from '@supabase/supabase-js';
import { plaidClient } from '@/lib/plaid';
import { InvestmentHoldingsGetRequestOptions } from 'plaid';

export async function POST(request: Request) {
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

    const orgId = member.organization_id;

    // Fetch all active plaid items for this org
    const { data: items } = await supabase
      .from('plaid_items')
      .select('id, access_token, institution_name')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (!items || items.length === 0) {
      return Response.json({ synced: 0, message: 'No connected accounts' });
    }

    let totalSynced = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        // Fetch investment holdings from Plaid
        const holdingsRes = await plaidClient.investmentsHoldingsGet({
          access_token: item.access_token,
        });

        const { holdings, securities, accounts } = holdingsRes.data;

        // Build security map
        const securityMap = new Map(securities.map((s) => [s.security_id, s]));

        for (const holding of holdings) {
          const security = securityMap.get(holding.security_id);
          if (!security) continue;

          const symbol = security.ticker_symbol || security.isin || null;
          const name = security.name || symbol || 'Unknown';
          const type = mapSecurityType(security.type || '');
          const currency = holding.iso_currency_code || 'CAD';

          // Upsert into plaid_investment_holdings
          const { data: savedHolding } = await supabase
            .from('plaid_investment_holdings')
            .upsert({
              organization_id: orgId,
              plaid_account_id: holding.account_id,
              security_id: holding.security_id,
              symbol,
              name,
              type,
              quantity: holding.quantity,
              cost_basis: holding.cost_basis || null,
              institution_price: holding.institution_price,
              institution_price_as_of: holding.institution_price_as_of || null,
              currency,
              is_active: true,
              last_synced_at: new Date().toISOString(),
            }, { onConflict: 'plaid_account_id,security_id' })
            .select()
            .single();

          // Try to match/create corresponding investment in the investments table
          if (savedHolding && symbol && holding.quantity && holding.cost_basis) {
            // Look for existing investment with same symbol
            const { data: existing } = await supabase
              .from('investments')
              .select('id')
              .eq('organization_id', orgId)
              .eq('symbol', symbol)
              .eq('sold', false)
              .single();

            if (existing) {
              // Update current price
              await supabase
                .from('investments')
                .update({ current_price: holding.institution_price })
                .eq('id', existing.id);

              // Link to holding
              await supabase
                .from('plaid_investment_holdings')
                .update({ investment_id: existing.id })
                .eq('id', savedHolding.id);
            } else {
              // Auto-create investment record
              const { data: newInv } = await supabase
                .from('investments')
                .insert({
                  organization_id: orgId,
                  symbol: symbol || name,
                  name,
                  type,
                  shares: holding.quantity,
                  purchase_price: holding.cost_basis / holding.quantity,
                  adjusted_cost_base: holding.cost_basis,
                  current_price: holding.institution_price,
                  currency,
                  account_type: 'brokerage',
                  notes: `Synchronisé depuis ${item.institution_name}`,
                  sold: false,
                })
                .select()
                .single();

              if (newInv) {
                await supabase
                  .from('plaid_investment_holdings')
                  .update({ investment_id: newInv.id })
                  .eq('id', savedHolding.id);
              }
            }

            totalSynced++;
          }
        }
      } catch (itemErr: any) {
        // Investment product may not be enabled for this item — skip silently
        if (itemErr?.response?.data?.error_code === 'PRODUCTS_NOT_SUPPORTED') continue;
        errors.push(`${item.institution_name}: ${itemErr?.response?.data?.error_message || itemErr.message}`);
      }
    }

    return Response.json({ synced: totalSynced, errors });
  } catch (err: any) {
    console.error('Plaid investments-sync error:', err?.response?.data || err.message);
    return Response.json({ error: err?.response?.data?.error_message || err.message }, { status: 500 });
  }
}

function mapSecurityType(plaidType: string): string {
  const t = plaidType.toLowerCase();
  if (t.includes('equity') || t.includes('stock')) return 'stock';
  if (t.includes('etf')) return 'etf';
  if (t.includes('mutual') || t.includes('fund')) return 'mutual_fund';
  if (t.includes('bond') || t.includes('fixed')) return 'bond';
  if (t.includes('cash') || t.includes('money market')) return 'gic';
  return 'stock';
}
