import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOrRefreshToken } from '@/services/Request';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';

const APALEO_API_URL = 'https://api.apaleo.com';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
const PDF_RETRY_ATTEMPTS = 3;
const PDF_RETRY_DELAY_MS = 1500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invoiceId = request.nextUrl.searchParams.get('invoiceId');
  if (!invoiceId) {
    return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
  }

  try {
    // Authorize: don't trust a raw invoiceId. It must belong to a reservation
    // the user owns. invoice_states maps reservation_id↔invoice_id (written
    // when the invoice was created); resolve it and verify ownership before
    // streaming any PDF.
    const admin = createAdminClient();
    const { data: state } = await admin
      .from('invoice_states')
      .select('reservation_id')
      .eq('invoice_id', invoiceId)
      .maybeSingle();
    if (!state) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const ownership = await verifyReservationOwnership(supabase, user, state.reservation_id);
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const token = await getOrRefreshToken();

    for (let attempt = 1; attempt <= PDF_RETRY_ATTEMPTS; attempt++) {
      const response = await fetch(
        `${APALEO_API_URL}/finance/v1/invoices/${invoiceId}/pdf`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/pdf',
          },
        }
      );

      if (response.status === 204) {
        if (attempt < PDF_RETRY_ATTEMPTS) {
          await sleep(PDF_RETRY_DELAY_MS);
          continue;
        }
        return NextResponse.json({ error: 'invoiceNotReady' }, { status: 202 });
      }

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        return NextResponse.json(
          { error: `Failed to fetch invoice PDF: ${response.status}`, details },
          { status: response.status }
        );
      }

      const pdfBlob = await response.blob();

      return new NextResponse(pdfBlob, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: 'invoiceNotReady' }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
