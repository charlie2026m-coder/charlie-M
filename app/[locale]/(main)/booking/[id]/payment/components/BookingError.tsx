'use client'
import { useEffect } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { trackPaymentFailed, whenGtagReady } from "@/lib/analytics";

export default function BookingError({ roomUnavailable = false }: { roomUnavailable?: boolean }) {
  const t = useTranslations('payment')
  const router = useRouter()

  // GA4: booking failed at the final step — a lost sale. Can render
  // post-redirect, so wait for gtag.
  useEffect(() => whenGtagReady(() => trackPaymentFailed({
    reason: roomUnavailable ? 'room_unavailable' : 'server_error',
  })), [roomUnavailable])

  return (
    <div className="col-span-1 xl:col-span-2 flex flex-col h-full ">
    <div className="bg-white p-8 h-full flex items-center justify-center">
      <div className="flex flex-col items-center justify-center max-w-md text-center">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold">{t('serverError')}</h2>
        </div>
        <p className="text-gray-600 mb-4">{t('serverErrorMessage')}</p>
        
        <div className="bg-white border p-4 rounded-lg mb-6 w-full">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-700 text-left">{t('refundMessage')}</p>
          </div>
        </div>
        <div className="flex flex-col ">
          <p className="text-sm text-gray-600 mb-2 gap-2">{t('contactSupport')}</p>
          <a 
            href="mailto:support24@charlie-m.de" 
            className=" font-semibold hover:underline text-base"
          >
            support24@charlie-m.de
          </a>
        </div>
        <button
          onClick={() => roomUnavailable ? router.push('/rooms') : router.back()}
          className="flex items-center gap-2 text-blue hover:underline mt-10"
        >
          <FiArrowLeft className="size-5" />
          {roomUnavailable ? t('browseRooms') : t('backToBookingDetails')}
        </button>
      </div>
    </div>
  </div>
  )
}