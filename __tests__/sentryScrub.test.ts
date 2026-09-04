import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/nextjs'
import { beforeSend, isPersonalField, scrubDeep, scrubText } from '@/lib/sentryScrub'

/**
 * What may leave the process on an error report.
 *
 * Two failure modes, both real. Sending a guest's address to a third-party
 * error tracker is the one people think of. The other is redacting so eagerly
 * that the issue no longer says which booking broke — an error nobody can act
 * on costs the same as no error at all.
 */

describe('scrubbing free text', () => {
  it('removes an address wherever it sits in the sentence', () => {
    expect(scrubText('folio payment failed for guest@example.com')).toBe(
      'folio payment failed for [email]',
    )
  })

  it('removes card- and phone-length digit runs', () => {
    expect(scrubText('card 4111111111111111 declined')).toBe('card [number] declined')
    expect(scrubText('called 4930826871450')).toBe('called [number]')
  })

  it('keeps the identifiers an on-call reader actually needs', () => {
    // Reservation code, psp reference, cent amount, rate plan.
    const line = 'ZCELHAPN-1 psp NC6HT9CWHM9J4Q65 refund 34571 on FLEX_WEB4'
    expect(scrubText(line)).toBe(line)
  })

  it('leaves a stay total alone', () => {
    // 999999 cents is 9.999,99 EUR — the threshold sits above any real stay.
    expect(scrubText('captured 999999')).toBe('captured 999999')
  })
})

describe('deciding a field name is personal', () => {
  it('catches the guest fields', () => {
    for (const key of [
      'email',
      'guestEmail',
      'phone',
      'phone_number',
      'billingAddress',
      'street',
      'postalCode',
      'ip',
      'firstName',
      'last_name',
      'guestName',
      'name',
    ]) {
      expect(isPersonalField(key), key).toBe(true)
    }
  })

  it('does not fire on words that merely CONTAIN one', () => {
    // The reason the check is word-based rather than a substring test: every
    // one of these is load-bearing on an error about a booking, and a
    // substring rule redacts the lot ("tel" in hotel, "ip" in skipped,
    // "mail" in mailgun, "pan" in expanded).
    for (const key of [
      'hotelId',
      'skipped',
      'mailgunStatus',
      'expandedCharges',
      'unitName',
      'ratePlanName',
      'serviceName',
      'fileName',
      'merchantAccount',
      'cityTaxCents',
      'panelState',
    ]) {
      expect(isPersonalField(key), key).toBe(false)
    }
  })
})

describe('scrubbing a context object', () => {
  it('drops personal fields and keeps the rest', () => {
    expect(
      scrubDeep({
        reservationId: 'ZCELHAPN-1',
        guestEmail: 'guest@example.com',
        firstName: 'Alex',
        amountCents: 34571,
        unitName: 'Studio 402',
      }),
    ).toEqual({
      reservationId: 'ZCELHAPN-1',
      guestEmail: '[redacted]',
      firstName: '[redacted]',
      amountCents: 34571,
      unitName: 'Studio 402',
    })
  })

  it('reaches into nested objects and arrays', () => {
    expect(
      scrubDeep({ folio: { payments: [{ psp: 'ABC123', note: 'sent to a@b.de' }] } }),
    ).toEqual({ folio: { payments: [{ psp: 'ABC123', note: 'sent to [email]' }] } })
  })

  it('stops descending instead of hanging on a cycle', () => {
    const cyclic: Record<string, unknown> = { level: 1 }
    cyclic.self = cyclic
    expect(() => scrubDeep(cyclic)).not.toThrow()
  })
})

describe('the last gate before an event leaves', () => {
  const eventWith = (over: Partial<ErrorEvent>): ErrorEvent => ({ ...over }) as ErrorEvent

  it('strips everything the SDK attached about the request', () => {
    const out = beforeSend(
      eventWith({
        request: {
          url: 'https://www.charlie-m.de/en/profile/reservations/ZCELHAPN-1?token=abc',
          cookies: { sb_access_token: 'x' },
          headers: { authorization: 'Bearer x' },
          data: { email: 'guest@example.com' },
          query_string: 'token=abc',
        },
        user: { email: 'guest@example.com', ip_address: '1.2.3.4' },
      }),
    )
    expect(out?.request?.cookies).toBeUndefined()
    expect(out?.request?.headers).toBeUndefined()
    expect(out?.request?.data).toBeUndefined()
    expect(out?.request?.query_string).toBeUndefined()
    expect(out?.user).toBeUndefined()
    // The path survives — it says which booking, and that is the point.
    expect(out?.request?.url).toBe(
      'https://www.charlie-m.de/en/profile/reservations/ZCELHAPN-1',
    )
  })

  it('scrubs the message, the exception value and the breadcrumbs', () => {
    const out = beforeSend(
      eventWith({
        message: 'refund failed for guest@example.com',
        exception: { values: [{ value: 'no folio for guest@example.com' }] },
        breadcrumbs: [{ message: 'looked up guest@example.com', data: { phone: '+49151' } }],
      }),
    )
    expect(out?.message).toBe('refund failed for [email]')
    expect(out?.exception?.values?.[0].value).toBe('no folio for [email]')
    expect(out?.breadcrumbs?.[0].message).toBe('looked up [email]')
    expect(out?.breadcrumbs?.[0].data?.phone).toBe('[redacted]')
  })

  it('passes an event that carries nothing personal through untouched', () => {
    const out = beforeSend(
      eventWith({ message: 'rebook: amend failed — nothing moved, lock released' }),
    )
    expect(out?.message).toBe('rebook: amend failed — nothing moved, lock released')
  })
})
