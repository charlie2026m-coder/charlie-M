import { NextRequest, NextResponse } from "next/server";
import { checkout } from "@/lib/adyen";
import { adyenLog } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await checkout.PaymentsApi.paymentsDetails(body);

    adyenLog.info('payment-details response', { resultCode: response.resultCode, pspReference: response.pspReference });

    return NextResponse.json(response);
  } catch (error: any) {
    // Adyen SDK throws on Refused/Cancelled/Error resultCodes — that's a
    // normal outcome, not an exception. Extract the response body and return
    // it as 200 so Drop-in fires onPaymentFailed correctly.
    const adyenResponse = error?.responseBody
      ? JSON.parse(error.responseBody)
      : error?.response ?? null;

    if (adyenResponse?.resultCode) {
      adyenLog.warn('payment-details refused', {
        resultCode: adyenResponse.resultCode,
        refusalReason: adyenResponse.refusalReason,
      });
      return NextResponse.json(adyenResponse);
    }

    adyenLog.error('payment-details threw', { error: error?.message ?? String(error) });
    return NextResponse.json({ error: "Payment details failed" }, { status: 500 });
  }
}
