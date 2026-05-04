import { NextRequest, NextResponse } from 'next/server';
import { Fetch, getOrRefreshToken } from '@/services/Request';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ensureReservationLink } from '@/services/ensureReservationLink';
import type { FolioResponse, ApaleoInvoiceListResponse, FolioDebitor } from '@/types/apaleo';

const APALEO_API_URL = 'https://api.apaleo.com';

const folioToReservationId = (folioId: string) => folioId.replace(/-\d+$/, '');

export async function POST(request: NextRequest) {
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
        { status: 400 }
      );
    }

    const reservationId = folioToReservationId(folioId);

    // Verify ownership via Apaleo email match + auto-link to local reservations
    // table so the RLS-gated INSERT below is allowed.
    const link = await ensureReservationLink(supabase, user, reservationId);
    if (!link.ok) {
      return NextResponse.json({ error: link.error }, { status: link.status });
    }

    // Idempotency: if already locked, return the saved invoice id without
    // touching Apaleo. Re-clicking Generate never duplicates the invoice.
    const { data: existingLock } = await supabase
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
    const existingInvoices = await Fetch<ApaleoInvoiceListResponse>(
      `/finance/v1/invoices?folioIds=${folioId}`
    );
    const recoveredInvoiceId = existingInvoices.invoices?.[0]?.id;

    let invoiceId: string;

    if (recoveredInvoiceId) {
      invoiceId = recoveredInvoiceId;
    } else {
      const folio = await Fetch<FolioResponse>(`/finance/v1/folios/${folioId}`);

      if (folio.balance && folio.balance.amount !== 0) {
        return NextResponse.json({ error: 'folioBalanceError' }, { status: 422 });
      }

      if (folio.status === 'Open') {
        const closeToken = await getOrRefreshToken();
        const closeResponse = await fetch(
          `${APALEO_API_URL}/finance/v1/folio-actions/${folioId}/close`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${closeToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!closeResponse.ok) {
          const details = await closeResponse.text();
          return NextResponse.json(
            { error: 'Failed to close folio', details },
            { status: closeResponse.status }
          );
        }
      }

      const createToken = await getOrRefreshToken();
      const createResponse = await fetch(`${APALEO_API_URL}/finance/v1/invoices`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${createToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folioId, languageCode }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        const apaleoMessage = (errorData as { messages?: string[] })?.messages?.[0] ?? '';

        if (apaleoMessage.includes('empty folio')) {
          return NextResponse.json({ error: 'emptyFolioError' }, { status: 422 });
        }

        return NextResponse.json(
          { error: apaleoMessage || 'Failed to create invoice' },
          { status: createResponse.status }
        );
      }

      const invoice = (await createResponse.json()) as { id?: string };
      if (!invoice.id) {
        return NextResponse.json({ error: 'Invoice created but ID not returned' }, { status: 500 });
      }
      invoiceId = invoice.id;
    }

    const { error: insertError } = await supabase
      .from('invoice_states')
      .insert({
        reservation_id: reservationId,
        user_id: user.id,
        invoice_id: invoiceId,
        language_code: languageCode,
        edited_debitor: debitor ?? null,
      });

    if (insertError) {
      // PK conflict means a concurrent request locked first. Re-fetch the
      // stored row so the client gets the winner's invoice_id, not ours.
      if (insertError.code === '23505') {
        const { data: stored } = await supabase
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
        { status: 500 }
      );
    }

    return NextResponse.json({ invoiceId, languageCode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
