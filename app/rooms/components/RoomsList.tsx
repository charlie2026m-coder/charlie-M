'use client'
import { useRooms } from '@/app/hooks/useRooms'
import RoomCard from './RoomCard'
import { Beds24RoomType } from '@/types/beds24'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import { useState, useMemo } from 'react'

const ROOMS_PER_PAGE = 6

const RoomsList = ({ rooms }: { rooms: Beds24RoomType[] }) => {
  
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


  return (
    <div className='flex flex-col gap-[30px] mb-[30px]'>
      <div className='grid grid-cols-3 gap-4'> 
        {currentRooms.map((room: Beds24RoomType) => (
          <RoomCard 
            key={room.id} 
            id={room.id}
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