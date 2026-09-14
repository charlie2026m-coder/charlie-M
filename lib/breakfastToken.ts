/**
 * What a scan of the breakfast QR hands over, reduced to the token.
 *
 * The QR encodes the guest page's URL, so a guest pointing their own phone
 * camera at it lands on their choices, and the staff scanner at the door
 * gets the token out of the same picture. A bare token (typed, or from an
 * older code) is accepted as it is. Anything without a /breakfast/{token}
 * path — a room code, another page of ours, free text — comes back null
 * rather than being guessed at.
 *
 * The HOST is deliberately not checked: the door runs on localhost in
 * development and on preview deployments as well as on the live domain, and
 * a foreign host buys an attacker nothing — the token still has to exist,
 * and anyone able to print a QR could print the bare token just as easily.
 * What protects the door is that scanning is admin-only.
 */

export const TOKEN_SHAPE = /^[A-Za-z0-9_-]{8,64}$/

const PATH = /^\/breakfast\/([A-Za-z0-9_-]{8,64})\/?$/

export function tokenFromScan(raw: unknown): string | null {
  const text = String(raw ?? '').trim()
  if (!text) return null
  if (TOKEN_SHAPE.test(text)) return text
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    const match = PATH.exec(url.pathname)
    return match ? match[1] : null
  } catch {
    return null
  }
}
