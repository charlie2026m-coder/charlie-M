'use client'

/**
 * The extras guests can add to a booking — breakfast, parking, late check-out
 * and so on — as they are worded and pictured on the website. Which extras
 * exist, and what they cost, is decided in Apaleo. Who may be on this screen
 * is decided server-side in the (protected) layout; this page only reads.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ServiceDetails } from '@/app/actions/supabase/services/getServicesDetails'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/ui/table'
import { IoSearch } from 'react-icons/io5'
import { MdEdit } from 'react-icons/md'
import { PageHeader } from '@/app/_components/admin/PageHeader'

export default function AdminServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<ServiceDetails[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('services').select('*').order('id', { ascending: true })
      setServices(data ?? [])
    })()
  }, [])

  const q = searchQuery.trim().toLowerCase()
  const filtered = (services ?? []).filter(
    s =>
      !q ||
      s.id.toLowerCase().includes(q) ||
      s.title_en.toLowerCase().includes(q) ||
      s.title_de.toLowerCase().includes(q),
  )

  return (
    <main className='mx-auto w-full max-w-[1200px] p-4 pb-16 sm:p-6'>
      <PageHeader
        title='Extras'
        description={`${services ? services.length : '…'} extras guests can add to a booking. Click one to change its name, description or picture. Which extras exist, and what they cost, is set in Apaleo.`}
      />

      {services === null ? (
        <p className='text-sm text-gray-500'>Loading…</p>
      ) : (
        <>
          <div className='relative mb-4 max-w-sm'>
            <IoSearch className='absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400' />
            <input
              type='text'
              placeholder='Search by name or ID'
              className='w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-black outline-none placeholder:text-gray-400 focus:border-black'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className='overflow-hidden rounded-xl border border-gray-200'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50 hover:bg-gray-50'>
                  <TableHead className='font-bold text-black'>Name (EN)</TableHead>
                  <TableHead className='hidden font-bold text-black md:table-cell'>Name (DE)</TableHead>
                  <TableHead className='w-[130px] font-bold text-black'>ID</TableHead>
                  <TableHead className='w-[90px] text-center font-bold text-black'>Picture</TableHead>
                  <TableHead className='w-[70px]' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className='hover:bg-white'>
                    <TableCell colSpan={5} className='py-12 text-center text-sm text-gray-500'>
                      {q ? 'Nothing matches that.' : 'No extras yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(service => (
                    <TableRow
                      key={service.id}
                      className='cursor-pointer'
                      onClick={() => router.push(`/admin/services/${service.id}`)}
                    >
                      <TableCell className='max-w-[300px] text-sm font-medium text-gray-900'>
                        <div className='truncate'>{service.title_en}</div>
                      </TableCell>
                      <TableCell className='hidden max-w-[300px] text-sm font-medium text-gray-900 md:table-cell'>
                        <div className='truncate'>{service.title_de}</div>
                      </TableCell>
                      <TableCell className='font-mono text-xs font-bold text-black'>{service.id}</TableCell>
                      <TableCell className='text-center text-sm'>
                        {service.image_path ? (
                          <span className='text-green-700'>yes</span>
                        ) : (
                          <span className='rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800'>
                            none
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='text-center'>
                        <Link
                          href={`/admin/services/${service.id}`}
                          aria-label={`Edit ${service.title_en}`}
                          className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800'
                        >
                          <MdEdit className='size-4' />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </main>
  )
}
