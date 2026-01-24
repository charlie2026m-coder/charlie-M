import { NextRequest, NextResponse } from "next/server";
import { Client, CheckoutAPI, EnvironmentEnum } from "@adyen/api-library";

const client = new Client({
  apiKey: process.env.ADYEN_API_KEY!,
  environment: EnvironmentEnum.TEST,
});
const checkout = new CheckoutAPI(client);

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();

    const response = await checkout.PaymentsApi.paymentMethods({
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT!,
      amount: {
        currency: "EUR",
        value: amount,
      },
      countryCode: "DE",
      channel: "Web" as any,
      shopperLocale: "de-DE",
    });
    console.log('📦 Payment methods response:', JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Payment methods error:", error);
    return NextResponse.json(
      { error: "Failed to get payment methods", details: error.message },
      { status: 500 }
    );
  }
}


