import { NextResponse } from 'next/server';
import { bookReservationServices } from '@/services/bookReservationServices';
import { Fetch } from '@/services/Request';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId, services, transactionReference } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId is required' },
        { status: 400 }
      );
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      return NextResponse.json(
        { error: 'services array is required' },
        { status: 400 }
      );
    }

    if (!transactionReference) {
      return NextResponse.json(
        { error: 'transactionReference is required for payment' },
        { status: 400 }
      );
    }

    // Format services for Apaleo API
    const formattedServices = services.map((service: any) => {
      if (service.count !== undefined) {
        return {
          serviceId: service.serviceId,
          count: service.count
        };
      } else if (service.dates) {
        return {
          serviceId: service.serviceId,
          dates: service.dates.map((dateItem: any) => ({
            serviceDate: dateItem.serviceDate,
            count: dateItem.count
          }))
        };
      }
      return {
        serviceId: service.serviceId
      };
    });


    // Book services and pay folio
    const result = await bookReservationServices(
      reservationId,
      formattedServices,
      transactionReference
    );

    // Check if any services failed
    const failedServices = result.services.filter((r: any) => !r.success);
    if (failedServices.length > 0) {
      console.error(`❌ Failed to add ${failedServices.length} service(s):`, failedServices);
      return NextResponse.json(
        {
          error: 'Failed to add some services',
          details: { failedServices },
          message: 'Some services could not be added'
        },
        { status: 500 }
      );
    }

    // Check if payment failed
    if (result.payment && !result.payment.success) {
      console.error('❌ Payment failed:', result.payment);
      return NextResponse.json(
        {
          error: 'Failed to process payment',
          details: {
            paymentError: 'error' in result.payment ? result.payment.error : 'Unknown error'
          },
          message: 'Services added but payment failed'
        },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully added ${formattedServices.length} service(s) to reservation ${reservationId}`);
    if (result.payment && 'amount' in result.payment) {
      console.log(`✅ Payment processed: €${result.payment.amount}`);
    }

    return NextResponse.json({
      success: true,
      reservationId: reservationId,
      servicesAdded: formattedServices.length,
      services: result.services,
      payment: result.payment
    });
  } catch (error) {
    console.error('Add services error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add services' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');
    const serviceId = searchParams.get('serviceId');

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId is required' },
        { status: 400 }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }

    await Fetch(`/booking/v1/reservations/${reservationId}/services?serviceId=${serviceId}`, {
      method: 'DELETE'
    });

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete service' },
      { status: 500 }
    );
  }
}
