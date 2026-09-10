'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { AdyenCheckout, Dropin } from '@adyen/adyen-web/auto'
import '@adyen/adyen-web/styles/adyen.css'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { FiArrowLeft } from 'react-icons/fi'
import LoadingDots from '@/app/_components/ui/LoadingDots'
import { supabase } from '@/lib/supabase'

/**
 * Paying the difference on a date change.
 *
 * Deliberately NOT the extras payment page. That one is built around the
 * extras store — it refuses to render with an empty basket and persists its
 * own pending row — so teaching it a second errand would mean editing a page
 * guests pay through today. This duplicates the Drop-in wiring instead.
 *
 * Two things here are load-bearing and were wrong in the first version:
 *
 *   3-D Secure. make-payment asks for authentication on every card, and an
 *   issuer that uses a full-page redirect brings the guest back here with a
 *   `redirectResult`. That has to be handed to `submitDetails` — mounting a
 *   fresh card form instead leaves the authorization unfinished, so no webhook
 *   ever fires and the dates never move.
 *
 *   One reference per ATTEMPT. make-payment passes it to Adyen as the
 *   idempotency key, so re-using it after a refusal replays the refusal
 *   instead of charging the second card the guest just typed in.
 *
 * The page never decides the price: the claim returns it, and make-payment
 * re-derives it from Apaleo before the card is charged.
 */

type AdyenActions = { resolve: (result: unknown) => void; reject: () => void }
type AdyenSubmitState = {
  data: { paymentMethod: unknown; browserInfo?: unknown; checkoutAttemptId?: string }
}
type AdyenDetailsState = { data: unknown }
type AdyenResult = { resultCode?: string; pspReference?: string }

/** Adyen result codes that mean "not settled yet, but not a refusal either" —
 *  the webhook decides, so the guest must not be told it failed. */
const IN_FLIGHT = new Set(['Received', 'Pending', 'PresentToShopper'])

