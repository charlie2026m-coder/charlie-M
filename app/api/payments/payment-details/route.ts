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
    const response = await checkout.PaymentsApi.paymentsDetails(body);

    console.log('📦 Payment details response:', JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Payment details error:", error);
    // Adyen SDK throws on Refused/Cancelled/Error resultCodes
    // Extract the response body and return as 200 so Drop-in fires onPaymentFailed correctly
    const adyenResponse = error?.responseBody
      ? JSON.parse(error.responseBody)
      : error?.response ?? null;

    if (adyenResponse?.resultCode) {
      return NextResponse.json(adyenResponse);
    }

    return NextResponse.json({ error: "Payment details failed" }, { status: 500 });
  }
}
