/**
 * The kitchen's own edits: menus, sittings and which menu is on which day.
 *
 * Separate from services/breakfast.ts on purpose. That module is the guest and
 * door path — read by the booking modal, the token page and the scanner — and
 * everything in it is careful about a guest's money and a guest's morning.
 * This one is the back office: it writes rows nobody has eaten yet, guarded by
 * requireAdmin at the route.
 *
 * Menus are never deleted, only deactivated. A code is referenced by every
 * booking that ever chose it and by the whole calendar, so a DELETE would
 * cascade a stranger's breakfast out of the record for the sake of tidying a
 * list. Deactivating takes it off the guest's choices and leaves history alone.
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

const bfLog = logger.withTag('breakfast-admin')

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface MenuRow {
  code: string
  icon: string
  name_de: string
  name_en: string
  description_de: string
  description_en: string
  items_de: string
  items_en: string
  allergens_de: string
  allergens_en: string
  photo_url: string | null
  sort_order: number
  is_active: boolean
}

export interface SlotRow {
  id: number
  starts_at: string
  ends_at: string
  capacity: number
  sort_order: number
  is_active: boolean
}

/** Everything the admin screen edits, including what guests cannot see. */
export async function listMenus(): Promise<MenuRow[]> {
  const { data } = await admin().from('breakfast_menus').select('*').order('sort_order')
  return (data ?? []) as MenuRow[]
}

export async function listSlots(): Promise<SlotRow[]> {
  const { data } = await admin()
    .from('breakfast_slots')
    .select('id, starts_at, ends_at, capacity, sort_order, is_active')
    .order('sort_order')
  return ((data ?? []) as SlotRow[]).map(s => ({
    ...s,
    starts_at: String(s.starts_at).slice(0, 5),
    ends_at: String(s.ends_at).slice(0, 5),
  }))
}

const TEXT_FIELDS = [
  'icon',
  'name_de',
  'name_en',
  'description_de',
  'description_en',
  'items_de',
  'items_en',
  'allergens_de',
  'allergens_en',
] as const

/** Only the fields the screen owns — never the code, which is the identity. */
function menuPatch(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const field of TEXT_FIELDS) {
    if (typeof body[field] === 'string') patch[field] = String(body[field]).slice(0, 4000)
  }
  if (body.sort_order != null && Number.isFinite(Number(body.sort_order))) {
    patch.sort_order = Math.trunc(Number(body.sort_order))
  }
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  return patch
}

export const MENU_CODE = /^[A-Za-z0-9_-]{1,16}$/

export async function createMenu(
  body: Record<string, unknown>,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const code = String(body.code ?? '').trim()
  if (!MENU_CODE.test(code)) return { ok: false, error: 'bad_code' }

  const patch = menuPatch(body)
  if (!patch.name_en && !patch.name_de) return { ok: false, error: 'name_required' }

  const { error } = await admin()
    .from('breakfast_menus')
    .insert({ code, ...patch })
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'code_taken' }
    bfLog.error('create menu failed', { code, error: error.message })
    return { ok: false, error: 'failed' }
  }
  return { ok: true, code }
}

export async function updateMenu(
  code: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  if (!MENU_CODE.test(code)) return { ok: false, error: 'bad_code' }
  const patch = menuPatch(body)
  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await admin().from('breakfast_menus').update(patch).eq('code', code)
  if (error) {
    bfLog.error('update menu failed', { code, error: error.message })
    return { ok: false, error: 'failed' }
  }
  return { ok: true }
}

const PHOTO_BUCKET = 'breakfast-menus'

/**
 * Put a picture on a menu, replacing whatever was there. The object name
 * carries a timestamp so a replaced picture is a new URL and no browser or
 * CDN keeps serving the old one; the old object is removed afterwards, best
 * effort — a leftover file costs nothing, a wrong picture on the menu would.
 */
export async function uploadMenuPhoto(
  code: string,
  bytes: Buffer,
  contentType: string,
  ext: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!MENU_CODE.test(code)) return { ok: false, error: 'bad_code' }
  const db = admin()

  const { data: row } = await db.from('breakfast_menus').select('photo_url').eq('code', code).maybeSingle()
  if (!row) return { ok: false, error: 'unknown_menu' }

  const path = `${code}-${Date.now()}.${ext}`
  const { error: upErr } = await db.storage.from(PHOTO_BUCKET).upload(path, bytes, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (upErr) {
    bfLog.error('menu photo upload failed', { code, error: upErr.message })
    return { ok: false, error: 'failed' }
  }
  const url = db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl

  const { error } = await db.from('breakfast_menus').update({ photo_url: url }).eq('code', code)
  if (error) {
    bfLog.error('menu photo save failed', { code, error: error.message })
    return { ok: false, error: 'failed' }
  }
  await removeStoredPhoto(row.photo_url as string | null)
  return { ok: true, url }
}

