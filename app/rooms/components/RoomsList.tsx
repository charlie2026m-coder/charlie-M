'use client'
import RoomCard from './RoomCard'
import { Beds24RoomType, UrlParams } from '@/types/beds24'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import { useState, useMemo, useEffect } from 'react'
import { useBookingStore } from '@/store/bookingStore'

const ROOMS_PER_PAGE = 6

const RoomsList = ({ 
  rooms, 
  params 
}: { 
  rooms: Beds24RoomType[],
  params: UrlParams 
}) => {
  const { balconyFilter, categoryFilter } = useBookingStore()
  const [currentPage, setCurrentPage] = useState(0)
  
  // Apply filters first
  const filteredRooms = useMemo(() => {
    let filtered = rooms;
    
    // Filter by balcony
    if (balconyFilter) {
      filtered = filtered.filter(room => room.hasBalcony === balconyFilter);
    }
    
    // Filter by category (if categoryFilter has items)
    if (categoryFilter && categoryFilter.length > 0 && categoryFilter.length > 0) {
      filtered = filtered.filter(room => 
        categoryFilter.some(cat => room.roomType?.toLowerCase() === cat.toLowerCase())
      );
    }
    
    return filtered;
  }, [rooms, balconyFilter, categoryFilter])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [balconyFilter, categoryFilter])
  
  // Calculate pagination based on filtered results
  const totalPages = Math.ceil(filteredRooms.length / ROOMS_PER_PAGE)
  
  // Get current page rooms
  const displayedRooms = useMemo(() => {
    const start = currentPage * ROOMS_PER_PAGE
    return filteredRooms.slice(start, start + ROOMS_PER_PAGE)
  }, [filteredRooms, currentPage])
  return (
    <div className='flex flex-col gap-[30px] mb-[30px]'>
      <div className='grid grid-cols-3 gap-4'> 
        {displayedRooms.map((room: Beds24RoomType) => (
          <RoomCard 
            params={params}
            key={room.id} 
            room={room}
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