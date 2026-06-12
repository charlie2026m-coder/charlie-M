import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { generateTokens } from '@/services/selfCheckout'
import { logger } from '@/lib/logger'

/**
 * Sync QR tokens with Apaleo: fetch all units of the property and ensure each
 * has a token. Existing tokens are never rotated (printed QR codes are
 * physical) — re-running is always safe.
 */
export async function POST() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const result = await generateTokens()
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    logger.withTag('self-checkout').error('generate failed:', e instanceof Error ? e.message : e)
    return NextResponse.json(
      { ok: false, error: 'Token generation failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
