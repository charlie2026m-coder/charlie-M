import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAdminSession } from '@/lib/requireAdmin'

/**
 * The restaurant's own screens.
 *
 * Same gate as the admin panel — a signed-in staff member, second factor
 * passed if they have one — and open to everybody whose areas include the
 * kitchen screen: the kitchen's own login can reach nothing else, and the
 * owners want to see what the kitchen sees. The admin layout is the one that
 * turns the kitchen away, not this one.
 *
 * Plain full-width pages with no site chrome: a tablet on the pass does not
 * need the hotel's header and footer around a number.
 *
 * Sized to the viewport the phone actually shows (dvh), not to 100vh. On
 * iOS 100vh is the height with the browser bars hidden, so a short page was
 * taller than what was visible by exactly a toolbar: it scrolled that far,
 * hid its own header, and stopped — which reads as "the page will not
 * scroll". The site body is 100vh too; the style below narrows that here.
 */
export default async function KitchenLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession()
  if (session.status !== 'ok') redirect('/admin/login')
  if (!session.areas.includes('kitchen')) redirect('/admin')

  return (
    <>
      <style>{'body{min-height:100dvh}'}</style>
      <div className='flex min-h-dvh flex-col bg-white text-black'>{children}</div>
    </>
  )
}
