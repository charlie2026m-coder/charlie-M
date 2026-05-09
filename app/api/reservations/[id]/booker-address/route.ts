import { NextResponse } from 'next/server';
import { Fetch, getOrRefreshToken } from '@/services/Request';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const APALEO_API_URL = 'https://api.apaleo.com';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: ownership } = await supabase
      .from('reservations')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('user_id', user.id)
      .single();

    if (!ownership) {
      // Fallback: fetch reservation from Apaleo to check booker email
      try {
        const reservation = await Fetch<{ booker?: { email?: string } }>(
          `/booking/v1/reservations/${reservationId}?expand=booker`
        );
        const bookerEmail = reservation?.booker?.email?.toLowerCase();
        const userEmail = user.email?.toLowerCase();
        if (!bookerEmail || !userEmail || bookerEmail !== userEmail) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }
    }

    const { updatedGuestData } = await request.json();

    const token = await getOrRefreshToken();

    const folioId = `${reservationId}-1`;

    const reservationPatchOperations = [
      {
        op: 'replace',
        path: '/primaryGuest',
        value: updatedGuestData,
      },
    ];

    const folioDebitorData = {
      firstName: updatedGuestData.firstName,
      name: updatedGuestData.lastName,
      email: updatedGuestData.email,
      phone: updatedGuestData.phone,
      address: updatedGuestData.address,
      type: 'PrimaryGuest',
      ...(updatedGuestData.company && { company: updatedGuestData.company }),
    };

    const folioPatchOperations = [
      {
        op: 'replace',
        path: '/debitor',
        value: folioDebitorData,
      },
    ];

    const [updateReservationResponse, updateFolioResponse] = await Promise.all([
      fetch(`${APALEO_API_URL}/booking/v1/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationPatchOperations),
      }),
      fetch(`${APALEO_API_URL}/finance/v1/folios/${folioId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(folioPatchOperations),
      }),
    ]);

    if (!updateReservationResponse.ok) {
      const error = await updateReservationResponse.text();
      console.error('Failed to update reservation address:', error);
      return NextResponse.json(
        { error: 'Failed to update reservation address', details: error },
        { status: updateReservationResponse.status }
      );
    }

    if (!updateFolioResponse.ok) {
      const error = await updateFolioResponse.text();
      console.error('Failed to update folio debitor:', error);
    }

    return NextResponse.json(
      { success: true, message: 'Address updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update address error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
