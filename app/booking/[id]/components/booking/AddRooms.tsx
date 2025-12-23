import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Guests } from '@/app/_components/ui/guests'
import { Button } from '@/app/_components/ui/button'
import { useBookingStore } from '@/store/useBookingStore'
import { HiOutlineTrash } from "react-icons/hi2";
import { FiEdit2 } from "react-icons/fi";
import { BsCalendar2Fill } from "react-icons/bs";
import dayjs from 'dayjs';
import { Room, RoomDetails } from '@/types/types'


const AddRooms = ({ initialRooms, roomDetails }: { initialRooms: Room[], roomDetails: RoomDetails }) => {
  const { rooms : bookingRooms, setRooms: setBookingRooms, addRoom, removeRoom } = useBookingStore()
  const [rooms, setRooms] = useState<Room[]>(initialRooms || bookingRooms)

  useEffect(() => {
    setBookingRooms(initialRooms)
  }, [initialRooms])

  useEffect(() => {
    setRooms(bookingRooms)
  }, [bookingRooms])
  
  const maxAdults = roomDetails?.adults || 0
  const maxChildren = roomDetails?.children || 0
  
  const addGuests = (id: string, guests: { adults: number, children: number }) => {
    // Обновляем количество гостей для конкретной комнаты
    const updatedRooms = rooms.map((room) => 
      room.id === id 
        ? { ...room, adults: guests.adults, children: guests.children } 
        : room
    )
    
    // Обновляем локальный state и store
    setRooms(updatedRooms)
    setBookingRooms(updatedRooms)
  }

  const handleEditRoom = (id: string) => {
    console.log('Edit room:', id)
    // TODO: Implement edit room modal/functionality
  }


  return (
    <div className='flex flex-col gap-3 py-6 pb-4 border-b'>
      {rooms.map((room, index) =>{
        return (  
          <div key={room.id} className='flex flex-col  gap-2'>
            <div className='flex gap-2 mb-3 items-center'>
              <Image 
                src={'/images/room1.webp'} 
                alt={'booking room image'} 
                width={42} 
                height={42} 
                className='size-[42px] min-w-[42px] rounded-lg object-cover' 
              />
              <div className='font-semibold text-[16px] mr-auto'>Room {index + 1}</div>
              <Guests
                maxAdults={maxAdults}
                maxChildren={maxChildren}
                setValue={(guests) => addGuests(room.id, guests)} 
                value={room} 
                className='!max-w-[120px]'
              />
              {rooms.length > 1 && <HiOutlineTrash className='size-6 cursor-pointer text-red-700 self-center' onClick={() => removeRoom(room.id)} />}
            </div>
            <div className='flex px-2 gap-2 items-center'>
              <BsCalendar2Fill className='size-5 cursor-pointer self-center text-blue' /> {dayjs(room.from).format('DD MMM YYYY')} - {dayjs(room.to).format('DD MMM YYYY')}
              <FiEdit2 className='size-5 cursor-pointer self-center ' onClick={() => handleEditRoom(room.id)} />
            </div>

          </div>
        )
      })}
      <Button variant="outline" className='w-full' onClick={addRoom}>+ Add Room</Button>  
    </div>
  )
}

export default AddRooms