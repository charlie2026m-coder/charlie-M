'use client'
import RoomCard from './RoomCard'
import { Beds24RoomType, UrlParams } from '@/types/beds24'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import { useState, useMemo, useEffect } from 'react'
import { useBookingStore } from '@/store/bookingStore'

const RoomsList = ({ 
  rooms, 
  params 
}: { 
  rooms: Beds24RoomType[],
  params: UrlParams 
}) => {
  const { filter, priceFilter } = useBookingStore()
  const [currentPage, setCurrentPage] = useState(0)
  const [roomsPerPage, setRoomsPerPage] = useState(6)
  // Adjust rooms per page based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      
      if (width >= 1024) {
        setRoomsPerPage(6) // lg: 6 cards
      } else {
        setRoomsPerPage(4) // md and smaller: 4 cards
      }
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Apply filters first
  const filteredRooms = useMemo(() => {
    let filtered = rooms;
    
    if(priceFilter === 'Cheapest') {
      filtered = filtered.sort((a, b) => a.minPrice - b.minPrice)
    } else {
      filtered = filtered.sort((a, b) => b.minPrice - a.minPrice)
    }
    if(filter === 'balcony') {
      filtered = filtered.filter((room) => room.hasBalcony)
    }
    // if(filter?.includes('terrace')) {
    //   filtered = filtered.filter((room) => room.hasTerrace)
    // }
    // if(filter?.includes('shared_terrace')) {
    //   filtered = filtered.filter((room) => room.hasSharedTerrace)
    // }
    return filtered;
  }, [rooms, priceFilter, filter])

  // Reset to first page when filters or rooms per page change
  useEffect(() => {
    setCurrentPage(0);
  }, [roomsPerPage, filteredRooms, filter])
  
  // Calculate pagination based on filtered results
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage)
  
  // Get current page rooms
  const displayedRooms = useMemo(() => {
    const start = currentPage * roomsPerPage
    return filteredRooms.slice(start, start + roomsPerPage)
  }, [filteredRooms, currentPage, roomsPerPage, priceFilter, filter])
  return (
    <div className='flex flex-col gap-[30px] mb-[30px]'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'> 
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