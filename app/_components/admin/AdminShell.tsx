'use client'

/**
 * The frame around every admin page: one menu, always in the same place.
 *
 * Before this, the panel was a rooms table with a row of buttons in its header
 * and every other screen reachable only from there, each with its own idea of
 * a "back" link. An owner looking for the breakfast money had to know it was
 * behind "Breakfast setup" and then a second button. Now every screen is one
 * click away from every other, grouped by what the person is trying to do.
 *
 * Sidebar on a wide screen; a top bar with a menu button on a phone.
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  MdBarChart,
  MdBed,
  MdClose,
  MdDashboard,
  MdLogout,
  MdMenu,
  MdQrCode2,
  MdQrCodeScanner,
  MdRestaurantMenu,
  MdRoomService,
  MdSearch,
  MdTune,
  MdTv,
} from 'react-icons/md'
import { supabase } from '@/lib/supabase'

export interface AdminNavItem {
  href: string
  label: string
  hint: string
  icon: React.ReactNode
  /** Also lit for pages beneath it (the edit screens). */
  prefix?: boolean
  /** Opens elsewhere — the restaurant's screen is not part of this panel. */
  external?: boolean
}

export interface AdminNavGroup {
  title?: string
  items: AdminNavItem[]
}

/** The whole panel, in the order it is shown. The home page draws its cards
 *  from the same list, so a screen added here appears in both places. */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    items: [
      { href: '/admin', label: 'Today', hint: 'Arrivals, departures, breakfast', icon: <MdDashboard /> },
    ],
  },
  {
    title: 'Breakfast',
    items: [
      { href: '/admin/breakfast/overview', label: 'Numbers', hint: 'Sold, chosen, revenue', icon: <MdBarChart /> },
      { href: '/admin/breakfast/report', label: 'Kitchen sheet', hint: 'What to cook on a morning', icon: <MdRestaurantMenu /> },
      { href: '/admin/breakfast/reservation', label: 'Booking', hint: 'Look one up, add breakfast', icon: <MdSearch /> },
      { href: '/admin/breakfast/scan', label: 'Door', hint: 'Scan the guest’s QR', icon: <MdQrCodeScanner /> },
      { href: '/admin/breakfast', label: 'Setup', hint: 'Menus, sittings, calendar', icon: <MdTune /> },
    ],
  },
  {
    title: 'Hotel',
    items: [
      { href: '/admin/rooms', label: 'Rooms', hint: 'Photos and descriptions', icon: <MdBed />, prefix: true },
      { href: '/admin/services', label: 'Extras', hint: 'What guests can add', icon: <MdRoomService />, prefix: true },
      { href: '/admin/checkout', label: 'QR codes', hint: 'Print for the rooms', icon: <MdQrCode2 /> },
    ],
  },
  {
    title: 'Restaurant',
    items: [
      { href: '/kitchen', label: 'Kitchen screen', hint: 'What the restaurant sees', icon: <MdTv />, external: true },
    ],
  },
]

function isActive(item: AdminNavItem, pathname: string): boolean {
  if (item.prefix) return pathname === item.href || pathname.startsWith(item.href + '/')
  return pathname === item.href
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className='flex flex-col gap-5'>
      {ADMIN_NAV.map((group, i) => (
        <div key={i}>
          {group.title && (
            <div className='mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400'>
              {group.title}
            </div>
          )}
          <ul className='flex flex-col gap-0.5'>
            {group.items.map(item => {
              const active = isActive(item, pathname)
              const className = `flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                active ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
              }`
              const body = (
                <>
                  <span className='text-xl'>{item.icon}</span>
                  <span className='min-w-0'>
                    <span className='block text-sm font-medium leading-tight'>{item.label}</span>
                    <span className={`block text-xs leading-tight ${active ? 'text-gray-300' : 'text-gray-500'}`}>
                      {item.hint}
                    </span>
                  </span>
                </>
              )
              return (
                <li key={item.href}>
                  {item.external ? (
                    <a href={item.href} target='_blank' rel='noreferrer' className={className}>
                      {body}
                    </a>
                  ) : (
                    <Link href={item.href} className={className} onClick={onNavigate}>
                      {body}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const brand = (
    <div className='flex items-center gap-3 px-3'>
      <div className='flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white'>
        C
      </div>
      <div>
        <div className='text-sm font-bold leading-tight'>Charlie M</div>
        <div className='text-xs leading-tight text-gray-500'>Admin</div>
      </div>
    </div>
  )

  const logoutButton = (
    <button
      type='button'
      onClick={() => void logout()}
      className='flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-100'
    >
      <MdLogout className='text-xl' /> Log out
    </button>
  )

  return (
    <div className='min-h-screen bg-white text-black lg:flex'>
      {/* Wide screens: a sidebar that stays put. */}
      <aside className='hidden w-64 shrink-0 flex-col border-r border-gray-200 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen'>
        <div className='mb-6'>{brand}</div>
        <div className='flex-1 overflow-y-auto'>
          <NavList pathname={pathname} />
        </div>
        <div className='mt-4 border-t border-gray-200 pt-3'>{logoutButton}</div>
      </aside>

      {/* Phones: a bar with the menu behind one button. */}
      <div className='lg:hidden'>
        <div className='flex items-center justify-between border-b border-gray-200 p-3'>
          {brand}
          <button
            type='button'
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className='flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 text-2xl'
          >
            {open ? <MdClose /> : <MdMenu />}
          </button>
        </div>
        {open && (
          <div className='border-b border-gray-200 p-3'>
            <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className='mt-4 border-t border-gray-200 pt-3'>{logoutButton}</div>
          </div>
        )}
      </div>

      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  )
}
