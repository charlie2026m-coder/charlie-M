import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { clearMenuPhoto, MENU_CODE, uploadMenuPhoto } from '@/services/breakfastAdmin'

/**
 * The picture on a breakfast menu — breakfast area only.
 *
 * POST multipart/form-data with `code` and `file`; the previous picture is
 * replaced. DELETE ?code= takes it off again. The file goes to the public
 * `breakfast-menus` bucket through the service role, which is why the bucket
 * needs no write policies of its own.
 *
 * Only real image types and a modest size: this is a thumbnail next to a
 * menu name, not a gallery, and a 20 MB camera original would make every
 * guest's booking modal pay for it.
 */
const NO_STORE = { 'Cache-Control': 'no-store' }
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['breakfast'] })
  if (!guard.ok) return guard.response

  const form = await request.formData().catch(() => null)
  const code = String(form?.get('code') ?? '').trim()
  const file = form?.get('file')
  if (!MENU_CODE.test(code)) {
    return NextResponse.json({ ok: false, error: 'bad_code' }, { status: 400, headers: NO_STORE })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'no_file' }, { status: 400, headers: NO_STORE })
  }
  const ext = TYPES[file.type]
  if (!ext) {
    return NextResponse.json({ ok: false, error: 'bad_type' }, { status: 400, headers: NO_STORE })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'too_big' }, { status: 400, headers: NO_STORE })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const result = await uploadMenuPhoto(code, bytes, file.type, ext)
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: NO_STORE })
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin({ anyOf: ['breakfast'] })
  if (!guard.ok) return guard.response

  const code = String(request.nextUrl.searchParams.get('code') ?? '').trim()
  if (!MENU_CODE.test(code)) {
    return NextResponse.json({ ok: false, error: 'bad_code' }, { status: 400, headers: NO_STORE })
  }
  const result = await clearMenuPhoto(code)
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: NO_STORE })
}
