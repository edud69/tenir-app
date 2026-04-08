import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, password, companyName, neq, fiscalYearEnd } =
      await request.json();

    // Admin client — bypasses RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Create auth user
    const { data: authData, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (signUpError || !authData.user) {
      return NextResponse.json(
        { error: signUpError?.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 2. Create organization
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: companyName,
        neq: neq || null,
        fiscal_year_end_month: fiscalYearEnd
          ? parseInt(fiscalYearEnd.split('-')[0])
          : 12,
        fiscal_year_end_day: fiscalYearEnd
          ? parseInt(fiscalYearEnd.split('-')[1])
          : 31,
      })
      .select('id')
      .single();

    if (orgError || !orgData) {
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // 3. Create organization membership
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to set up organization' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
