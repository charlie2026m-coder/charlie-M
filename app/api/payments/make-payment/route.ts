import { NextRequest, NextResponse } from "next/server";
import { Client, CheckoutAPI, EnvironmentEnum } from "@adyen/api-library";

const isLive = process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT === 'live';
const client = new Client({
  apiKey: process.env.ADYEN_API_KEY!,
  environment: isLive ? EnvironmentEnum.LIVE : EnvironmentEnum.TEST,
  ...(isLive && process.env.ADYEN_LIVE_URL_PREFIX && {
    liveEndpointUrlPrefix: process.env.ADYEN_LIVE_URL_PREFIX,
  }),
});
const checkout = new CheckoutAPI(client);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentMethod, amount, currency, reference, returnUrl, browserInfo, checkoutAttemptId } = body;

    // Validate required reference
    if (!reference) {
      console.error('❌ Payment reference is missing');
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    const paymentRequest = {
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT!,
      amount: {
        currency: currency || "EUR",
        value: amount,
      },
      reference,
      paymentMethod: paymentMethod,
      returnUrl: returnUrl,
      shopperInteraction: "Ecommerce" as any,
      recurringProcessingModel: "UnscheduledCardOnFile" as any,
      storePaymentMethod: false,
      channel: "Web" as any,
      
      // Additional data
      ...(browserInfo && { browserInfo }),
      ...(checkoutAttemptId && { checkoutAttemptId }),
      
      // Metadata
      additionalData: {
        "metadata.flowType": "CaptureOnly",
        "metadata.accountId": process.env.APALEO_ACCOUNT_ID!,
        "metadata.propertyId": process.env.APALEO_PROPERTY_ID!,
        "subMerchantID": process.env.ADYEN_SUB_MERCHANT_ID!
      }
    };

    const response = await checkout.PaymentsApi.payments(paymentRequest);
    console.log('📦 Payment response:', JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Payment error:", error);
    // Adyen SDK throws on Refused/Cancelled/Error resultCodes
    // Extract the response body and return as 200 so Drop-in fires onPaymentFailed correctly
    const adyenResponse = error?.responseBody
      ? JSON.parse(error.responseBody)
      : error?.response ?? null;

    if (adyenResponse?.resultCode) {
      return NextResponse.json(adyenResponse);
    }

    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
