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
 * The style below is the fix for a screen that scrolled down once and would
 * not come back. A phone browser has two viewport heights: the small one,
 * with the address bar and the tab bar showing, and the large one once they
 * slide away. The document is laid out against the LARGE one, so a short page
 * — a morning with nobody for breakfast — was 442px of content in a document
 * as tall as the large viewport, while only the small one was visible:
 * scrollable by exactly one toolbar and no more. Scrolling that far made the
 * toolbars slide away, the visible area then matched the document, the scroll
 * range became zero, and the page was left with its own header off the top
 * and nothing to scroll back. Pulling down reached the browser's
 * pull-to-refresh instead of the page.
 *
 * Pinning the document to the SMALL viewport (svh) removes the trap: a short
 * page is exactly as tall as what is visible, so it never scrolls and the
 * toolbars never slide away; a busy morning is taller than both and scrolls
 * like any other page. `overscroll-behavior` keeps pull-to-refresh out of it.
 */
const FIT_THE_PHONE = `
  html { height: 100svh; overscroll-behavior-y: contain; }
  body { min-height: 100svh; }
`

export default async function KitchenLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession()
  if (session.status !== 'ok') redirect('/admin/login')
  if (!session.areas.includes('kitchen')) redirect('/admin')

  return (
    <>
      <style>{FIT_THE_PHONE}</style>
      <div className='bg-white text-black'>{children}</div>
    </>
  )
}
