import { NextResponse } from 'next/server';
import { getOrRefreshToken } from '@/services/Request';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import { bookerAddressSchema } from '@/types/schemas';
import { bookingLog } from '@/lib/logger';

const APALEO_API_URL = 'https://api.apaleo.com';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;
    const body = await request.json();

    // Ownership: only a user who owns this reservation (email match or an
    // explicit reservations link) may overwrite its guest identity / invoice
    // debitor. Closes the unauthenticated write-IDOR.
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ownership = await verifyReservationOwnership(supabase, user, reservationId);
    if (!ownership.ok) {
      bookingLog.error('booker-address: access denied', {
        reservationId,
        status: ownership.status,
      });
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    // Validate the guest payload before anything is sent to Apaleo — this
    // route writes both the reservation primaryGuest and the folio debitor.
    const parsed = bookerAddressSchema.safeParse(body?.updatedGuestData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid guest data', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const updatedGuestData = parsed.data;

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
      // Log the upstream detail server-side; return a generic message so raw
      // Apaleo error text isn't disclosed to the client.
      const detail = await updateReservationResponse.text();
      bookingLog.error('booker-address: reservation update failed', {
        reservationId,
        status: updateReservationResponse.status,
        detail,
      });
      return NextResponse.json(
        { error: 'Failed to update reservation address' },
        { status: 502 }
      );
    }

    if (!updateFolioResponse.ok) {
      const detail = await updateFolioResponse.text();
      bookingLog.error('booker-address: folio debitor update failed', {
        reservationId,
        status: updateFolioResponse.status,
        detail,
      });
    }

    return NextResponse.json(
      { success: true, message: 'Address updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    bookingLog.error('booker-address: unhandled exception', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
