import { createClient } from '@supabase/supabase-js';
import { plaidClient, mapPlaidCategory } from '@/lib/plaid';

// Determine tenir transaction type from Plaid transaction
function mapPlaidTransactionType(amount: number, plaidCategory: string[] | null): string {
  // Plaid: positive = debit (money out), negative = credit (money in)
  if (amount < 0) return 'income';
  const cat = (plaidCategory || []).join(' ').toLowerCase();
  if (cat.includes('transfer')) return 'transfer';
  return 'expense';
}

// Check if two transactions are likely duplicates
function areDuplicates(
  tx1: { date: string; amount: number; description: string },
  tx2: { date: string; amount: number; description: string }
): boolean {
  // Date within 2 days
  const d1 = new Date(tx1.date).getTime();
  const d2 = new Date(tx2.date).getTime();
  if (Math.abs(d1 - d2) > 2 * 24 * 60 * 60 * 1000) return false;

  // Amount within 1%
  const amtDiff = Math.abs(Math.abs(tx1.amount) - Math.abs(tx2.amount));
  const maxAmt = Math.max(Math.abs(tx1.amount), Math.abs(tx2.amount));
  if (maxAmt > 0 && amtDiff / maxAmt > 0.01) return false;

  return true;
}

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

    // Allow syncing a specific item or all items
    const body = await request.json().catch(() => ({}));
    const specificItemId = body?.item_id;

    // Fetch active plaid items for org
    let itemsQuery = supabase
      .from('plaid_items')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (specificItemId) itemsQuery = itemsQuery.eq('id', specificItemId);

    const { data: items } = await itemsQuery;
    if (!items || items.length === 0) {
      return Response.json({ added: 0, modified: 0, removed: 0, message: 'No connected accounts' });
    }

    // Fetch plaid accounts for mapping plaid_account_id → bank_account_id
    const { data: plaidAccounts } = await supabase
      .from('plaid_accounts')
      .select('plaid_account_id, bank_account_id, id')
      .eq('organization_id', orgId);

    const accountMap = new Map(
      (plaidAccounts || []).map((a) => [a.plaid_account_id, a])
    );

    // Fetch existing manual transactions for duplicate detection (recent 90 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const { data: existingManual } = await supabase
      .from('transactions')
      .select('id, date, amount, description, sync_source')
      .eq('organization_id', orgId)
      .eq('sync_source', 'manual')
      .gte('date', cutoff.toISOString().split('T')[0]);

    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;

    for (const item of items) {
      let cursor = item.cursor || undefined;
      let hasMore = true;

      while (hasMore) {
        const syncRes = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor,
        });

        const { added, modified, removed, next_cursor, has_more } = syncRes.data;
        hasMore = has_more;
        cursor = next_cursor;

        // Process added transactions
        for (const tx of added) {
          if (tx.pending) continue; // Skip pending transactions

          const plaidAccInfo = accountMap.get(tx.account_id);
          const bankAccountId = plaidAccInfo?.bank_account_id || null;

          // Plaid amount: positive = debit (expense), negative = credit (income)
          // Convert to tenir convention: expense = negative, income = positive
          const tenirAmount = tx.amount > 0 ? -tx.amount : Math.abs(tx.amount);
          const txType = mapPlaidTransactionType(tx.amount, tx.category || null);
          const category = mapPlaidCategory(tx.category || null);
          const description = tx.name || tx.merchant_name || 'Transaction';
          const date = tx.date;

          // Check for duplicate against manual entries
          let duplicateOfId: string | null = null;
          if (existingManual) {
            const match = existingManual.find((m) =>
              areDuplicates(
                { date, amount: tenirAmount, description },
                { date: m.date, amount: m.amount, description: m.description }
              )
            );
            if (match) duplicateOfId = match.id;
          }

          await supabase.from('transactions').upsert({
            organization_id: orgId,
            plaid_transaction_id: tx.transaction_id,
            sync_source: 'plaid',
            account_id: bankAccountId,
            type: txType,
            category,
            date,
            description,
            vendor: tx.merchant_name || null,
            amount: tenirAmount,
            currency: tx.iso_currency_code || 'CAD',
            is_recurring: false,
            pending: false,
            is_duplicate: !!duplicateOfId,
            duplicate_of_id: duplicateOfId,
            created_by: user.id,
          }, { onConflict: 'plaid_transaction_id' });

          totalAdded++;
        }

        // Process modified transactions
        for (const tx of modified) {
          const tenirAmount = tx.amount > 0 ? -tx.amount : Math.abs(tx.amount);
          await supabase
            .from('transactions')
            .update({
              description: tx.name || tx.merchant_name || 'Transaction',
              vendor: tx.merchant_name || null,
              amount: tenirAmount,
              date: tx.date,
              pending: false,
            })
            .eq('plaid_transaction_id', tx.transaction_id);
          totalModified++;
        }

        // Process removed transactions
        for (const tx of removed) {
          await supabase
            .from('transactions')
            .delete()
            .eq('plaid_transaction_id', tx.transaction_id);
          totalRemoved++;
        }
      }

      // Update cursor and last_synced_at
      await supabase
        .from('plaid_items')
        .update({ cursor, last_synced_at: new Date().toISOString() })
        .eq('id', item.id);

      // Update account balances
      try {
        const accountsRes = await plaidClient.accountsGet({ access_token: item.access_token });
        for (const acc of accountsRes.data.accounts) {
          const plaidAccInfo = accountMap.get(acc.account_id);
          if (plaidAccInfo?.bank_account_id) {
            await supabase
              .from('bank_accounts')
              .update({ current_balance: acc.balances.current || 0 })
              .eq('id', plaidAccInfo.bank_account_id);
          }
          // Update plaid_accounts balances too
          await supabase
            .from('plaid_accounts')
            .update({
              current_balance: acc.balances.current || null,
              available_balance: acc.balances.available || null,
            })
            .eq('plaid_account_id', acc.account_id);
        }
      } catch (balErr) {
        console.error('Balance update failed:', balErr);
      }
    }

    return Response.json({
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
    });
  } catch (err: any) {
    console.error('Plaid sync error:', err?.response?.data || err.message);
    return Response.json({ error: err?.response?.data?.error_message || err.message }, { status: 500 });
  }
}
