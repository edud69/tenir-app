import { createClient } from '@supabase/supabase-js';
import { CountryCode, Products } from 'plaid';
import { plaidClient } from '@/lib/plaid';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Auth check
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return Response.json({ error: 'No organization found' }, { status: 403 });
    }

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'tenir.app',
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca],
      language: 'fr',
    });

    return Response.json({ link_token: response.data.link_token });
  } catch (err: any) {
    console.error('Plaid link-token error:', err?.response?.data || err.message);
    return Response.json({ error: err?.response?.data?.error_message || err.message }, { status: 500 });
  }
}
