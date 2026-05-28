'use client'
import { useParams, useSearchParams } from 'next/navigation'
import PaymentForm from './components/PaymentForm'
import ServicesTable from './components/ServicesTable'
import { useAddExtrasStore } from '@/store/useAddExtras'
import PaymentBanner from '@/app/_components/ui/PaymentBanner'
import { useTranslations } from 'next-intl'
import { computeServicesTotalCents, isCleaningService } from '@/lib/extrasPrice'

const PaymentPage = () => {
  const t = useTranslations('payment')
  const params = useParams()
  const searchParams = useSearchParams()
  const reservationId = params.id as string
  const selectedServices = useAddExtrasStore(state => state.services)
  const nights = useAddExtrasStore(state => state.nights)
  const availableExtras = useAddExtrasStore(state => state.availableExtras)

  // If returning from 3DS redirect, always show PaymentForm so the
  // submitDetails flow can complete even when the store is empty.
  const isReturningFrom3DS = !!searchParams.get('redirectResult')

  if (selectedServices.length === 0 && !isReturningFrom3DS) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold mb-2'>{t('noServicesSelected')}</h2>
          <p className='text-gray-600'>{t('pleaseGoBackAndSelect')}</p>
        </div>
      </div>
    )
  }

  // Defensive filter: a stale store may carry serviceIds that are no longer
  // in availableExtras (catalog refetched, service retired). Drop them so
  // computeServicesTotalCents doesn't throw UnknownServiceError on the UI side.
  const knownServices = selectedServices.filter(s =>
    availableExtras.some(e => e.id === s.serviceId),
  )
  const existingCleaningDates = new Set(
    knownServices
      .filter(s =>
        isCleaningService(
          s.serviceId,
          availableExtras.find(e => e.id === s.serviceId)?.name,
        ),
      )
      .flatMap(s =>
        s.dates?.filter(d => d.isExisting === true).map(d => d.serviceDate) ?? [],
      ),
  )
  const { totalCents } = computeServicesTotalCents(
    knownServices,
    availableExtras,
    { nights },
    existingCleaningDates,
  )
  const totalAmount = totalCents / 100

  return (
    <div className='flex flex-col flex-1 p-3 lg:p-[30px]'>
      <PaymentBanner />
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-10 pb-[30px] pt-16`}>
        <div className='lg:col-span-2'>
          <PaymentForm
            amount={totalAmount}
            reservationId={reservationId}
          />
        </div>
        <div className='lg:col-span-1'>
          <ServicesTable />
        </div>
      </div>
    </div>
  )
}

export default PaymentPage