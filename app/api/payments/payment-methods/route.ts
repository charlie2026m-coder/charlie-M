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

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Payment methods error:", error);
    return NextResponse.json(
      { error: "Failed to get payment methods", details: error.message },
      { status: 500 }
    );
  }
}


