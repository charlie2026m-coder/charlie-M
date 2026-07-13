'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useBookingStore } from '@/store/useBookingStore';
import { trackPaymentFailed, whenGtagReady } from '@/lib/analytics';

export default function PaymentDeclined({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('payment');

  // GA4: payment declined — a lost sale. Can render after a 3DS redirect
  // (fresh load), so wait for gtag.
  useEffect(() => whenGtagReady(() => trackPaymentFailed({
    reason: 'declined',
    value: useBookingStore.getState().booking?.totalAmount,
    roomName: useBookingStore.getState().roomDetails?.name,
  })), []);

  return (
    <div className="col-span-1 xl:col-span-2 flex flex-col h-full">
      <div className="bg-white p-8 h-full flex items-center justify-center">
        <div className="flex flex-col items-center justify-center max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold mb-2">{t('paymentDeclinedTitle')}</h2>
          <p className="text-gray-600 mb-6">{t('paymentDeclinedMessage')}</p>
          <button
            onClick={onRetry}
            className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}
