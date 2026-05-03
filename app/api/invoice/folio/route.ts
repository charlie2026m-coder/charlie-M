import { NextRequest, NextResponse } from 'next/server';
import { Fetch, getOrRefreshToken } from '@/services/Request';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ensureReservationLink } from '@/services/ensureReservationLink';
import type { FolioResponse, ApaleoInvoiceListResponse, FolioDebitor } from '@/types/apaleo';

const APALEO_API_URL = 'https://api.apaleo.com';

const folioToReservationId = (folioId: string) => folioId.replace(/-\d+$/, '');

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const folioId = request.nextUrl.searchParams.get('folioId');
  if (!folioId) {
    return NextResponse.json({ error: 'folioId is required' }, { status: 400 });
  }

  try {
    const reservationId = folioToReservationId(folioId);

    const link = await ensureReservationLink(supabase, user, reservationId);
    if (!link.ok) {
      return NextResponse.json({ error: link.error }, { status: link.status });
    }

    const [folio, invoiceList, stateResult] = await Promise.all([
      Fetch<FolioResponse>(`/finance/v1/folios/${folioId}`),
      Fetch<ApaleoInvoiceListResponse>(`/finance/v1/invoices?folioIds=${folioId}`),
      supabase
        .from('invoice_states')
        .select('invoice_id, language_code, locked_at')
        .eq('reservation_id', reservationId)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      folio,
      invoices: invoiceList.invoices ?? [],
      hasInvoice: (invoiceList.count ?? 0) > 0,
      state: stateResult.data
        ? {
            invoiceId: stateResult.data.invoice_id,
            languageCode: stateResult.data.language_code,
            lockedAt: stateResult.data.locked_at,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch folio data' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { folioId, debitor } = (await request.json()) as {
      folioId: string;
      debitor: FolioDebitor;
    };

    if (!folioId || !debitor) {
      return NextResponse.json({ error: 'folioId and debitor are required' }, { status: 400 });
    }

    const reservationId = folioToReservationId(folioId);

    const link = await ensureReservationLink(supabase, user, reservationId);
    if (!link.ok) {
      return NextResponse.json({ error: link.error }, { status: link.status });
    }

    const { data: existingLock } = await supabase
      .from('invoice_states')
      .select('reservation_id')
      .eq('reservation_id', reservationId)
      .maybeSingle();

    if (existingLock) {
      return NextResponse.json({ error: 'invoiceLocked' }, { status: 409 });
    }

    const token = await getOrRefreshToken();

    const response = await fetch(
      `${APALEO_API_URL}/finance/v1/folios/${folioId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ op: 'replace', path: '/debitor', value: debitor }]),
      }
    );

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: 'Failed to update folio debitor', details },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
