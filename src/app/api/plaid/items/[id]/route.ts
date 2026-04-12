import { createClient } from '@supabase/supabase-js';
import { plaidClient } from '@/lib/plaid';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Fetch the item to get access_token
    const { data: item } = await supabase
      .from('plaid_items')
      .select('access_token, organization_id')
      .eq('id', params.id)
      .eq('organization_id', member.organization_id)
      .single();

    if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });

    // Remove item from Plaid
    try {
      await plaidClient.itemRemove({ access_token: item.access_token });
    } catch (plaidErr) {
      console.error('Plaid item remove error (non-fatal):', plaidErr);
    }

    // Mark as inactive (soft delete)
    await supabase
      .from('plaid_items')
      .update({ is_active: false })
      .eq('id', params.id);

    await supabase
      .from('plaid_accounts')
      .update({ is_active: false })
      .eq('plaid_item_id', params.id);

    return Response.json({ success: true });
  } catch (err: any) {
    console.error('Plaid disconnect error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
