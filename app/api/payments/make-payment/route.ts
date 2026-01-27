import { NextRequest, NextResponse } from "next/server";
import { Client, CheckoutAPI, EnvironmentEnum } from "@adyen/api-library";

const client = new Client({
  apiKey: process.env.ADYEN_API_KEY!,
  environment: EnvironmentEnum.TEST,
});
const checkout = new CheckoutAPI(client);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentMethod, amount, currency, reference, returnUrl, browserInfo, checkoutAttemptId } = body;

    const paymentRequest = {
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT!,
      amount: {
        currency: currency || "EUR",
        value: amount,
      },
      reference: reference || crypto.randomUUID(),
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
    return NextResponse.json(
      { error: "Payment failed", details: error.message },
      { status: 500 }
    );
  }
}
