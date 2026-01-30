import { Fetch } from '@/services/Request'

interface ServiceDate {
  serviceDate: string
  amount?: {
    amount: number
    currency: string
  }
}

interface BookServicePayload {
  serviceId: string
  count?: number
  dates?: ServiceDate[]
}

interface FolioResponse {
  id: string
  balance?: {
    amount: number
    currency: string
  }
  allowedPayment?: number
}

/**
 * Book a service for a specific reservation
 * @param reservationId - Apaleo reservation ID
 * @param service - Service to book
 */
export async function bookReservationService(
  reservationId: string,
  service: BookServicePayload
) {
  try {
    await Fetch(
      `/booking/v1/reservation-actions/${reservationId}/book-service`,
      {
        method: 'PUT',
        body: service,
      }
    )

    console.log(`✅ Service ${service.serviceId} booked for reservation ${reservationId}`)
    return { success: true }
  } catch (error) {
    console.error(`Failed to book service ${service.serviceId}:`, error)
    throw error
  }
}

/**
 * Pay folio for a reservation
 * @param reservationId - Apaleo reservation ID (also folio ID)
 * @param transactionReference - Payment transaction reference
 */
async function payReservationFolio(
  reservationId: string,
  transactionReference: string
) {
  try {
    const folioId = `${reservationId}-1`;
    // Get folio details
    const folio = await Fetch<FolioResponse>(`/finance/v1/folios/${folioId}`);
    
    const balance = folio.balance?.amount || 0;
    const allowedPayment = folio.allowedPayment || 0;
    
    console.log(`   💰 Folio ${reservationId}: Balance ${balance}, Allowed ${allowedPayment}`);
    
    // If no payment allowed or balance is positive (we owe them), skip payment
    if (allowedPayment <= 0 || balance >= 0) {
      console.log(`   ℹ️ No payment required for folio ${reservationId}`);
      return { success: true, skipped: true };
    }
    
    // Create payment by authorization
    await Fetch(
      `/finance/v1/folios/${folioId}/payments/by-authorization`,
      {
        method: 'POST',
        body: {
          transactionReference: transactionReference,
          referenceType: 'PspReference',
          amount: {
            amount: allowedPayment,
            currency: folio.balance?.currency || 'EUR'
          }
        }
      }
    );

    console.log(`   ✅ Folio ${folioId} paid: ${allowedPayment} ${folio.balance?.currency || 'EUR'}`);
    return { success: true, amount: allowedPayment };
  } catch (error) {
    console.error(`   ❌ Failed to pay folio ${reservationId}-1:`, error);
    throw error;
  }
}

/**
 * Book multiple services for a reservation and pay the folio
 * @param reservationId - Apaleo reservation ID
 * @param services - Array of services to book
 * @param transactionReference - Payment transaction reference (optional)
 */
export async function bookReservationServices(
  reservationId: string,
  services: BookServicePayload[],
  transactionReference?: string
) {
  const results = []
  
  // Step 1: Book all services
  console.log(`📦 Booking ${services.length} service(s) for reservation ${reservationId}`)
  for (const service of services) {
    try {
      await bookReservationService(reservationId, service)
      results.push({ serviceId: service.serviceId, success: true })
    } catch (error) {
      console.error(`Failed to book service ${service.serviceId}:`, error)
      results.push({ 
        serviceId: service.serviceId, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  // Step 2: Pay folio if transaction reference is provided
  if (transactionReference) {
    try {
      const paymentResult = await payReservationFolio(reservationId, transactionReference);
      return { 
        services: results, 
        payment: paymentResult 
      };
    } catch (error) {
      return { 
        services: results, 
        payment: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      };
    }
  }
  
  return { services: results, payment: null };
}
