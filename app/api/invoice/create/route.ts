import { NextRequest, NextResponse } from 'next/server';
import { Fetch, getOrRefreshToken } from '@/services/Request';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { FolioResponse } from '@/types/apaleo';

const APALEO_API_URL = 'https://api.apaleo.com';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { folioId, languageCode } = (await request.json()) as {
      folioId: string;
      languageCode: string;
    };

    if (!folioId || !languageCode) {
      return NextResponse.json(
        { error: 'folioId and languageCode are required' },
        { status: 400 }
      );
    }

    const folio = await Fetch<FolioResponse>(`/finance/v1/folios/${folioId}`);

    if (folio.balance && folio.balance.amount !== 0) {
      return NextResponse.json(
        { error: 'folioBalanceError' },
        { status: 422 }
      );
    }

    if (folio.status === 'Open') {
      const token = await getOrRefreshToken();
      const closeResponse = await fetch(
        `${APALEO_API_URL}/finance/v1/folio-actions/${folioId}/close`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
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

    const invoice = await createResponse.json() as { id?: string };

    if (!invoice.id) {
      return NextResponse.json({ error: 'Invoice created but ID not returned' }, { status: 500 });
    }

    return NextResponse.json({ invoiceId: invoice.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
