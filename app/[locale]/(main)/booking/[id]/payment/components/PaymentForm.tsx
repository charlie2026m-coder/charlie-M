"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AdyenCheckout, Dropin } from "@adyen/adyen-web/auto";
import "@adyen/adyen-web/styles/adyen.css";
import { useBookingStore } from "@/store/useBookingStore";
import { toast } from "sonner";
import LoadingDots from "@/app/_components/ui/LoadingDots";
import { FiArrowLeft } from "react-icons/fi";
import { useTranslations } from "next-intl";
import BookingError from "./BookingError";


export default function PaymentForm({ amount }: {amount: number}) {
  const t = useTranslations('payment')
  const dropinRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const urlParams = useParams();
  const isInitialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingError, setBookingError] = useState(false);
  const booking = useBookingStore(state => state.booking);
  const setTransactionReference = useBookingStore(state => state.setTransactionReference);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const init = async () => {
      try {
        const amountInCents = Math.round(amount * 100);

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
            toast.loading(t('creatingBooking'), { id: "create-booking" });

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

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Booking creation failed:', {
                  status: response.status,
                  errorData
                });
                
                let errorMessage = "Failed to create booking";
                
                // Extract error message from various possible formats
                if (errorData.details) {
                  // Check for Apaleo validation errors (422)
                  if (errorData.details.messages && Array.isArray(errorData.details.messages) && errorData.details.messages.length > 0) {
                    errorMessage = errorData.details.messages[0];
                  } 
                  // Check for Apaleo error title/detail
                  else if (errorData.details.title) {
                    errorMessage = errorData.details.title;
                    if (errorData.details.detail) {
                      errorMessage += `: ${errorData.details.detail}`;
                    }
                  }
                  // Check for nested error message
                  else if (errorData.details.message) {
                    errorMessage = errorData.details.message;
                  }
                  // Fallback to stringified details
                  else if (typeof errorData.details === 'string') {
                    errorMessage = errorData.details;
                  }
                }
                // Fallback to top-level error
                else if (errorData.error) {
                  errorMessage = errorData.error;
                }
                
                // Check if it's a server error (retry was already done on backend)
                if (response.status >= 500) {
                  toast.dismiss("create-booking");
                  setBookingError(true);
                  setCreatingBooking(false);
                  return;
                }
                
                // Client errors (400, 401, 403, 409, 422, etc.)
                if (errorMessage.includes("fully booked") || errorMessage.includes("service")) {
                  toast.error(t('servicesUnavailable'), { id: "create-booking", duration: 6000 });
                } else {
                  toast.error(errorMessage, { id: "create-booking", duration: 6000 });
                }
                
                setCreatingBooking(false);
                return;
              }

              // Success!
              const bookingData = await response.json();
              
              // Save Apaleo booking ID and reservation IDs to store
              if (bookingData.id) {
                useBookingStore.getState().setApaleoBookingId(bookingData.id);
              }
              if (bookingData.reservationIds && Array.isArray(bookingData.reservationIds)) {
                useBookingStore.getState().setReservationIds(bookingData.reservationIds);
              }
              
              // Check if there were issues with services
              if (bookingData.partialSuccess && bookingData.issues) {
                // Booking created, but some services failed
                toast.dismiss("create-booking");
                toast.warning(t('bookingCreatedWithIssues'), { duration: 8000 });
                
                // Redirect to success page with warning flag
                const successUrl = `/${urlParams.locale}/booking/${urlParams.id}/success?bookingId=${bookingData.id}&servicesWarning=true`;
                router.push(successUrl);
              } else {
                // Full success
                toast.success(t('bookingCreated'), { id: "create-booking" });
                const successUrl = `/${urlParams.locale}/booking/${urlParams.id}/success?bookingId=${bookingData.id}`;
                router.push(successUrl);
              }
              
            } catch (error) {
              console.error('Booking creation failed:', error);
              toast.dismiss("create-booking");
              setBookingError(true);
              setCreatingBooking(false);
            }
          },

          onPaymentFailed: (result: any) => {
            toast.error(t('paymentFailed'));
          },

          onError: (error: any) => {
            toast.error(t('paymentError'));
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
        toast.error(t('paymentInitFailed'));
        setLoading(false);
      }
    };

    init();
  }, [amount, router, urlParams]);

  if (bookingError) return <BookingError /> 
  if (creatingBooking) {
    return (
      <div className="col-span-1 xl:col-span-2 flex flex-col h-full min-h-[60vh]">
        <div className="bg-white p-8 h-full flex items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-[22px] font-bold mb-2">{t('creatingBooking')}</h2>
            <p className="text-gray-600 mb-4">{t('pleaseWait')}</p>
            <LoadingDots />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5 col-span-1 xl:col-span-2'>
    <button onClick={() => router.back()} className="flex items-center gap-3 hover:text-blue transition-colors">
      <FiArrowLeft className='size-5' />
      {t('backToBookingDetails')}
    </button>
    <div className=" flex flex-col">
      <div className="bg-white rounded-2xl border p-8">
        <h2 className="text-[22px] font-bold mb-4">{t('completePayment')}</h2>
        <p className="text-gray-600 mb-6">{t('securePayment')}</p>
        {loading && <p className="text-center">{t('loadingPaymentMethods')}</p>}
        <div ref={dropinRef} className="adyen-dropin-container" />
      </div>
    </div>
    </div>
  );
}


//  4111 1111 1111 1111
//  03/30
//  737
