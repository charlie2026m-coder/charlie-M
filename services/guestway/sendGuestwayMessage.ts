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

/** The first line of every room-ready note we send — what "already told" is
 *  recognised by in the guest's thread. Guestway's own automation used a
 *  different sentence, so it cannot be mistaken for ours. */
export const ROOM_READY_SIGNATURE = 'Your room is ready early'

/**
 * Has this guest already been told the room is ready — by us, on any path?
 *
 * The guest's conversation is the memory: our note is in the thread, and
 * Guestway keeps it. No table, no custom field, nothing to drift. `null` when
 * the thread cannot be read (not configured, no single conversation, an
 * error) — not "no", merely unknown, and callers must not act on it.
 */
export async function hasRoomReadyMessage(reservationId: string): Promise<boolean | null> {
  if (!API_URL || !PARTNERSHIP_API_KEY || !MESSAGE_TOKEN) return null
  try {
    const conversationId = await findConversationId(reservationId)
    if (!conversationId) return null
    const res = await fetch(`${API_URL}/conversations/${encodeURIComponent(conversationId)}/messages`, {
      headers: headers(MESSAGE_TOKEN as string),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: Array<{ body?: string | null }> }
    return (json.data ?? []).some((m) => typeof m.body === 'string' && m.body.includes(ROOM_READY_SIGNATURE))
  } catch (err) {
    bookingLog.warn('guestway: could not read the guest thread', {
      reservationId,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

function headers(bearer: string) {
  return {
    'X-Api-Key': PARTNERSHIP_API_KEY as string,
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
  }
}

/** One page of conversations for a confirmation code, or null if the call failed. */
async function conversationsFor(confirmationCode: string): Promise<Array<{ id: string }> | null> {
  const filters = [
    { field: 'reservations.confirmationCode', operator: 'eq', value: confirmationCode },
  ]
  const url = `${API_URL}/conversations?filters=${encodeURIComponent(JSON.stringify(filters))}`
  const res = await fetch(url, {
    headers: headers(MESSAGE_TOKEN as string),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    bookingLog.warn('guestway: conversation lookup failed', {
      confirmationCode,
      status: res.status,
    })
    return null
  }
  const json = (await res.json()) as ConversationsResponse
  return Array.isArray(json.data) ? json.data : []
}

// Guestway answers an unknown filter FIELD with HTTP 200 and the whole list
// rather than an error. Taking data[0] from that is how a message ends up in a
// stranger's thread — and a breakfast link is a bearer credential for somebody
// else's booking, so this is not a cosmetic risk. Probe once per process with a
// code that cannot exist: anything but an empty answer means the filter is
// being ignored and nothing may be sent through it.
const PROBE_CODE = 'CHARLIE-M-PROBE-NO-SUCH-RESERVATION'
let filterHonoured: boolean | null = null

async function filterIsHonoured(): Promise<boolean> {
  if (filterHonoured !== null) return filterHonoured
  try {
    const rows = await conversationsFor(PROBE_CODE)
    // A failed probe is not proof of anything, so it does not poison the cache.
    if (rows === null) return false
    filterHonoured = rows.length === 0
  } catch {
    return false
  }
  if (!filterHonoured) {
    bookingLog.error(
      'guestway: conversation filter is being ignored — refusing to send anything',
      { probe: PROBE_CODE },
    )
  }
  return filterHonoured
}

/**
 * Find the guest conversation for an Apaleo reservation. Apaleo's reservationId
 * is Guestway's `reservations.confirmationCode` (same mapping our accesses lookup
 * uses). Returns null when there's no conversation yet.
 *
 * Requires EXACTLY ONE match. More than one means the filter did not do what we
 * asked, and picking from the pile would send a guest's message to somebody
 * else.
 */
async function findConversationId(reservationId: string): Promise<string | null> {
  if (!(await filterIsHonoured())) return null

  const rows = await conversationsFor(reservationId)
  if (rows === null) return null
  if (rows.length === 0) return null
  if (rows.length > 1) {
    bookingLog.error('guestway: filter returned several conversations — refusing to guess', {
      reservationId,
      count: rows.length,
    })
    return null
  }
  return rows[0]?.id ?? null
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
 * "You have breakfast — now choose what you want."
 *
 * Plain text and bilingual for the same reason as the stay-extension message:
 * OTA guests read it in a channel thread that strips HTML.
 *
 * The link is the whole point, and it is also the QR the guest shows at the
 * door, so the message says to keep it rather than treating it as a one-off
 * form to fill in and forget.
 */
export function buildBreakfastMenuInvite(url: string, mornings: number): string {
  const rule = '——————————'
  const morningsEn = mornings === 1 ? 'one morning' : `${mornings} mornings`
  const morningsDe = mornings === 1 ? 'einen Morgen' : `${mornings} Morgen`
  return [
    'Breakfast — choose your menu',
    '',
    'Dear guest,',
    '',
    `Breakfast is booked for ${morningsEn} of your stay. Choose what you would like on each morning and the time you would like to come down — that reserves your seat.`,
    '',
    `Choose here: ${url}`,
    '',
    'Please keep the link: it also holds the code you show at the breakfast room.',
    '',
    'Charlie M Team',
    '',
    rule,
    '',
    'Frühstück — wählen Sie Ihr Menü',
    '',
    'Hallo,',
    '',
    `Für ${morningsDe} Ihres Aufenthalts ist Frühstück gebucht. Wählen Sie für jeden Morgen Ihr Menü und Ihre Uhrzeit — damit ist Ihr Platz reserviert.`,
    '',
    `Hier wählen: ${url}`,
    '',
    'Bitte bewahren Sie den Link auf: er enthält auch den Code, den Sie am Frühstücksraum zeigen.',
    '',
    'Ihr Charlie M Team',
  ].join('\n')
}

/**
 * "Your room is ready" — sent by US, the moment the door actually opened.
 *
 * Guestway can send this on its own schedule, but its schedule and the door are
 * two separate things: it would tell the guest at a fixed hour whether or not
 * the amend succeeded, and it would stay silent between the moment the room
 * became ready and that hour. Sending it here ties the words to the fact — the
 * guest hears "you can come in" only after the lock has been moved, and hears
 * it straight away.
 *
 * The time is not hardcoded because the door time is not fixed: it is whenever
 * housekeeping finished, 10:03 as easily as 13:00.
 *
 * Neither is the baseline. It deliberately does NOT end "no need to wait until
 * 15:00", which is false for a guest who bought the paid early check-in: their
 * arrival is already 13:00, so 15:00 was never their wait. Saying only how
 * early the room is ready is true for everyone.
 */
export function buildRoomReadyMessage(readyFrom: string): string {
  // `readyFrom` is the amended arrival, an Apaleo local datetime such as
  // "2026-09-05T11:18:00+02:00". Take its wall-clock HH:mm; if it is ever
  // shaped differently, say "now" rather than print something wrong.
  const hhmm = /T(\d{2}:\d{2})/.exec(readyFrom)?.[1] ?? null
  const enWhen = hhmm ? `from ${hhmm}` : 'now'
  const deWhen = hhmm ? `ab ${hhmm} Uhr` : 'ab sofort'
  const rule = '——————————'
  return [
    'Your room is ready early',
    '',
    'Dear guest,',
    '',
    `Good news — your room is ready earlier than planned. You can check in ${enWhen} today.`,
    '',
    `• Room ready ${enWhen} today`,
    '• Please use the check-in details from our earlier message',
    '',
    'We look forward to hosting you.',
    'Charlie M Team',
    '',
    rule,
    '',
    'Ihr Zimmer ist früher bereit',
    '',
    'Hallo,',
    '',
    `Gute Nachrichten — Ihr Zimmer ist früher fertig geworden. Sie können heute bereits ${deWhen} einchecken.`,
    '',
    `• Zimmer heute ${deWhen} bereit`,
    '• Bitte nutzen Sie die Check-in-Daten aus unserer vorherigen Nachricht',
    '',
    'Wir freuen uns auf Sie.',
    'Charlie M Team',
    '',
    rule,
    '',
    'Friedrichstraße 33, 10969 Berlin · www.charlie-m.de',
  ].join('\n')
}

/**
 * The evening before: breakfast is booked and still not chosen.
 *
 * Shorter than the invite on purpose. The guest has already had the long
 * version; this one exists to be read in the three seconds before bed, so it
 * leads with tomorrow and carries one link.
 */
export function buildBreakfastReminder(url: string): string {
  const rule = '——————————'
  return [
    'Breakfast tomorrow — you have not chosen yet',
    '',
    'Dear guest,',
    '',
    'Breakfast is booked for tomorrow morning and no menu has been picked. Choose now and your seat is reserved; otherwise we will simply serve you whatever is on.',
    '',
    `Choose here: ${url}`,
    '',
    'Charlie M Team',
    '',
    rule,
    '',
    'Frühstück morgen — noch nicht gewählt',
    '',
    'Hallo,',
    '',
    'Für morgen früh ist Frühstück gebucht, aber noch kein Menü gewählt. Wählen Sie jetzt, dann ist Ihr Platz reserviert — sonst servieren wir Ihnen einfach, was es an dem Tag gibt.',
    '',
    `Hier wählen: ${url}`,
    '',
    'Ihr Charlie M Team',
  ].join('\n')
}

/**
 * Deliver a message to a NEW booking, waiting for Guestway to catch up.
 *
 * Guestway creates the conversation a few seconds after the reservation syncs
 * from Apaleo, so a single immediate send finds none. Shared by the
 * stay-extension confirmation and the breakfast invite; fully best-effort and
 * never throws.
 */
async function sendWhenConversationExists(
  reservationId: string,
  body: string,
  label: string,
  opts: { attempts?: number; delayMs?: number } = {},
): Promise<boolean> {
  const attempts = opts.attempts ?? 18
  const delayMs = opts.delayMs ?? 5000

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await sendGuestwayMessage({ reservationId, body })
    if (result.success) {
      bookingLog.success(`guestway: ${label} sent`, { reservationId, attempt })
      return true
    }
    // "no conversation found" = Guestway is still syncing the new reservation;
    // keep polling. Any other error won't fix itself on retry — give up early.
    if (result.error !== 'no conversation found' && attempt >= 3) {
      bookingLog.error(`guestway: ${label} failed (non-retriable)`, {
        reservationId,
        error: result.error,
      })
      return false
    }
    if (attempt < attempts) await new Promise(res => setTimeout(res, delayMs))
  }
  bookingLog.error(`guestway: ${label} NOT delivered (conversation never appeared)`, {
    reservationId,
  })
  return false
}

/** Post the breakfast invite once Guestway has a conversation for the booking. */
export async function deliverBreakfastMenuInvite(
  reservationId: string,
  url: string,
  mornings: number,
  opts: { attempts?: number; delayMs?: number } = {},
): Promise<boolean> {
  return sendWhenConversationExists(
    reservationId,
    buildBreakfastMenuInvite(url, mornings),
    'breakfast invite',
    opts,
  )
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
  await sendWhenConversationExists(
    reservationId,
    buildStayExtensionMessage(kind),
    `stay-extension confirmation (${kind})`,
    opts,
  )
}
