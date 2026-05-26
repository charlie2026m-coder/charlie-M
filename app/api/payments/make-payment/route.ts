import { NextRequest, NextResponse } from "next/server";
import { checkout } from "@/lib/adyen";
import { adyenLog } from "@/lib/logger";
import { validatePaymentAmount } from "@/lib/payments-validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentMethod, amount, currency, reference, returnUrl, browserInfo, checkoutAttemptId, origin, booker, shopperReference, arrivals } = body;

    // Earliest arrival across all reservations — required by Adyen for
    // chargeback-exposure scoring on multi-reservation prepaid bookings.
    const deliveryDateStr: string | undefined = Array.isArray(arrivals) && arrivals.length > 0
      ? arrivals.map((a: string) => a.slice(0, 10)).sort()[0]
      : undefined
    const deliveryDate: Date | undefined = deliveryDateStr ? new Date(deliveryDateStr) : undefined

    // Server-side strict amount validation closes the gap where stale Zustand
    // state could send a different amount than what Apaleo will bill.
    let validation: Awaited<ReturnType<typeof validatePaymentAmount>>
    try {
      validation = await validatePaymentAmount(reference, amount)
    } catch (err: any) {
      adyenLog.error('validation threw unexpected error', {
        reference,
        error: err?.message ?? String(err),
      })
      validation = { status: 'unavailable', reason: 'validation threw' }
    }

    adyenLog.info('payment validation outcome', {
      reference,
      status: validation.status,
      ...(validation.status === 'mismatch' && {
        clientCents: validation.clientCents,
        expectedCents: validation.expectedCents,
        diffCents: validation.clientCents - validation.expectedCents,
      }),
      ...(validation.status === 'unavailable' && { reason: validation.reason }),
      ...(validation.status === 'skipped' && { reason: validation.reason }),
    })

    if (validation.status === 'mismatch') {
      return NextResponse.json(
        {
          error: 'PriceChanged',
          message: 'The price has changed since you last loaded the page. Please refresh and try again.',
          clientCents: validation.clientCents,
          expectedCents: validation.expectedCents,
        },
        { status: 400 },
      )
    }

    if (validation.status === 'unavailable') {
      return NextResponse.json(
        {
          error: 'ValidationUnavailable',
          message: 'Price verification service is temporarily unavailable. Please try again in a moment.',
          reason: validation.reason,
        },
        { status: 503 },
      )
    }

    const shopperIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || undefined;

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
      channel: "Web" as any,

      ...(booker?.email && { shopperEmail: booker.email }),
      ...(booker?.firstName && {
        shopperName: {
          firstName: booker.firstName,
          lastName: booker.lastName || '',
        },
      }),
      ...(booker?.phone && { telephoneNumber: booker.phone }),
      shopperReference: shopperReference || reference,

      ...(shopperIP && { shopperIP }),
      ...(booker?.address && {
        billingAddress: {
          street: booker.address.addressLine1,
          houseNumberOrName: booker.address.addressLine2 || '',
          city: booker.address.city,
          postalCode: booker.address.postalCode,
          country: booker.address.countryCode,
          ...(booker.address.regionCode && { stateOrProvince: booker.address.regionCode }),
        },
      }),
      countryCode: booker?.address?.countryCode || 'DE',

      authenticationData: {
        attemptAuthentication: "always",
      },

      ...(origin && { origin }),
      ...(browserInfo && { browserInfo }),
      ...(checkoutAttemptId && { checkoutAttemptId }),
      ...(deliveryDate && { deliveryDate }),

      // BlockNHold + PreAuth unlock Adyen's multi-capture lifecycle so Apaleo
      // Pay can settle each reservation folio independently.
      additionalData: {
        "metadata.flowType": "BlockNHold",
        "metadata.accountId": process.env.APALEO_ACCOUNT_ID!,
        "metadata.propertyId": process.env.APALEO_PROPERTY_ID!,
        "subMerchantID": process.env.ADYEN_SUB_MERCHANT_ID!,
        "authorisationType": "PreAuth",
      }
    };

    adyenLog.info('make-payment → Adyen', {
      reference: paymentRequest.reference,
      amount: paymentRequest.amount,
      paymentMethodType: paymentRequest.paymentMethod?.type,
      paymentMethodBrand: (paymentRequest.paymentMethod as any)?.brand,
    })

    const response = await checkout.PaymentsApi.payments(paymentRequest);

    if (response.action) {
      adyenLog.info('Adyen 3DS required', { reference, actionType: response.action.type })
    } else {
      adyenLog.success('Adyen response', { reference, resultCode: response.resultCode, pspReference: response.pspReference })
    }

    return NextResponse.json(response);
  } catch (error: any) {
    // Adyen SDK throws on Refused/Cancelled/Error — return its body as 200 so
    // Drop-in can render the refusal reason on the client.
    const adyenResponse = error?.responseBody
      ? JSON.parse(error.responseBody)
      : error?.response ?? null;

    if (adyenResponse?.resultCode) {
      adyenLog.warn('payment refused', {
        resultCode: adyenResponse.resultCode,
        refusalReason: adyenResponse.refusalReason,
      });
      return NextResponse.json(adyenResponse);
    }

    adyenLog.error('payment threw', { error: error?.message ?? String(error) });
    return NextResponse.json(
      { error: "Payment failed", details: error.message },
      { status: 500 }
    );
  }
}
