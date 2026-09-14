import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAdminSession } from '@/lib/requireAdmin'
import type { Area } from '@/lib/adminAccess'

/**
 * A section's own doorman. The (protected) layout has already established
 * who this is; a section layout wraps its screens in this so that a URL typed
 * by hand opens nothing the person's areas do not cover. Sent home rather
 * than shown an error: the home page lists what they can do.
 */
export async function AreaGate({ area, children }: { area: Area; children: ReactNode }) {
  const session = await getAdminSession()
  if (session.status !== 'ok') redirect('/admin/login')
  if (!session.areas.includes(area)) redirect('/admin')
  return <>{children}</>
}
