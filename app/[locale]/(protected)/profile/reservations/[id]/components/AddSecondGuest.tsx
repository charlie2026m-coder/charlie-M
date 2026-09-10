'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/app/_components/ui/button'
import { BsFillPersonFill } from 'react-icons/bs'
import { FiPlus, FiCheck } from 'react-icons/fi'
import { useAddExtrasStore } from '@/store/useAddExtras'
import { SECOND_GUEST_SERVICE_ID } from '@/lib/extrasPrice'

/**
 * "Travelling with someone?" — adds a second guest to the reservation.
 *
 * Selecting it drops a SECOND_GUEST line into the same extras basket as every
 * other add-on, so it is paid with the normal Pay button downstream. It does
 * NOT charge anything by itself: the surcharge rides that one Adyen
 * authorization, and the reservation is only repriced for two once the payment
 * has been captured.
 *
 * The card renders only when the server says the stay can take a second person
 * — Apaleo returns no two-adult offer for a single-occupancy studio, so those
 * never show it. The price shown is the live delta from that offer (0 on some
 * rate plans); the server re-reads it at payment time and never trusts this one.
 */

interface Quote {
  eligible: boolean
  reason?: string
  surcharge: number
  currency: string
  currentTotal: number
  newTotal: number
}

const AddSecondGuest = ({ adults }: { adults?: number }) => {
  const t = useTranslations('secondGuest')
  const locale = useLocale()
  const params = useParams()
  const reservationId = params.id as string

  const services = useAddExtrasStore(state => state.services)
  const addService = useAddExtrasStore(state => state.addService)
  const removeService = useAddExtrasStore(state => state.removeService)
  const selected = services.some(s => s.serviceId === SECOND_GUEST_SERVICE_ID)

  // Already two → nothing to ask the server about.
  const enabled = (adults ?? 1) < 2

  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ['second-guest-quote', reservationId],
    queryFn: async () => {
      const res = await fetch(`/api/reservations/${reservationId}/second-guest`)
      if (!res.ok) throw new Error(String(res.status))
      return res.json()
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  if (!enabled || isLoading || !quote?.eligible) return null

  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)

  const toggle = () => {
    if (selected) {
      removeService(SECOND_GUEST_SERVICE_ID)
      return
    }
    // `price` is display-only; the server recomputes the charge from the live
    // Apaleo offer, so a tampered value here changes nothing.
    addService({ serviceId: SECOND_GUEST_SERVICE_ID, count: 1, price: quote.surcharge })
  }

  return (
    <div className={`mb-5 rounded-2xl border p-4 md:p-5 transition-colors ${selected ? 'border-green bg-green/5' : ''}`}>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 font-semibold text-dark'>
            <BsFillPersonFill className='size-4 shrink-0 text-green' />
            {t('title')}
          </div>
          <p className='mt-1 text-sm text-muted'>
            {quote.surcharge > 0
              ? t('subtitlePaid', { amount: money(quote.surcharge, quote.currency) })
              : t('subtitleFree')}
          </p>
        </div>

        <Button
          onClick={toggle}
          variant={selected ? 'outline' : 'default'}
          className='h-[46px] shrink-0'
        >
          {selected ? <FiCheck className='size-4' /> : <FiPlus className='size-4' />}
          {selected ? t('added') : t('cta')}
        </Button>
      </div>

      {/* Once picked, say plainly what happens next: the amount joins the order
          below and is only taken when the guest pays there. */}
      {selected && (
        <p className='mt-3 border-t pt-3 text-sm text-muted'>
          {quote.surcharge > 0
            ? t('inBasket', {
                amount: money(quote.surcharge, quote.currency),
                newTotal: money(quote.newTotal, quote.currency),
              })
            : t('inBasketFree')}
        </p>
      )}
    </div>
  )
}

export default AddSecondGuest
