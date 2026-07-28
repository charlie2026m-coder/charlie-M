import { bookingLog } from '@/lib/logger'

// Guestway Open API. Base already includes /api/open/v1 (see GUESTWAY_API_URL).
// Auth = partnership X-Api-Key + a Bearer access token. This flow needs both
// "Conversations - Read" (to find the conversation for a reservation) and
// "Messages - Send" (to post the message); GUESTWAY_MESSAGE_API_KEY carries
// both. The general GUESTWAY_ACCESS_TOKEN lacks the conversations scope.
const API_URL = process.env.GUESTWAY_API_URL?.replace(/\/+$/, '')
const PARTNERSHIP_API_KEY = process.env.GUESTWAY_API_KEY
const MESSAGE_TOKEN = process.env.GUESTWAY_MESSAGE_API_KEY

// This runs on the post-payment-capture path of the booking webhook (best-effort
// courtesy message). Bound every network call so a hung/black-holed Guestway
// socket can never stall the webhook ack — a timeout surfaces as a thrown
// AbortError that the try/catch converts to {success:false}.
const REQUEST_TIMEOUT_MS = 5000

export type GuestwayMedium =
  | 'sms'
  | 'email'
  | 'whatsapp'
  | 'channel_chat'
  | 'guest_app'

const COPY = {
  late: {
    en: {
      title: 'Late check-out confirmed',
      body: 'Your late check-out is confirmed — you can stay in your room until 13:00 on your departure day. Enjoy the extra time!',
      detail: 'Check-out by 13:00 on your departure day',
    },
    de: {
      title: 'Late Check-out bestätigt',
      body: 'Ihr Late Check-out ist bestätigt — Sie können am Abreisetag bis 13:00 Uhr in Ihrem Zimmer bleiben. Viel Freude mit der zusätzlichen Zeit!',
      detail: 'Check-out bis 13:00 Uhr am Abreisetag',
    },
  },
  early: {
    en: {
      title: 'Early check-in confirmed',
      body: 'Your early check-in is confirmed — your room will be ready from 13:00 on your arrival day. See you soon!',
      detail: 'Room ready from 13:00 on your arrival day',
    },
    de: {
      title: 'Early Check-in bestätigt',
      body: 'Ihr Early Check-in ist bestätigt — Ihr Zimmer steht am Anreisetag ab 13:00 Uhr bereit. Bis bald!',
      detail: 'Zimmer ab 13:00 Uhr am Anreisetag bereit',
    },
  },
} as const

/**
 * Guest-facing confirmation for an applied Late Check-Out / Early Check-In.
 * PLAIN TEXT on purpose (bilingual EN + DE): the message is delivered through
 * whatever channel the guest booked on. Direct guests get a real email, but OTA
 * guests (Booking.com / Airbnb) receive it in their channel message thread,
 * where HTML is stripped and an HTML body renders as a garbled, duplicated wall
 * with broken umlauts. Clean text reads correctly everywhere. Both extensions
 * move the time to 13:00.
 */
export function buildStayExtensionMessage(kind: 'late' | 'early'): string {
  const c = COPY[kind]
  const rule = '——————————'
  return [
    c.en.title,
    '',
    'Dear guest,',
    '',
    c.en.body,
    '',
    `• ${c.en.detail}`,
    '',
    'We look forward to hosting you.',
    'Charlie M Team',
    '',
    rule,
    '',
    c.de.title,
    '',
    'Hallo,',
    '',
    c.de.body,
    '',
    `• ${c.de.detail}`,
    '',
    'Wir freuen uns auf Sie.',
    'Charlie M Team',
    '',
    rule,
    '',
    'Friedrichstraße 33, 10969 Berlin · www.charlie-m.de',
  ].join('\n')
}

interface ConversationsResponse {
  data?: Array<{ id: string }>
}

