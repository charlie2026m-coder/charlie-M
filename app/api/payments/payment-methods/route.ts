import { NextRequest, NextResponse } from "next/server";
import { checkout } from "@/lib/adyen";
import { adyenLog } from "@/lib/logger";

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
    adyenLog.error('payment-methods threw', { error: error?.message ?? String(error) });
    return NextResponse.json(
      { error: "Failed to get payment methods", details: error.message },
      { status: 500 }
    );
  }
}


