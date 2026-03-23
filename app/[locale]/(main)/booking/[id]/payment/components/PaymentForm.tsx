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
import PaymentDeclined from "./PaymentDeclined";

export default function PaymentForm({ amount }: { amount: number }) {
  const t = useTranslations('payment');
  const dropinRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const urlParams = useParams();
  const isInitialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingError, setBookingError] = useState(false);
  const [roomUnavailable, setRoomUnavailable] = useState(false);
  const [paymentDeclined, setPaymentDeclined] = useState(false);
  const setTransactionReference = useBookingStore(state => state.setTransactionReference);
  const setPaymentReference = useBookingStore(state => state.setPaymentReference);

  useEffect(() => {
    if (isInitialized.current) return;
    if (!amount) return; // wait for Zustand to hydrate from localStorage
    isInitialized.current = true;

    const init = async () => {
      try {
        const amountInCents = Math.round(amount * 100);

        const paymentMethodsRes = await fetch("/api/payments/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInCents }),
        });

        if (!paymentMethodsRes.ok) throw new Error("Failed to get payment methods");

        const paymentMethodsResponse = await paymentMethodsRes.json();

        const configuration = {
          clientKey: process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY!,
          environment: (process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT === 'live' ? 'live' : 'test') as const,
          paymentMethodsResponse,
          locale: 'en-US',
          countryCode: 'DE',
          amount: { value: amountInCents, currency: "EUR" },

          onSubmit: async (state: any, _: any, actions: any) => {
            try {
              const reference = crypto.randomUUID();
              setPaymentReference(reference);

              // Save booking payload before sending to Adyen
              // If tab closes after payment, webhook uses this to recreate the booking
              await fetch("/api/bookings/save-pending", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  reference,
                  booking: useBookingStore.getState().booking,
                }),
              });

              const response = await fetch("/api/payments/make-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentMethod: state.data.paymentMethod,
                  amount: amountInCents,
                  reference,
                  returnUrl: `${window.location.origin}/${urlParams.locale}/booking/${urlParams.id}/payment/checkout?reference=${reference}`,
                  browserInfo: state.data.browserInfo,
                  checkoutAttemptId: state.data.checkoutAttemptId,
                }),
              });

              if (!response.ok) { actions.reject(); return; }

              const result = await response.json();
              if (result.pspReference) setTransactionReference(result.pspReference);
              actions.resolve(result);
            } catch (error) {
              console.error("onSubmit error:", error);
              actions.reject();
            }
          },

          onAdditionalDetails: async (state: any, _: any, actions: any) => {
            try {
              const response = await fetch("/api/payments/payment-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(state.data),
              });

              if (!response.ok) { actions.reject(); return; }

              const result = await response.json();
              // Save pspReference — critical for 3DS redirect flows where it wasn't available in onSubmit
              if (result.pspReference) setTransactionReference(result.pspReference);
              actions.resolve(result);
            } catch {
              actions.reject();
            }
          },

          onPaymentCompleted: async () => {
            const transactionRef = useBookingStore.getState().transactionReference;
            const currentBooking = useBookingStore.getState().booking;
            
            if (!transactionRef || !currentBooking?.reservations) {
              console.error('⚠️ Payment completed but booking data missing:', { transactionRef, hasBooking: !!currentBooking });
              toast.error(t('bookingDataMissing') || 'Booking data is missing. Please try again.');
              setBookingError(true);
              return;
            }

            setCreatingBooking(true);
            toast.loading(t('creatingBooking'), { id: "create-booking" });

            try {
              const response = await fetch("/api/bookings/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...currentBooking, transactionReference: transactionRef }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const apaleoMessage: string = errorData.details?.messages?.[0] || errorData.details?.title || errorData.error || '';

                toast.dismiss("create-booking");

                if (apaleoMessage.toLowerCase().includes('fully booked') || apaleoMessage.toLowerCase().includes('not available')) {
                  setRoomUnavailable(true);
                } else {
                  setBookingError(true);
                }

                setCreatingBooking(false);
                return;
              }

              const bookingData = await response.json();

              if (bookingData.id) useBookingStore.getState().setApaleoBookingId(bookingData.id);
              if (bookingData.reservationIds) useBookingStore.getState().setReservationIds(bookingData.reservationIds);

              toast.dismiss("create-booking");

              const successUrl = `/${urlParams.locale}/booking/${urlParams.id}/success?bookingId=${bookingData.id}${bookingData.partialSuccess ? '&servicesWarning=true' : ''}`;
              router.push(successUrl);
            } catch (error) {
              console.error('Booking creation failed:', error);
              toast.dismiss("create-booking");
              setBookingError(true);
              setCreatingBooking(false);
            }
          },

          onPaymentFailed: () => {
            setPaymentDeclined(true);
          },

          onError: () => {
            setPaymentDeclined(true);
          },
        };

        const checkout = await AdyenCheckout(configuration);

        const redirectResult = new URLSearchParams(window.location.search).get('redirectResult');

        if (redirectResult) {
          // Returning from 3DS bank redirect — complete the payment
          checkout.submitDetails({ details: { redirectResult } });
          setLoading(false);
        } else {
          // Normal flow — mount Drop-in
          const dropin = new Dropin(checkout, {
            openFirstPaymentMethod: false,
            openPaymentMethod: { type: "scheme" },
            paymentMethodsConfiguration: {
              card: { hasHolderName: true, holderNameRequired: true },
            },
          });

          if (dropinRef.current) dropin.mount(dropinRef.current);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing payment:", error);
        toast.error(t('paymentInitFailed'));
        setLoading(false);
      }
    };

    init();
  }, [amount, router, urlParams]);

  if (roomUnavailable) return <BookingError roomUnavailable />;
  if (bookingError) return <BookingError />;
  if (paymentDeclined) return (
    <PaymentDeclined onRetry={() => {
      setPaymentDeclined(false);
      isInitialized.current = false;
      window.location.replace(window.location.pathname);
    }} />
  );
  if (creatingBooking) return (
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

  return (
    <div className='flex flex-col gap-5 col-span-1 xl:col-span-2'>
      <button onClick={() => router.back()} className="flex items-center gap-3 hover:text-blue transition-colors">
        <FiArrowLeft className='size-5' />
        {t('backToBookingDetails')}
      </button>
      <div className="flex flex-col">
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
