import { NextResponse } from 'next/server';
import { bookReservationServices } from '@/services/bookReservationServices';
import { Fetch } from '@/services/Request';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { reversePayment } from '@/app/actions/adyen/reversePayment';

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

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // IDEMPOTENCY LOCK — Check if already processed
    const lockKey = `${transactionReference}-${reservationId}`;
    
    const { data: existingService } = await supabase
      .from('pending_services')
      .select('status, apaleo_charge_id')
      .eq('lock_key', lockKey)
      .single();

    if (existingService?.status === 'completed') {
      console.log('⚠️ Services already added for this payment');
      return NextResponse.json(
        { 
          success: true, 
          alreadyProcessed: true,
          message: 'Services already added'
        },
        { status: 200 }
      );
    }

    if (existingService?.status === 'processing') {
      console.log('⚠️ Another request is processing these services');
      return NextResponse.json(
        { message: 'Services are being processed' },
        { status: 409 }
      );
    }

    // Insert lock record
    const { error: lockError } = await supabase.from('pending_services').insert({
      lock_key: lockKey,
      transaction_reference: transactionReference,
      reservation_id: reservationId,
      service_ids: services.map((s: any) => s.serviceId),
      user_id: user?.id || null,
      status: 'processing',
    });

    if (lockError?.code === '23505') {
      console.log('⚠️ Lock already exists — another request processing');
      return NextResponse.json(
        { message: 'Services are being processed by another request' },
        { status: 409 }
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

    let result;
    let servicesBooked = false;
    let bookedServiceIds: string[] = [];

    try {
      // Book services and pay folio
      result = await bookReservationServices(
        reservationId,
        formattedServices,
        transactionReference
      );

      // Track which services were successfully booked
      bookedServiceIds = result.services
        .filter((r: any) => r.success)
        .map((r: any) => r.serviceId);
      
      servicesBooked = bookedServiceIds.length > 0;

      // Check if any services failed
      const failedServices = result.services.filter((r: any) => !r.success);
      if (failedServices.length > 0) {
        console.error(`❌ Failed to add ${failedServices.length} service(s):`, failedServices);
        
        // Rollback successfully booked services
        if (bookedServiceIds.length > 0) {
          console.log(`🔄 Rolling back ${bookedServiceIds.length} successfully booked service(s)...`);
          for (const serviceId of bookedServiceIds) {
            try {
              await Fetch(`/booking/v1/reservations/${reservationId}/services?serviceId=${serviceId}`, {
                method: 'DELETE'
              });
              console.log(`   ✅ Rolled back service ${serviceId}`);
            } catch (rollbackError) {
              console.error(`   ❌ Failed to rollback service ${serviceId}:`, rollbackError);
            }
          }
        }
        
        // Mark as failed
        await supabase.from('pending_services')
          .update({ 
            status: 'failed',
            error_details: JSON.stringify({ failedServices })
          })
          .eq('lock_key', lockKey);

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
        
        const paymentError = 'error' in result.payment ? result.payment.error : 'Unknown error';
        
        // CRITICAL: Rollback services since payment failed
        console.log(`🔄 Payment failed — rolling back ${bookedServiceIds.length} service(s)...`);
        let rollbackSuccess = true;
        
        for (const serviceId of bookedServiceIds) {
          try {
            await Fetch(`/booking/v1/reservations/${reservationId}/services?serviceId=${serviceId}`, {
              method: 'DELETE'
            });
            console.log(`   ✅ Rolled back service ${serviceId}`);
          } catch (rollbackError) {
            rollbackSuccess = false;
            console.error(`   ❌ CRITICAL: Failed to rollback service ${serviceId}:`, rollbackError);
          }
        }
        
        if (!rollbackSuccess) {
          // Some services couldn't be rolled back — manual intervention needed
          await supabase.from('pending_services')
            .update({ 
              status: 'partial_success',
              error_details: JSON.stringify({
                type: 'payment_failure_rollback_failed',
                error: paymentError,
                servicesBooked: bookedServiceIds,
                rollbackFailed: true
              })
            })
            .eq('lock_key', lockKey);

          console.error('🚨 ALERT: Services booked but payment failed AND rollback failed');
          console.error('🚨 Transaction Reference:', transactionReference);
          console.error('🚨 Reservation ID:', reservationId);
          console.error('🚨 Services:', bookedServiceIds);
          console.error('🚨 MANUAL ACTION REQUIRED: Delete services and refund payment');
        } else {
          // Rollback successful — just mark as failed
          await supabase.from('pending_services')
            .update({ 
              status: 'failed',
              error_details: JSON.stringify({
                type: 'payment_failure',
                error: paymentError,
                servicesRolledBack: true
              })
            })
            .eq('lock_key', lockKey);
        }

        return NextResponse.json(
          {
            error: 'Failed to process payment',
            details: { paymentError },
            message: 'Payment failed. Services have been cancelled.'
          },
          { status: 500 }
        );
      }

      // Success — mark as completed
      await supabase.from('pending_services')
        .update({ 
          status: 'completed',
          apaleo_charge_id: result.payment && 'amount' in result.payment ? String(result.payment.amount) : null
        })
        .eq('lock_key', lockKey);

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
      console.error('❌ Service booking error:', error);
      
      // If services were booked but error occurred — try to rollback
      if (bookedServiceIds.length > 0) {
        console.log(`🔄 Exception occurred — rolling back ${bookedServiceIds.length} service(s)...`);
        for (const serviceId of bookedServiceIds) {
          try {
            await Fetch(`/booking/v1/reservations/${reservationId}/services?serviceId=${serviceId}`, {
              method: 'DELETE'
            });
            console.log(`   ✅ Rolled back service ${serviceId}`);
          } catch (rollbackError) {
            console.error(`   ❌ Failed to rollback service ${serviceId}:`, rollbackError);
          }
        }
      }
      
      await supabase.from('pending_services')
        .update({ 
          status: 'failed',
          error_details: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            servicesBooked: bookedServiceIds.length > 0,
            rollbackAttempted: true
          })
        })
        .eq('lock_key', lockKey);

      throw error;
    }

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