export async function clearMenuPhoto(code: string): Promise<{ ok: boolean; error?: string }> {
  if (!MENU_CODE.test(code)) return { ok: false, error: 'bad_code' }
  const db = admin()
  const { data: row } = await db.from('breakfast_menus').select('photo_url').eq('code', code).maybeSingle()
  if (!row) return { ok: false, error: 'unknown_menu' }
  const { error } = await db.from('breakfast_menus').update({ photo_url: null }).eq('code', code)
  if (error) {
    bfLog.error('menu photo clear failed', { code, error: error.message })
    return { ok: false, error: 'failed' }
  }
  await removeStoredPhoto(row.photo_url as string | null)
  return { ok: true }
}

/** Delete the object behind one of our own public URLs; anything else is left alone. */
async function removeStoredPhoto(url: string | null): Promise<void> {
  if (!url) return
  const marker = `/object/public/${PHOTO_BUCKET}/`
  const at = url.indexOf(marker)
  if (at < 0) return
  const path = decodeURIComponent(url.slice(at + marker.length))
  const { error } = await admin().storage.from(PHOTO_BUCKET).remove([path])
  if (error) bfLog.warn('old menu photo not removed', { path, error: error.message })
}

function slotPatch(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  const time = /^\d{2}:\d{2}$/
  if (typeof body.starts_at === 'string' && time.test(body.starts_at)) patch.starts_at = body.starts_at
  if (typeof body.ends_at === 'string' && time.test(body.ends_at)) patch.ends_at = body.ends_at
  if (body.capacity != null && Number.isFinite(Number(body.capacity))) {
    patch.capacity = Math.max(0, Math.trunc(Number(body.capacity)))
  }
  if (body.sort_order != null && Number.isFinite(Number(body.sort_order))) {
    patch.sort_order = Math.trunc(Number(body.sort_order))
  }
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  return patch
}

export async function createSlot(
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; id?: number }> {
  const patch = slotPatch(body)
  if (!patch.starts_at || !patch.ends_at) return { ok: false, error: 'times_required' }
  if (String(patch.ends_at) <= String(patch.starts_at)) return { ok: false, error: 'ends_before_starts' }

  const { data, error } = await admin()
    .from('breakfast_slots')
    .insert({ capacity: 12, ...patch })
    .select('id')
    .single()
  if (error || !data) {
    bfLog.error('create slot failed', { error: error?.message })
    return { ok: false, error: 'failed' }
  }
  return { ok: true, id: Number(data.id) }
}

export async function updateSlot(
  id: number,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const patch = slotPatch(body)
  if (Object.keys(patch).length === 0) return { ok: true }
  if (patch.starts_at && patch.ends_at && String(patch.ends_at) <= String(patch.starts_at)) {
    return { ok: false, error: 'ends_before_starts' }
  }

  const { error } = await admin().from('breakfast_slots').update(patch).eq('id', id)
  if (error) {
    bfLog.error('update slot failed', { id, error: error.message })
    return { ok: false, error: 'failed' }
  }
  return { ok: true }
}

/**
 * A sitting nobody has ever taken can go; one that has been booked cannot.
 * Removing it would set those bookings' slot_id to null, silently turning a
 * guest's reserved seat back into "no time chosen" with nothing to tell them.
 */
