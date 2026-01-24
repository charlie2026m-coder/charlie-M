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
    const response = await checkout.PaymentsApi.paymentsDetails(body);

    console.log('📦 Payment details response:', JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Payment details error:", error);
    return NextResponse.json(
      { error: "Payment details failed", details: error.message },
      { status: 500 }
    );
  }
}
