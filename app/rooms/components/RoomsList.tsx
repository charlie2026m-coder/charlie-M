'use client'
import RoomCard from './RoomCard'
import { UrlParams } from '@/types/beds24'
import { CustomPagination } from '@/app/_components/ui/CustomPagination'
import { useState, useMemo, useEffect } from 'react'
import { RoomGroup } from '@/types/apaleo'
import { useStore } from '@/store/useStore'

const RoomsList = ({ 
  rooms, 
  params 
}: { 
  rooms: RoomGroup[],
  params: UrlParams 
}) => {
  console.log(rooms, 'rooms')
  const { filter, priceFilter } = useStore()
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
      filtered = filtered.sort((a, b) => a.price - b.price)
    } else {
      filtered = filtered.sort((a, b) => b.price - a.price)
    }
    if(filter === 'balcony') {
      filtered = filtered.filter((room) => room.attributes?.includes('balcony'))
    }
    if(filter === 'terrace') {
      filtered = filtered.filter((room) => room.attributes?.includes('terrace'))
    }
    if(filter === 'shared') {
      filtered = filtered.filter((room) => room.attributes?.includes('shared'))
    }
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
        {displayedRooms.map((room: RoomGroup) => (
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