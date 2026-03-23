import { Client, CheckoutAPI, EnvironmentEnum } from '@adyen/api-library';

const isLive = process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT === 'live';

const client = new Client({
  apiKey: process.env.ADYEN_API_KEY!,
  environment: isLive ? EnvironmentEnum.LIVE : EnvironmentEnum.TEST,
  ...(isLive && process.env.ADYEN_LIVE_URL_PREFIX && {
    liveEndpointUrlPrefix: process.env.ADYEN_LIVE_URL_PREFIX,
  }),
});

const checkout = new CheckoutAPI(client);

// Uses Reversal (refundOrCancelPayment) — not a manual Refund.
// Adyen decides automatically: cancel if not yet captured, refund if already captured.
export async function reversePayment(
  pspReference: string,
  internalReference?: string
): Promise<{ success: boolean }> {
  console.log(`🔄 [REVERSAL] initiating | psp: ${pspReference}`);

  try {
    const response = await checkout.ModificationsApi.refundOrCancelPayment(pspReference, {
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT!,
      ...(internalReference && { reference: internalReference }),
    });

    console.log(`✅ [REVERSAL] accepted by Adyen | psp: ${pspReference} | status: ${response.status}`);
    console.log(`ℹ️  [REVERSAL] async — result arrives via webhook (CANCEL or REFUND event)`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ [REVERSAL] FAILED | psp: ${pspReference} | error: ${message}`);
    console.error(`🚨 [REVERSAL] MANUAL ACTION REQUIRED — payment charged but booking not created | psp: ${pspReference}`);
    return { success: false };
  }
}