const RebookPaymentPage = () => {
  const t = useTranslations('reservations')
  const tPay = useTranslations('payment')
  const locale = useLocale()
  const params = useParams()
  const search = useSearchParams()
  const router = useRouter()
  const reservationId = params.id as string

  const from = search.get('from') ?? ''
  const to = search.get('to') ?? ''

  const dropinRef = useRef<HTMLDivElement>(null)
  const initialised = useRef(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [amountCents, setAmountCents] = useState<number | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const money = (cents: number) =>
    new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100)

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    const backToBooking = () => router.push(`/${locale}/profile/reservations/${reservationId}`)

    const init = async () => {
      try {
        const redirectResult = search.get('redirectResult')

        if (!from || !to) {
          setFailure(t('changeDates.refusal.dates-invalid'))
          setLoading(false)
          return
        }

        let cents: number
        if (redirectResult) {
          // Coming back from 3-D Secure. The row is already claimed and its
          // reference is fixed; re-claiming would only mint a second one. The
          // amount rides on the returnUrl purely to configure the Drop-in.
          cents = Number(search.get('amount'))
          if (!Number.isInteger(cents) || cents <= 0) {
            setFailure(t('changeDates.refusal.generic'))
            setLoading(false)
            return
          }
        } else {
          // Claim the move and let the server say what it costs. No reference
          // yet — that is minted per attempt in onSubmit.
          const claim = await fetch(
            `/api/reservations/${encodeURIComponent(reservationId)}/rebook/save-pending`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ from, to }),
            },
          )
          const claimBody = await claim.json().catch(() => ({}))
          if (!claim.ok) {
            const reason = claimBody?.reason ?? claimBody?.error
            setFailure(
              reason === 'already-rebooked'
                ? t('changeDates.refusal.already-rebooked')
                : reason && typeof reason === 'string' && reason.startsWith('top-up')
                  ? t('changeDates.refusal.generic')
                  : t('changeDates.refusal.generic'),
            )
            setLoading(false)
            return
          }
          cents = claimBody.amountCents
        }
        setAmountCents(cents)

        const methodsRes = await fetch('/api/payments/payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: cents }),
        })
        if (!methodsRes.ok) throw new Error('payment methods unavailable')
        const paymentMethodsResponse = await methodsRes.json()

        const configuration = {
          clientKey: process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY!,
          environment:
            process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT === 'live'
              ? ('live' as const)
              : ('test' as const),
          paymentMethodsResponse,
          locale: locale === 'de' ? 'de-DE' : 'en-US',
          countryCode: 'DE',
          amount: { value: cents, currency: 'EUR' },

          onSubmit: async (state: AdyenSubmitState, _: unknown, actions: AdyenActions) => {
            try {
              setProcessing(true)

              // A FRESH key for this attempt. make-payment forwards it to Adyen
              // as the idempotency key, so a key re-used after a refusal would
              // replay that refusal and never charge the new card.
              const reference = crypto.randomUUID()

              // Point the claimed row at this attempt before paying: the
              // webhook has only the reference to find it by.
              const claim = await fetch(
                `/api/reservations/${encodeURIComponent(reservationId)}/rebook/save-pending`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reference, from, to }),
                },
              )
              if (!claim.ok) {
                setProcessing(false)
                toast.error(t('changeDates.refusal.generic'), { duration: 6000 })
                actions.reject()
                return
              }

              const { data: { user } } = await supabase.auth.getUser()
              const booker = user
                ? {
                    email: user.email,
                    firstName: user.user_metadata?.first_name,
                    lastName: user.user_metadata?.last_name,
                  }
                : undefined

              const res = await fetch('/api/payments/make-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentMethod: state.data.paymentMethod,
                  amount: cents,
                  reference,
                  flow: 'rebook',
                  // Everything the page needs to rebuild itself after 3-D
                  // Secure. The reference is NOT re-claimed on return, it is
                  // already on the row; the amount is only for the Drop-in.
                  returnUrl:
                    `${window.location.origin}/${locale}/profile/reservations/${reservationId}` +
                    `/rebook-payment?reference=${reference}&amount=${cents}&from=${from}&to=${to}`,
                  origin: window.location.origin,
                  browserInfo: state.data.browserInfo,
                  checkoutAttemptId: state.data.checkoutAttemptId,
                  booker,
                  shopperReference: user?.id,
                }),
              })

              if (!res.ok) {
                // make-payment answers two conditions the guest can act on;
                // swallowing them left "payment failed" and an endless retry
                // of the same doomed amount.
                const body = await res.json().catch(() => ({}))
                setProcessing(false)
                if (body?.error === 'PriceChanged') {
                  toast.error(t('changeDates.priceChanged'), { duration: 9000 })
                } else if (body?.error === 'ValidationUnavailable') {
                  toast.error(t('changeDates.refusal.price-unreadable'), { duration: 8000 })
                } else {
                  toast.error(tPay('paymentFailed'))
                }
                actions.reject()
                return
              }
              actions.resolve(await res.json())
            } catch {
              setProcessing(false)
              actions.reject()
            }
          },

          onAdditionalDetails: async (
            state: AdyenDetailsState,
            _: unknown,
            actions: AdyenActions,
          ) => {
            try {
              const res = await fetch('/api/payments/payment-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.data),
              })
              if (!res.ok) {
                setProcessing(false)
                actions.reject()
                return
              }
              actions.resolve(await res.json())
            } catch {
              setProcessing(false)
              actions.reject()
            }
          },

          onPaymentCompleted: (result: AdyenResult) => {
            setProcessing(false)
            if (result?.resultCode === 'Authorised' || IN_FLIGHT.has(result?.resultCode ?? '')) {
              // The dates move on the webhook, not here — say so rather than
              // promising a change the guest might not see for a minute.
              toast.success(t('changeDates.paidPending'), { duration: 9000 })
              backToBooking()
              return
            }
            toast.error(tPay('paymentFailed'))
          },

          onPaymentFailed: () => {
            setProcessing(false)
            toast.error(tPay('paymentFailed'))
          },

          onError: () => {
            setProcessing(false)
            toast.error(tPay('paymentFailed'))
          },
        }

        const checkout = await AdyenCheckout(configuration)

        if (redirectResult) {
          // Finish the authentication instead of asking for the card again.
          checkout.submitDetails({ details: { redirectResult } })
          setProcessing(true)
          setLoading(false)
          return
        }

        const dropin = new Dropin(checkout, {
          openFirstPaymentMethod: false,
          openPaymentMethod: { type: 'scheme' },
          paymentMethodsConfiguration: {
            card: { hasHolderName: true, holderNameRequired: true },
          },
        })
        if (dropinRef.current) dropin.mount(dropinRef.current)
        setLoading(false)
      } catch (err) {
        setFailure(t('changeDates.refusal.generic'))
        setLoading(false)
        console.error('rebook payment init failed', err)
      }
    }

    init()
  }, [reservationId, from, to, locale, router, search, t, tPay])

  return (
    <div className='flex flex-col flex-1 p-3 lg:p-[30px]'>
      <button
        onClick={() => router.back()}
        className='mb-4 flex items-center gap-2 text-sm text-dark hover:text-dark/60'
      >
        <FiArrowLeft /> {t('changeDates.back')}
      </button>

      <h1 className='text-[20px] font-black text-green mb-1'>{t('changeDates.payTitle')}</h1>
      {from && to && (
        <p className='text-sm text-muted mb-4'>
          {t('changeDates.newStayShort', {
            from: from.split('-').reverse().join('.'),
            to: to.split('-').reverse().join('.'),
          })}
        </p>
      )}

      {amountCents != null && (
        <p className='mb-4 text-[18px] font-semibold text-dark'>
          {t('changeDates.payAmount', { amount: money(amountCents) })}
        </p>
      )}

      {failure && <p className='mb-4 text-sm font-medium text-cancelled'>{failure}</p>}
      {(loading || processing) && <LoadingDots />}

      <div ref={dropinRef} className='max-w-[520px]' />
    </div>
  )
}

export default RebookPaymentPage
