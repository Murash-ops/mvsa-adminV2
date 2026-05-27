import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();

    // 1. Authenticate the caller
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    // 2. Fetch the caller's role to verify super_admin privilege
    const { data: callerStaff, error: callerError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerError || !callerStaff || callerStaff.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden. Only Super Admins can add staff.' }, { status: 403 });
    }

    // 3. Extract new staff payload
    const { name, email, role, scope, password } = await request.json();

    if (!name || !email || !role || !scope) {
      return NextResponse.json({ error: 'Missing required staff fields.' }, { status: 400 });
    }

    // Aligned strictly to: super_admin, admin, coach
    if (!['super_admin', 'admin', 'coach'].includes(role)) {
      return NextResponse.json({ error: 'Invalid staff role specified.' }, { status: 400 });
    }

    // 4. Initialize Supabase Admin client with service role key
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const tempPassword = password || `MVSA_${Math.random().toString(36).substring(2, 10)}!`;

    // 5. Create user in Supabase Auth
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });

    if (createUserError || !authUser?.user) {
      return NextResponse.json({ error: createUserError?.message || 'Failed to create Auth user.' }, { status: 500 });
    }

    // 6. Insert row into public.staff profile table
    const { data: newStaffProfile, error: insertStaffError } = await supabaseAdmin
      .from('staff')
      .insert({
        id: authUser.user.id,
        name,
        email,
        role,
        stream_scope: scope
      })
      .select()
      .single();

    if (insertStaffError) {
      // Rollback Auth user if profile insert fails to keep database integrity
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: insertStaffError.message || 'Failed to insert staff profile.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      staff: newStaffProfile,
      tempPassword
    });

  } catch (error: any) {
    console.error('[Error] Create staff API handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
