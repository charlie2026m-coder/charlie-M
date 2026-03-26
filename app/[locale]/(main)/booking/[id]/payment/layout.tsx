'use client'

import { usePathname } from 'next/navigation'
import Steps from '@/app/[locale]/(main)/booking/[id]/components/Steps'
import SummaryCard from '@/app/[locale]/(main)/booking/[id]/components/SummaryCard'
import PaymentBanner from '@/app/_components/ui/PaymentBanner'

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isCheckout = pathname.includes('/payment/checkout')
  const isSuccess = pathname.includes('/payment/success')

  return (
    <>
      <Steps currentStep={isSuccess ? 3 : 2} />
      {isCheckout && <PaymentBanner />}
      <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px] ${isCheckout ? 'pt-16' : ''}`}>
        {children}
        <SummaryCard />
      </div>
    </>
  )
}
