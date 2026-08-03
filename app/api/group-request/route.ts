import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { EMAIL } from '@/lib/Constants'

// Server-side handler for the Group & Corporate request form. Sends the request
// straight to the hotel inbox over HTTP (no SDK) so nothing depends on the
// guest's own mail client.
//
// Transport: Resend first, Mailgun as a fallback, so this can ship before the
// Resend key exists without taking a working form offline.
//
//   RESEND_API_KEY  — Resend API key (re_...). Preferred when present.
//   RESEND_FROM     — From header, e.g. "{BRAND} Website <noreply@mg.example.de>".
//                     MUST be on a domain verified in Resend. Falls back to
//                     MAILGUN_FROM / noreply@MAILGUN_DOMAIN.
// Mailgun (legacy fallback):
//   MAILGUN_API_KEY, MAILGUN_DOMAIN — required for that path
//   MAILGUN_BASE_URL / MAILGUN_REGION=eu — API host (default US)
//   MAILGUN_FROM    — From header
//
// With neither configured the route answers 503 and the form shows its
// "errorSend" toast — it never pretends a request was delivered.

export const runtime = 'nodejs'

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

interface GroupRequestBody {
  mode?: 'group' | 'corporate'
  name?: string
  email?: string
  phone?: string
  company?: string
  taxNumber?: string
  guests?: { adults?: number; children?: number }
  rooms?: string
  period?: string
  message?: string
  locale?: string
}

export async function POST(request: Request) {
  // Spam guard: 10 requests / 10 min per IP.
  const ip = getClientIp(request)
  if (!checkRateLimit('group-request', ip)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  let body: GroupRequestBody
  try {
    body = (await request.json()) as GroupRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim()
  if (!name || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'validation' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const mgKey = process.env.MAILGUN_API_KEY
  const mgDomain = process.env.MAILGUN_DOMAIN
  if (!resendKey && (!mgKey || !mgDomain)) {
    console.error('group-request: no mail transport configured (set RESEND_API_KEY, or MAILGUN_API_KEY + MAILGUN_DOMAIN)')
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  // From must sit on a domain the provider has verified, so it is taken from
  // config rather than guessed. Guests never see this address — the mail goes
  // from the site to the hotel's own inbox — so one shared sending domain can
  // serve all properties.
  const fromAddress = process.env.RESEND_FROM
    || process.env.MAILGUN_FROM
    || (mgDomain ? `Charlie M Website <noreply@${mgDomain}>` : '')
  if (!fromAddress) {
    console.error('group-request: RESEND_FROM is required when using Resend without a Mailgun domain')
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  const isCorporate = body.mode === 'corporate'
  const typeLabel = isCorporate ? 'Corporate request' : 'Group booking'
  const adults = Number(body.guests?.adults ?? 0)
  const children = Number(body.guests?.children ?? 0)

  const lines = [
    `Type: ${typeLabel}`,
    `Name: ${name}`,
    `Email: ${email}`,
    body.phone ? `Phone: ${body.phone}` : null,
    isCorporate && body.company?.trim() ? `Company: ${body.company.trim()}` : null,
    isCorporate && body.taxNumber?.trim() ? `Tax number: ${body.taxNumber.trim()}` : null,
    `Guests: ${adults} adult(s)${children ? `, ${children} child(ren)` : ''}`,
    body.rooms?.trim() ? `Rooms: ${body.rooms.trim()}` : null,
    body.period?.trim() ? `Stay: ${body.period.trim()}` : null,
    body.message?.trim() ? `\nMessage:\n${body.message.trim()}` : null,
    `\n— sent from charlie-m.de (${body.locale ?? 'en'})`,
  ].filter(Boolean) as string[]

  const subject = `${typeLabel} — Charlie M${isCorporate && body.company?.trim() ? ` (${body.company.trim()})` : ''}`

  try {
    const mail = { from: fromAddress, to: EMAIL, replyTo: email, subject, text: lines.join('\n') }
    const mailgunReady = Boolean(mgKey && mgDomain)

    let result = resendKey
      ? await sendViaResend(resendKey, mail)
      : await sendViaMailgun(mgKey as string, mgDomain as string, mail)

    // Resend rejects mail until its sending domain is DNS-verified, and the key
    // is normally set BEFORE the DNS lands. Without this fallback that gap turns
    // every request into a 502 on sites whose Mailgun still works — a guest
    // enquiry lost for a configuration step that is merely in progress.
    if (!result.ok && resendKey && mailgunReady) {
      console.error('group-request: Resend failed, falling back to Mailgun —', result.detail)
      const viaMailgun = await sendViaMailgun(mgKey as string, mgDomain as string, {
        ...mail,
        // The Resend From lives on a domain Mailgun may not be allowed to sign;
        // use Mailgun's own sender for its attempt.
        from: process.env.MAILGUN_FROM || `Charlie M Website <noreply@${mgDomain}>`,
      })
      result = viaMailgun
    }

    if (!result.ok) {
      console.error(`group-request: ${resendKey ? 'Resend' : 'Mailgun'} error`, result.detail)
      return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('group-request: send exception', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
  }
}

/** Resend: POST https://api.resend.com/emails, snake_case fields, Bearer auth. */
async function sendViaResend(key: string, mail: {
  from: string; to: string; replyTo: string; subject: string; text: string
}): Promise<{ ok: true } | { ok: false; detail: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mail.from,
      to: [mail.to],
      reply_to: mail.replyTo, // hotel replies go straight to the guest
      subject: mail.subject,
      text: mail.text,
    }),
  })
  if (res.ok) return { ok: true }
  return { ok: false, detail: `${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}` }
}

/** Mailgun: form-encoded, Basic auth, region-specific host. */
async function sendViaMailgun(apiKey: string, domain: string, mail: {
  from: string; to: string; replyTo: string; subject: string; text: string
}): Promise<{ ok: true } | { ok: false; detail: string }> {
  const apiBase = (process.env.MAILGUN_BASE_URL?.replace(/\/+$/, ''))
    || (process.env.MAILGUN_REGION === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net')

  const form = new URLSearchParams()
  form.set('from', mail.from)
  form.set('to', mail.to)
  form.set('h:Reply-To', mail.replyTo)
  form.set('subject', mail.subject)
  form.set('text', mail.text)

  const res = await fetch(`${apiBase}/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })
  if (res.ok) return { ok: true }
  return { ok: false, detail: `${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}` }
}
