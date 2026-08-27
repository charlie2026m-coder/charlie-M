'use client'

/**
 * One-click "open my booking" landing — target of the Guestway post-pre-check-in
 * redirect: rs107.../r/{{confirmation}}.
 *
 * Flow: ensure an anonymous Supabase session -> POST /api/reservations/open to
 * link the reservation by id (no last name, by product decision) -> drop the
 * guest straight onto their reservation, where the extras live. A full-page
 * navigation is used so the freshly-set session cookie reaches the /profile
 * middleware gate.
 *
 * Lives OUTSIDE app/[locale] (locale-free, like /checkout/[token]); middleware
 * skips it. On any failure it falls back to the normal id+last-name login.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ensureGuestSession } from '@/lib/guestSession'

export default function OpenReservationPage() {
  const params = useParams<{ id: string }>()
  const rawId = params?.id
  const id = Array.isArray(rawId) ? rawId[0] : (rawId ?? '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        if (!id) {
          if (!cancelled) setFailed(true)
          return
        }
        // Reuse the guest's session if one exists; otherwise create an anonymous
        // one (same pattern as the add-by-reservation login).
        if (!(await ensureGuestSession()).ok) {
          if (!cancelled) setFailed(true)
          return
        }

        const res = await fetch('/api/reservations/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: id }),
        })
        if (!res.ok) {
          if (!cancelled) setFailed(true)
          return
        }

        // Land directly on the reservation (extras + manage live here). Full
        // navigation so the session cookie is sent to the /profile gate.
        window.location.replace(`/profile/reservations/${encodeURIComponent(id)}`)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center bg-white">
      {!failed ? (
        <>
          <div className="size-10 rounded-full border-[3px] border-green/30 border-t-green animate-spin" />
          <p className="text-dark text-lg font-medium">Opening your booking…</p>
        </>
      ) : (
        <>
          <p className="text-dark text-lg font-semibold">We couldn’t open your booking automatically.</p>
          <p className="text-gray-500 text-sm max-w-sm">
            Please continue with your reservation ID and last name.
          </p>
          <a
            href={`/login?reservationId=${encodeURIComponent(id)}`}
            className="h-12 px-6 inline-flex items-center justify-center rounded-lg bg-green text-white font-medium hover:bg-green/90 transition"
          >
            Continue
          </a>
        </>
      )}
    </div>
  )
}
