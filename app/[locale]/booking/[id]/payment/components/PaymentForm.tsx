"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AdyenCheckout, Dropin } from "@adyen/adyen-web/auto";
import "@adyen/adyen-web/styles/adyen.css";
import { useBookingStore } from "@/store/useBookingStore";
import { toast } from "sonner";


export default function PaymentForm({ amount }: {amount: number}) {
  const dropinRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const urlParams = useParams();
  const isInitialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const booking = useBookingStore(state => state.booking);
  const setTransactionReference = useBookingStore(state => state.setTransactionReference);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const init = async () => {
      try {
        const amountInCents = amount * 100;

        const paymentMethodsRes = await fetch("/api/payments/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({  amount: amountInCents }),
        });

        if (!paymentMethodsRes.ok)  throw new Error("Failed to get payment methods");

        const paymentMethodsResponse = await paymentMethodsRes.json();

        const configuration = {
          clientKey: process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY!,
          environment: "test" as const,
          paymentMethodsResponse: paymentMethodsResponse,
          locale: 'en-US',
          countryCode: 'DE',
          amount: {
            value: amountInCents,
            currency: "EUR",
          },

          onSubmit: async (state: any, _: any, actions: any) => {
            try {
              const reference = crypto.randomUUID();
              
              const response = await fetch("/api/payments/make-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentMethod: state.data.paymentMethod,
                  amount: amountInCents,
                  reference: reference,
                  returnUrl: `${window.location.origin}/${urlParams.locale}/booking/${urlParams.id}/payment`,
                  browserInfo: state.data.browserInfo,
                  checkoutAttemptId: state.data.checkoutAttemptId,
                }),
              });

              if (!response.ok) {
                actions.reject();
                return;
              }

              const result = await response.json();
              if (result.pspReference) setTransactionReference(result.pspReference);
              actions.resolve(result);
            } catch (error) {
              console.error("onSubmit error:", error);
              actions.reject();
            }
          },

          onAdditionalDetails: async (state: any, component: any, actions: any) => {
            try {
              const response = await fetch("/api/payments/payment-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(state.data),
              });

              if (!response.ok) {
                actions.reject();
                return;
              }

              const result = await response.json();
              actions.resolve(result);
            } catch (error) {
              actions.reject();
            }
          },

          onPaymentCompleted: async () => {
            const transactionRef = useBookingStore.getState().transactionReference;
            if (!transactionRef || !booking?.reservations) return;

            setCreatingBooking(true);
            toast.loading("Creating booking...", { id: "create-booking" });

            const newBooking = {
              ...booking,
              transactionReference: transactionRef
            }

            try {
              const response = await fetch("/api/bookings/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newBooking),
              });

              if (!response.ok) throw new Error("Failed");

              const bookingData = await response.json();
              toast.success("Booking created!", { id: "create-booking" });
              const successUrl = `/${urlParams.locale}/booking/${urlParams.id}/success?bookingId=${bookingData.id}`;
              router.push(successUrl);
            } catch (error) {
              toast.error("Booking failed", { id: "create-booking" });
              setCreatingBooking(false);
            }
          },

          onPaymentFailed: (result: any) => {
            toast.error("Payment failed");
          },

          onError: (error: any) => {
            toast.error("Payment error");
          },
        };

        const checkout = await AdyenCheckout(configuration);

        const dropin = new Dropin(checkout, {
          openFirstPaymentMethod: false,
          openPaymentMethod: {
            type: "scheme",
          },
          paymentMethodsConfiguration: {
            card: {
              hasHolderName: true,
              holderNameRequired: true,
            },
          },
        });

        if (dropinRef.current) dropin.mount(dropinRef.current);

        setLoading(false);
      } catch (error) {
        console.error("Error initializing payment:", error);
        alert("Failed to initialize payment. Please try again.");
        setLoading(false);
      }
    };

    init();
  }, [amount, router, urlParams]);

  if (creatingBooking) {
    return (
      <div className="col-span-1 xl:col-span-2 flex flex-col">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue mb-4"></div>
            <h2 className="text-[22px] font-bold mb-2">Creating Booking...</h2>
            <p className="text-gray-600">Please wait while we process your reservation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-1 xl:col-span-2 flex flex-col">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-[22px] font-bold mb-4">Complete Payment</h2>
        <p className="text-gray-600 mb-6">Secure payment powered by Adyen</p>
        {loading && <p className="text-center">Loading payment methods...</p>}
        <div ref={dropinRef} className="adyen-dropin-container" />
      </div>
    </div>
  );
}


//  4111 1111 1111 1111
//  03/30
//  737
