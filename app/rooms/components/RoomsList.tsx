'use client'
import { useRooms } from '@/app/hooks/useRooms'
import RoomCard from './RoomCard'
import { Beds24RoomType } from '@/types/beds24'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import { useState, useMemo } from 'react'

const ROOMS_PER_PAGE = 6

const RoomsList = () => {
  const { data: rooms = [], isLoading, isError } = useRooms()
  const [currentPage, setCurrentPage] = useState(0) // 0-based for CustomPagination
  console.log(rooms, 'rooms')
  // Calculate pagination
  const totalPages = Math.ceil(rooms.length / ROOMS_PER_PAGE)
  
  // Get current page rooms
  const currentRooms = useMemo(() => {
    const startIndex = currentPage * ROOMS_PER_PAGE
    const endIndex = startIndex + ROOMS_PER_PAGE
    return rooms.slice(startIndex, endIndex)
  }, [rooms, currentPage])

  if (isLoading) {
    return <div className='flex items-center justify-center h-[260px] rounded-[40px] bg-light-blue/40 text-dark/60'>Loading rooms…</div>
  }

  if (isError || rooms.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col gap-[30px] mb-[30px]'>
      <div className='grid grid-cols-3 gap-4'> 
        {currentRooms.map((room: Beds24RoomType) => (
          <RoomCard 
            key={room.id} 
            title={room.name}
            extra={''}
            price={room.minPrice}
            squareMeters={room.roomSize}
            beds={room.roomType}
          />
        ))}
      </div>
      
      {totalPages > 1 && (
        <CustomPagination 
          totalPages={totalPages} 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
        />
      )}
    </div>
  )
}

export default RoomsList