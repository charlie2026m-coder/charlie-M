"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AdyenCheckout, Dropin } from "@adyen/adyen-web/auto";
import "@adyen/adyen-web/styles/adyen.css";
import { useAddExtrasStore } from "@/store/useAddExtras";
import { toast } from "sonner";
import LoadingDots from "@/app/_components/ui/LoadingDots";
import { FiArrowLeft } from "react-icons/fi";
import { useTranslations } from 'next-intl';


export default function PaymentForm({ 
  amount,
  reservationId 
}: {
  amount: number;
  reservationId: string;
}) {
  const t = useTranslations('payment');
  const dropinRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const urlParams = useParams();
  const isInitialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const selectedServices = useAddExtrasStore(state => state.services);
  const clearServices = useAddExtrasStore(state => state.clearServices);
  const setTransactionReference = useAddExtrasStore(state => state.setTransactionReference);
  // Merchant-side UUID minted in onSubmit. Shared with /api/services and the
  // Adyen webhook so both compete for the same pending_services row instead
  // of writing two rows under different lock_keys. Survives 3DS via the
  // `reference` query param on returnUrl.
  const referenceRef = useRef<string | null>(null);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const init = async () => {
      try {
        const amountInCents = Math.round(amount * 100);

        // Recover the merchant UUID after a 3DS bank redirect — onSubmit
        // (where it is generated) does not run again on return, but
        // returnUrl carries it as `?reference=...`.
        const referenceFromUrl = new URLSearchParams(window.location.search).get('reference');
        if (referenceFromUrl) referenceRef.current = referenceFromUrl;

        const paymentMethodsRes = await fetch("/api/payments/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInCents }),
        });

        if (!paymentMethodsRes.ok) throw new Error("Failed to get payment methods");

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
              referenceRef.current = reference;

              // Save pending services before payment (webhook fallback)
              try {
                await fetch("/api/services/save-pending", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reference,
                    reservationId,
                    services: selectedServices
                  }),
                });
                console.log('✅ Pending services saved for reference:', reference);
              } catch (error) {
                console.error('⚠️ Failed to save pending services:', error);
                // Don't block payment
              }
              
              const response = await fetch("/api/payments/make-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentMethod: state.data.paymentMethod,
                  amount: amountInCents,
                  reference: reference,
                  flow: 'services',
                  returnUrl: `${window.location.origin}/${urlParams.locale}/profile/reservations/${reservationId}/payment?reference=${reference}`,
                  browserInfo: state.data.browserInfo,
                  checkoutAttemptId: state.data.checkoutAttemptId,
                }),
              });

              if (!response.ok) {
                actions.reject();
                return;
              }

              const result = await response.json();
              
              // Save transaction reference to store
              if (result.pspReference) {
                console.log('💾 Saving pspReference to store:', result.pspReference);
                setTransactionReference(result.pspReference);
              }
              
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
              console.error("onAdditionalDetails error:", error);
              actions.reject();
            }
          },

          onPaymentCompleted: async (result: any) => {
            console.log('💳 Payment completed, result:', result);
            
            // Get transaction reference from store (saved in onSubmit)
            const transactionRef = useAddExtrasStore.getState().transactionReference;
            console.log('📝 Transaction reference from store:', transactionRef);
            console.log('📦 Selected services:', selectedServices);
            
            if (!transactionRef || selectedServices.length === 0) {
              console.error('❌ Missing transaction reference or services:', {
                transactionRef,
                servicesCount: selectedServices.length
              });
              toast.error(t('paymentCompletedMissing'));
              return;
            }

            setProcessing(true);
            toast.loading(t('addingServicesToReservation'), { id: "add-services" });

            // The merchant UUID is what binds /api/services to the same
            // pending_services row that the webhook will look up. Missing
            // here means save-pending never ran (e.g. silent failure) and
            // any /api/services call would 400; let the webhook handle the
            // refund via no-pending → notFound + no-op, instead of double-
            // writing.
            const merchantReference = referenceRef.current;
            if (!merchantReference) {
              console.error('❌ Missing merchant reference — refusing /api/services call', {
                transactionRef,
                hasReferenceInUrl: !!new URLSearchParams(window.location.search).get('reference'),
              });
              toast.error(t('failedToAddServices'), { id: 'add-services' });
              setProcessing(false);
              return;
            }

            try {
              const requestBody = {
                reservationId: reservationId,
                services: selectedServices,
                transactionReference: transactionRef,
                reference: merchantReference,
                amountCents: amountInCents,
              };

              console.log('🚀 Sending request to /api/services:', requestBody);
              
              const response = await fetch(`/api/services`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
              });

              console.log('📬 Response status:', response.status);
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Error response:', errorData);
                
                const errorMessage = errorData.details?.messages?.[0] || errorData.error || "Failed to add services";
                
                if (errorMessage.includes("fully booked") || errorMessage.includes("service")) {
                  toast.error(t('servicesUnavailable'), { id: "add-services", duration: 6000 });
                } else {
                  toast.error(errorMessage, { id: "add-services", duration: 6000 });
                }
                
                setProcessing(false);
                return;
              }

              const data = await response.json();
              console.log('✅ Services added successfully:', data);
              
              toast.success(t('servicesAddedSuccessfully'), { id: "add-services" });
              clearServices();
              
              const successUrl = `/${urlParams.locale}/profile/reservations/${reservationId}`;
              console.log('🔄 Redirecting to:', successUrl);
              router.push(successUrl);
            } catch (error) {
              console.error('Add services failed:', error);
              toast.error(t('failedToAddServices'), { id: "add-services" });
              setProcessing(false);
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
  }, [amount, router, urlParams, reservationId, selectedServices, clearServices, setTransactionReference]);

  if (processing) {
    return (
      <div className="flex flex-col h-full min-h-[60vh]">
        <div className="bg-white rounded-2xl border p-8 h-full flex items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-[22px] font-bold mb-2">{t('processing')}</h2>
            <p className="text-gray-600 mb-4">{t('pleaseWaitAddingServices')}</p>
            <LoadingDots />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-3 hover:text-blue transition-colors"
      >
        <FiArrowLeft className='size-5' />
        {t('backToReservationDetails')}
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
