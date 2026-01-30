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
    console.log('Folio details - Balance:', folio.balance?.amount, 'Allowed payment:', folio.allowedPayment);
    
    // Check if payment is needed
    const balance = folio.balance?.amount || 0;
    const allowedPayment = folio.allowedPayment || 0;
    
    // If no payment allowed or balance is positive (we owe them), skip payment
    if (allowedPayment <= 0 || balance >= 0) {
      console.log(`No payment required - Balance: ${balance}, Allowed: ${allowedPayment}`);
      return {
        success: true,
        payment: null,
        message: `No payment required - folio balance is ${balance}`
      };
    }
    
    const paymentAmount = allowedPayment;

    // Create payment by authorization
    const paymentResponse = await Fetch(
      `/finance/v1/folios/${reservationId}/payments/by-authorization`,
      {
        method: 'POST',
        body: {
          transactionReference: transactionReference,
          referenceType: 'PspReference',
          amount: {
            amount: paymentAmount,
            currency: folio.balance?.currency || 'EUR'
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
