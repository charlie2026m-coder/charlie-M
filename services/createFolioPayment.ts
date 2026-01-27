import { Fetch } from './Request';

export async function createFolioPayment(
  bookingId: string,
  amount: number,
  transactionReference: string
) {
  try {
    if (!bookingId) throw new Error('Booking ID is required');
    if (!amount || amount <= 0) throw new Error('Valid amount is required');
    if (!transactionReference) throw new Error('Transaction reference is required');

    const reservationId = `${bookingId}-1-1`;
    // Get folio details
    const folio = await Fetch<any>(`/finance/v1/folios/${reservationId}`);
    if (!folio.allowedPayment || folio.allowedPayment <= 0) throw new Error('No payment allowed for this folio');

    // Create payment by authorization
    const paymentResponse = await Fetch(
      `/finance/v1/folios/${reservationId}/payments/by-authorization`,
      {
        method: 'POST',
        body: {
          transactionReference: transactionReference,
          referenceType: 'PspReference',
          amount: {
            amount: folio.allowedPayment,
            currency: folio.balance.currency || 'EUR'
          }
        }
      }
    );

    return {
      success: true,
      payment: paymentResponse,
      message: 'Payment attached to folio successfully'
    };

  } catch (error: any) {
    console.error('Folio payment error:', error.message);
    throw error;
  }
}
