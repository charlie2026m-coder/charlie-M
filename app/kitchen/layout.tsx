import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { ReactNode } from 'react'

/**
 * The restaurant's own screens.
 *
 * Same gate as the admin panel — a signed-in user with a row in `admins` — but
 * every role is welcome here: the owners want to see what the kitchen sees, and
 * the kitchen's own login (role `kitchen`) can reach nothing else. The admin
 * layout is the one that turns the kitchen away, not this one.
 *
 * Plain full-width pages with no site chrome: a tablet on the pass does not
 * need the hotel's header and footer around a number.
 */
export default async function KitchenLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/admin/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('role')
    .eq('email', user.email)
    .single()

  if (!admin) redirect('/admin/login')

  return <div className='min-h-screen bg-white text-black'>{children}</div>
}
