'use client'

/**
 * The room types as guests see them on the website: names, descriptions,
 * photos, tags. Prices and availability come from Apaleo and are not edited
 * here. Who may be on this screen is decided server-side in the (protected)
 * layout; this page only reads.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RoomDetails } from '@/app/actions/supabase/rooms/getRoomDetails'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/ui/table'
import { MdEdit } from 'react-icons/md'
import { PageHeader } from '@/app/_components/admin/PageHeader'

const tag = 'inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700'

export default function AdminRoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<RoomDetails[] | null>(null)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('rooms').select('*').order('id', { ascending: true })
      setRooms(data ?? [])
    })()
  }, [])

  return (
    <main className='mx-auto w-full max-w-[1200px] p-4 pb-16 sm:p-6'>
      <PageHeader
        title='Rooms'
        description={`${rooms ? rooms.length : '…'} room types on the website. Click one to change its name, description, photos or tags. Prices and availability come from Apaleo.`}
      />

      {rooms === null ? (
        <p className='text-sm text-gray-500'>Loading…</p>
      ) : (
        <div className='overflow-hidden rounded-xl border border-gray-200'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50 hover:bg-gray-50'>
                <TableHead className='font-bold text-black'>Name</TableHead>
                <TableHead className='w-[120px] font-bold text-black'>ID</TableHead>
                <TableHead className='w-[90px] text-center font-bold text-black'>Guests</TableHead>
                <TableHead className='hidden w-[90px] text-center font-bold text-black md:table-cell'>Size</TableHead>
                <TableHead className='w-[90px] text-center font-bold text-black'>Photos</TableHead>
                <TableHead className='hidden font-bold text-black md:table-cell'>Tags</TableHead>
                <TableHead className='w-[70px]' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.length === 0 ? (
                <TableRow className='hover:bg-white'>
                  <TableCell colSpan={7} className='py-12 text-center text-sm text-gray-500'>
                    No rooms yet.
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map(room => (
                  <TableRow
                    key={room.id}
                    className='cursor-pointer'
                    onClick={() => router.push(`/admin/rooms/${room.id}`)}
                  >
                    <TableCell className='max-w-[350px] text-sm font-medium text-gray-900'>
                      <div className='truncate'>{room.title_en}</div>
                    </TableCell>
                    <TableCell className='font-mono text-xs font-bold text-black'>{room.id}</TableCell>
                    <TableCell className='text-center text-sm'>{room.max_persons}</TableCell>
                    <TableCell className='hidden text-center text-sm md:table-cell'>{room.size} m²</TableCell>
                    <TableCell className='text-center text-sm'>
                      {room.photos.length === 0 ? (
                        <span className='rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800'>
                          none
                        </span>
                      ) : (
                        room.photos.length
                      )}
                    </TableCell>
                    <TableCell className='hidden md:table-cell'>
                      <div className='flex max-w-[250px] flex-wrap gap-1'>
                        {room.attributes.slice(0, 3).map((attr, i) => (
                          <span key={i} className={tag}>
                            {attr}
                          </span>
                        ))}
                        {room.attributes.length > 3 && (
                          <span className={tag}>+{room.attributes.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-center'>
                      <Link
                        href={`/admin/rooms/${room.id}`}
                        aria-label={`Edit ${room.title_en}`}
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
      )}
    </main>
  )
}
