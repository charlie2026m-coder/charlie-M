import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const { reference, booking } = await request.json();

    if (!reference || !booking) {
      return NextResponse.json({ error: 'reference and booking are required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const supabaseAdmin = createAdminClient();

    // INSERT-ONLY (not upsert). The client generates a fresh UUID reference for
    // every payment attempt, so a reference must never already exist. A re-POST
    // to an existing reference is therefore NOT part of the normal flow — it's
    // exactly how a payload could be swapped AFTER make-payment validated the
    // amount but BEFORE capture (TOCTOU under-capture). Refusing the overwrite
    // freezes the validated payload. Legit retries use a new UUID, unaffected.
    const { error } = await supabaseAdmin.from('pending_bookings').insert({
      reference,
      booking_payload: booking,
      user_id: user?.id || null,
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This payment reference was already used. Please retry the payment.' },
          { status: 409 },
        );
      }
      console.error('[PENDING BOOKING] Failed to save:', error);
      return NextResponse.json({ error: 'Failed to save pending booking' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PENDING BOOKING] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
