import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { EMAIL } from '@/lib/Constants'

// Server-side handler for the Group & Corporate request form. Sends the request
// straight to the hotel inbox via Mailgun's HTTP API (no SDK) so nothing depends
// on the guest's own mail client.
//
// Required env vars (set in Vercel + local .env):
//   MAILGUN_API_KEY   — Mailgun private API key
//   MAILGUN_DOMAIN    — the sending domain verified in Mailgun (e.g. mg.charlie-m.de)
// Optional:
//   MAILGUN_REGION=eu — use the EU API host (default is US)
//   MAILGUN_FROM      — From header (default: "Charlie M Website <noreply@DOMAIN>")

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

  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  if (!apiKey || !domain) {
    console.error('group-request: MAILGUN_API_KEY / MAILGUN_DOMAIN not configured')
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  const apiBase = process.env.MAILGUN_REGION === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
  const fromAddress = process.env.MAILGUN_FROM || `Charlie M Website <noreply@${domain}>`

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

  const form = new URLSearchParams()
  form.set('from', fromAddress)
  form.set('to', EMAIL)
  form.set('h:Reply-To', email) // hotel replies go straight to the guest
  form.set('subject', subject)
  form.set('text', lines.join('\n'))

  try {
    const res = await fetch(`${apiBase}/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('group-request: Mailgun error', res.status, detail.slice(0, 300))
      return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('group-request: send exception', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
  }
}
