import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Log account deletion for GDPR audit trail
    try {
      const headersList = request.headers;
      const ip = 
        headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
        headersList.get('x-real-ip') || 
        'unknown';

      // Record deletion consent
      await supabase.from('consents').insert({
        user_id: user.id,
        consent_type: 'account_deletion',
        consent_given: true,
        ip_address: ip,
        privacy_policy_version: '1.0',
        consent_date: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log account deletion:', logError);
      // Don't block deletion if logging fails
    }

    // Create admin client with service_role key for user deletion
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // GDPR Art. 17 — clear personal data from pending_bookings before user deletion
    await supabaseAdmin
      .from('pending_bookings')
      .update({ booking_payload: { cleared: true }, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    // GDPR Art. 17 — anonymize reservations (keep record for financial audit trail per AO §147)
    await supabaseAdmin
      .from('reservations')
      .update({ last_name: 'DELETED', email: 'deleted@deleted.invalid' })
      .eq('user_id', user.id);

    // Delete user account (this will cascade delete profiles and consents)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again later.' },
        { status: 500 }
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