export async function deleteSlot(id: number): Promise<{ ok: boolean; error?: string }> {
  const db = admin()
  const { count } = await db
    .from('breakfast_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('slot_id', id)

  if ((count ?? 0) > 0) return { ok: false, error: 'in_use' }

  const { error } = await db.from('breakfast_slots').delete().eq('id', id)
  if (error) {
    bfLog.error('delete slot failed', { id, error: error.message })
    return { ok: false, error: 'failed' }
  }
  return { ok: true }
}

/**
 * Put one menu on, or take it off, every day of a range — leaving the other
 * menus on those days alone. This is the "Serve every day" button on a menu
 * card: the kitchen has just added a menu and wants it available, not to
 * re-enter the whole calendar.
 */
export async function changeCalendarForMenu(
  from: string,
  to: string,
  code: string,
  action: 'add' | 'remove',
): Promise<{ ok: boolean; days?: number; error?: string }> {
  if (!MENU_CODE.test(code)) return { ok: false, error: 'bad_code' }
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return { ok: false, error: 'bad_range' }
  }
  const days = Math.round((end - start) / 86_400_000) + 1
  if (days > MAX_RANGE_DAYS) return { ok: false, error: 'range_too_long' }

  const db = admin()

  if (action === 'remove') {
    const { error } = await db
      .from('breakfast_menu_days')
      .delete()
      .eq('menu_code', code)
      .gte('service_date', from)
      .lte('service_date', to)
    if (error) {
      bfLog.error('calendar remove failed', { code, from, to, error: error.message })
      return { ok: false, error: 'failed' }
    }
    return { ok: true, days }
  }

  const { data: known } = await db.from('breakfast_menus').select('code').eq('code', code).maybeSingle()
  if (!known) return { ok: false, error: 'unknown_menu' }

  const rows: { service_date: string; menu_code: string }[] = []
  for (let i = 0; i < days; i++) {
    rows.push({ service_date: new Date(start + i * 86_400_000).toISOString().slice(0, 10), menu_code: code })
  }
  for (let i = 0; i < rows.length; i += 500) {
    // Days that already serve it are left as they are.
    const { error } = await db
      .from('breakfast_menu_days')
      .upsert(rows.slice(i, i + 500), { onConflict: 'service_date,menu_code', ignoreDuplicates: true })
    if (error) {
      bfLog.error('calendar add failed', { code, from, to, error: error.message })
      return { ok: false, error: 'failed' }
    }
  }
  return { ok: true, days }
}

/** Which menus are on offer on each day of a range. */
export async function readCalendar(
  from: string,
  to: string,
): Promise<{ date: string; codes: string[] }[]> {
  const { data } = await admin()
    .from('breakfast_menu_days')
    .select('service_date, menu_code')
    .gte('service_date', from)
    .lte('service_date', to)
    .order('service_date')

  const byDate = new Map<string, string[]>()
  for (const row of data ?? []) {
    const date = String(row.service_date).slice(0, 10)
    byDate.set(date, [...(byDate.get(date) ?? []), String(row.menu_code)].sort())
  }
  return [...byDate.entries()].map(([date, codes]) => ({ date, codes }))
}

const MAX_RANGE_DAYS = 400

/**
 * Set the menus on offer for every day of a range, replacing what was there.
 *
 * Replace rather than merge: the screen shows the whole day's offer and the
 * kitchen edits it as a whole, so merging would leave yesterday's menu on a day
 * they had just taken it off. An empty list is a legitimate answer — it means
 * no breakfast is served, which the guest page already renders.
 */
export async function writeCalendar(
  from: string,
  to: string,
  codes: string[],
): Promise<{ ok: boolean; days?: number; error?: string }> {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return { ok: false, error: 'bad_range' }
  }
  const days = Math.round((end - start) / 86_400_000) + 1
  if (days > MAX_RANGE_DAYS) return { ok: false, error: 'range_too_long' }

  const db = admin()
  const wanted = [...new Set(codes.filter(c => MENU_CODE.test(c)))]

  if (wanted.length > 0) {
    // Every code has to exist, or the insert fails halfway and leaves the range
    // half-cleared.
    const { data: known } = await db.from('breakfast_menus').select('code').in('code', wanted)
    if ((known ?? []).length !== wanted.length) return { ok: false, error: 'unknown_menu' }
  }

  const { error: clearError } = await db
    .from('breakfast_menu_days')
    .delete()
    .gte('service_date', from)
    .lte('service_date', to)
  if (clearError) {
    bfLog.error('calendar clear failed', { from, to, error: clearError.message })
    return { ok: false, error: 'failed' }
  }

  if (wanted.length === 0) return { ok: true, days }

  const rows: { service_date: string; menu_code: string }[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10)
    for (const code of wanted) rows.push({ service_date: date, menu_code: code })
  }

  // Chunked: a year of four menus is 1460 rows and PostgREST would rather not
  // take them in one statement.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from('breakfast_menu_days').insert(rows.slice(i, i + 500))
    if (error) {
      bfLog.error('calendar write failed', { from, to, error: error.message })
      return { ok: false, error: 'failed' }
    }
  }

  return { ok: true, days }
}
