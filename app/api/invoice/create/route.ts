import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Fetch, getOrRefreshToken } from '@/services/Request';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import type {
  ApaleoInvoiceListResponse,
  FolioDebitor,
  PreviewInvoiceResponse,
} from '@/types/apaleo';

const APALEO_API_URL = 'https://api.apaleo.com';

const folioToReservationId = (folioId: string) => folioId.replace(/-\d+$/, '');

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  // Session is required, and the user must OWN the reservation (email match or
  // a reservations-table link) — knowing the id is not enough, or any guest
  // session could close/lock another guest's folio.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { folioId, languageCode, debitor } = (await request.json()) as {
      folioId: string;
      languageCode: string;
      debitor?: FolioDebitor;
    };

    if (!folioId || !languageCode) {
      return NextResponse.json(
        { error: 'folioId and languageCode are required' },
        { status: 400 },
      );
    }

    const reservationId = folioToReservationId(folioId);

    const ownership = await verifyReservationOwnership(supabase, user, reservationId);
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const admin = createAdminClient();

    // Idempotency: if already locked, return the saved invoice id without
    // touching Apaleo. Re-clicking Generate never duplicates the invoice.
    const { data: existingLock } = await admin
      .from('invoice_states')
      .select('invoice_id, language_code')
      .eq('reservation_id', reservationId)
      .maybeSingle();

    if (existingLock) {
      return NextResponse.json({
        invoiceId: existingLock.invoice_id,
        languageCode: existingLock.language_code,
        alreadyLocked: true,
      });
    }

    // Recovery: if Apaleo already has an invoice for this folio (prior attempt
    // created it but our lock INSERT didn't land), reuse it instead of POSTing
    // a duplicate.
    const folioIdQuery = encodeURIComponent(folioId);
    const existingInvoices = await Fetch<ApaleoInvoiceListResponse>(
      `/finance/v1/invoices?folioIds=${folioIdQuery}`,
    );
    // Prefer the invoice whose language matches the request; fall back to the
    // most recent (last) one so we don't silently return a stale EN invoice
    // when the guest requested DE (or vice-versa).
    const invoices = existingInvoices.invoices ?? [];
    const recoveredInvoice =
      invoices.find((inv) => inv.languageCode === languageCode) ?? invoices.at(-1);

    let invoiceId: string;
    // The language stored in invoice_states must match the language baked into
    // the actual Apaleo PDF — on recovery we read it from Apaleo, otherwise we
    // use the one we just sent on POST.
    let storedLanguageCode: string;

    if (recoveredInvoice) {
      invoiceId = recoveredInvoice.id;
      storedLanguageCode = recoveredInvoice.languageCode ?? languageCode;
    } else {
      // Pre-flight: surface Apaleo's blocking reason as a typed warning the
      // client can localize, instead of string-matching error messages.
      const preview = await Fetch<PreviewInvoiceResponse>(
        `/finance/v1/invoices/preview?folioId=${folioIdQuery}`,
      );
      if (preview.createInvoiceAction === 'CannotCreateInvoice') {
        return NextResponse.json(
          {
            error: 'invoiceNotAllowed',
            warning: preview.createInvoiceWarning?.type ?? 'Unknown',
          },
          { status: 422 },
        );
      }

      // POST /invoices atomically closes the folio + creates the invoice
      // (CreatesInvoiceAndClosesFolio per Apaleo spec).
      //
      // Idempotency-Key includes languageCode because Apaleo rejects key
      // reuse with different request parameters; without it, a retry in DE
      // after a failed EN attempt would be blocked for 24h.
      const createToken = await getOrRefreshToken();
      const createResponse = await fetch(`${APALEO_API_URL}/finance/v1/invoices`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${createToken}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `${reservationId}-${languageCode}`,
        },
        body: JSON.stringify({ folioId, languageCode }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        const apaleoMessage = (errorData as { messages?: string[] })?.messages?.[0] ?? '';
        return NextResponse.json(
          { error: apaleoMessage || 'Failed to create invoice' },
          { status: createResponse.status },
        );
      }

      const invoice = (await createResponse.json()) as { id?: string };
      if (!invoice.id) {
        return NextResponse.json({ error: 'Invoice created but ID not returned' }, { status: 500 });
      }
      invoiceId = invoice.id;
      storedLanguageCode = languageCode;
    }

    const { error: insertError } = await admin
      .from('invoice_states')
      .insert({
        reservation_id: reservationId,
        user_id: user.id,
        invoice_id: invoiceId,
        language_code: storedLanguageCode,
        edited_debitor: debitor ?? null,
      });

    if (insertError) {
      // PK conflict means a concurrent request locked first. Re-fetch the
      // stored row so the client gets the winner's invoice_id, not ours.
      if (insertError.code === '23505') {
        const { data: stored } = await admin
          .from('invoice_states')
          .select('invoice_id, language_code')
          .eq('reservation_id', reservationId)
          .single();

        if (stored) {
          return NextResponse.json({
            invoiceId: stored.invoice_id,
            languageCode: stored.language_code,
            alreadyLocked: true,
          });
        }
      }

      return NextResponse.json(
        { error: 'Failed to persist invoice lock', details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ invoiceId, languageCode: storedLanguageCode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