function headers(bearer: string) {
  return {
    'X-Api-Key': PARTNERSHIP_API_KEY as string,
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Find the guest conversation for an Apaleo reservation. Apaleo's reservationId
 * is Guestway's `reservations.confirmationCode` (same mapping our accesses lookup
 * uses). Returns null when there's no conversation yet.
 */
async function findConversationId(reservationId: string): Promise<string | null> {
  const filters = [{ field: 'reservations.confirmationCode', operator: 'eq', value: reservationId }]
  const url = `${API_URL}/conversations?filters=${encodeURIComponent(JSON.stringify(filters))}`
  const res = await fetch(url, { headers: headers(MESSAGE_TOKEN as string), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!res.ok) {
    bookingLog.warn('guestway: conversation lookup failed', {
      reservationId,
      status: res.status,
    })
    return null
  }
  const json = (await res.json()) as ConversationsResponse
  return json.data?.[0]?.id ?? null
}

/**
 * Send a guest a message via Guestway (POST /conversations/{id}/messages).
 *
 * Non-throwing and best-effort: a failed send NEVER breaks the caller (the
 * LCO/ECI is already applied and paid — a missed message must not roll that
 * back). Returns the outcome so the caller can log it.
 */
export async function sendGuestwayMessage(params: {
  reservationId: string
  body: string
  medium?: GuestwayMedium
}): Promise<{ success: boolean; error?: string }> {
  if (!API_URL || !PARTNERSHIP_API_KEY || !MESSAGE_TOKEN) {
    return { success: false, error: 'guestway messaging not configured' }
  }
  try {
    const conversationId = await findConversationId(params.reservationId)
    if (!conversationId) {
      bookingLog.warn('guestway: no conversation for reservation — message skipped', {
        reservationId: params.reservationId,
      })
      return { success: false, error: 'no conversation found' }
    }

    // Default to email so every LCO/ECI buyer gets the confirmation by email
    // regardless of booking channel (proactive WhatsApp would need a dedicated
    // approved template). Guestway rejects fallback flags that don't match the
    // medium (invalid_fallback_combination), so only attach the one that applies
    // when a caller explicitly overrides the medium.
    const medium = params.medium ?? 'email'
    const fallback: { doFallbackChannelToEmail?: boolean; doFallbackWhatsAppToSms?: boolean } = {}
    if (medium === 'channel_chat') fallback.doFallbackChannelToEmail = true // OTA chat → email
    if (medium === 'whatsapp') fallback.doFallbackWhatsAppToSms = true // WhatsApp → SMS

    const res = await fetch(`${API_URL}/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      headers: headers(MESSAGE_TOKEN),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Note: no `reservationId` in the body. That field expects Guestway's
      // INTERNAL reservation id (conv.reservationIds), not our Apaleo code, and
      // passing the code yields reservation_not_linked_to_conversation. The path
      // conversationId already targets the right guest, so it's safe to omit.
      body: JSON.stringify({
        medium,
        body: params.body,
        ...fallback,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      bookingLog.error('guestway: send message failed', {
        reservationId: params.reservationId,
        conversationId,
        status: res.status,
        detail: detail.slice(0, 300),
      })
      return { success: false, error: `${res.status} ${detail.slice(0, 200)}` }
    }

    bookingLog.success('guestway: message sent', { reservationId: params.reservationId, conversationId })
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    bookingLog.error('guestway: send message threw', { reservationId: params.reservationId, error: message })
    return { success: false, error: message }
  }
}

/**
 * Deferred, polling LCO/ECI confirmation for a NEW booking.
 *
 * On a fresh booking Guestway hasn't created the conversation yet — it syncs the
 * reservation from Apaleo a few seconds later — so a single immediate send finds
 * none. Call this from `after()` (so it never blocks the booking response); it
 * retries the conversation lookup until it appears (default ~90s) and is fully
 * best-effort: it never throws.
 */
export async function sendStayExtensionConfirmation(
  reservationId: string,
  kind: 'late' | 'early',
  opts: { attempts?: number; delayMs?: number } = {},
): Promise<void> {
  const attempts = opts.attempts ?? 18
  const delayMs = opts.delayMs ?? 5000
  const body = buildStayExtensionMessage(kind)

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await sendGuestwayMessage({ reservationId, body })
    if (result.success) {
      bookingLog.success('guestway: stay-extension confirmation sent', { reservationId, kind, attempt })
      return
    }
    // "no conversation found" = Guestway is still syncing the new reservation;
    // keep polling. Any other error won't fix itself on retry — give up early.
    if (result.error !== 'no conversation found' && attempt >= 3) {
      bookingLog.error('guestway: stay-extension confirmation failed (non-retriable)', { reservationId, kind, error: result.error })
      return
    }
    if (attempt < attempts) await new Promise(res => setTimeout(res, delayMs))
  }
  bookingLog.error('guestway: stay-extension confirmation NOT delivered (conversation never appeared)', { reservationId, kind })
}
