import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Atomically anonymize all user PII in a single DB transaction.
  // If any table update fails the function rolls back — nothing is partially cleaned.
  const { error: anonymizeError } = await supabaseAdmin.rpc(
    'anonymize_user_data_for_deletion',
    { target_user_id: user.id }
  );

  if (anonymizeError) {
    console.error('Account deletion — anonymization failed:', anonymizeError.message);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again later.' },
      { status: 500 }
    );
  }

  // Write GDPR audit record via service_role.
  // consents.user_id FK is SET NULL (not CASCADE), so this row survives deleteUser().
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const { error: consentError } = await supabaseAdmin.from('consents').insert({
    user_id: user.id,
    consent_type: 'account_deletion',
    consent_given: true,
    ip_address: ip,
    privacy_policy_version: '1.0',
    consent_date: new Date().toISOString(),
  });

  if (consentError) {
    // Non-blocking: anonymization already succeeded (GDPR Art. 17 compliant).
    // Log the gap but do not block the user's right to erasure.
    console.error('Account deletion — audit consent write failed:', consentError.message);
  }

  // Point of no return — remove the auth user.
  // profiles cascade-deletes automatically.
  // pending_services(completed).user_id is NULLed by FK; pending/failed were already deleted above.
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Account deletion — auth.admin.deleteUser failed:', deleteError.message);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again later.' },
      { status: 500 }
    );
  }

  await supabase.auth.signOut();
  return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 });
}
