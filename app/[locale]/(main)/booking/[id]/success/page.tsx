'use client'
import Image from "next/image";
import { useBookingStore } from "@/store/useBookingStore";
import { Button } from "@/app/_components/ui/button";
import { useRouter } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import Steps from "../components/Steps";
import { MdCheckCircle } from "react-icons/md";
import SummaryCard from "../components/SummaryCard";
import { useTranslations } from 'next-intl';

const SuccessPage = () => {
  const t = useTranslations('success')
  const booking = useBookingStore(state => state.booking)
  const router = useRouter()
  const searchParams = useSearchParams()
  const servicesWarning = searchParams.get('servicesWarning') === 'true'
  
  return (
    <>
      <Steps currentStep={3} />
      <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px]'>
        <div className='col-span-1 xl:col-span-2 flex flex-col py-10'>
          <div className='w-full flex gap-3 py-2.5  items-center justify-center text-green-600 bg-green-600/10 rounded-full mb-6'>
            <MdCheckCircle className='size-5' />
            <h2 className='text-[18px] font-bold text-center'>{t('bookingConfirmed')}</h2>
          </div>
          
          
          <p className='text-dark text-center mb-5'>{t('confirmationSent')} <strong>{booking?.booker?.email}</strong></p>
          {servicesWarning && (
            <div className='w-full flex flex-col gap-2 p-4  border  rounded-xl mb-6'>
              <div className='flex items-center gap-2 text-orange-400'>
                <svg className="size-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className='font-semibold'>{t('servicesWarningTitle')}</h3>
              </div>
              <p className='text-sm text-gray-700'>{t('servicesWarningMessage')}</p>
              <div className='text-sm text-center'>
                <span className='text-gray-600'>{t('contactSupport')} </span>
                <a 
                  href="mailto:support24@charlie-m.de" 
                  className=" font-semibold hover:underline text-dark"
                >
                  support24@charlie-m.de
                </a>
              </div>
            </div>
          )}
          <Image 
            src='/images/booking-completed.svg' 
            alt='success' 
            width={375}
            height={344}

            className='w-[375px] h-[344px] mx-auto object-cover mb-4'
          />
          <Button className='mx-auto' onClick={() => router.push('/')}>{t('backToMainPage')}</Button>
        </div>
        <SummaryCard />

      </div>
    </>
  )
}

export default SuccessPage
