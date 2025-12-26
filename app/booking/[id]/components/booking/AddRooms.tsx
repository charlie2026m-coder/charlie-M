import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Guests } from '@/app/_components/ui/guests'
import { Button } from '@/app/_components/ui/button'
import { useBookingStore } from '@/store/useBookingStore'
import { HiOutlineTrash } from "react-icons/hi2";
import { FiEdit2 } from "react-icons/fi";
import { BsCalendar2Fill } from "react-icons/bs";
import dayjs from 'dayjs';
import { Room } from '@/types/types'


const AddRooms = ({ filledRooms }: { filledRooms: Room[] }) => {
  const rooms = useBookingStore(state => state.rooms)
  const roomDetails = useBookingStore(state => state.roomDetails)
  const setRooms = useBookingStore(state => state.setRooms)
  const addRoom = useBookingStore(state => state.addRoom)
  const removeRoom = useBookingStore(state => state.removeRoom)
  
  // Initialize state: use filledRooms first, then switch to rooms from store when available
  const [state, setState] = useState<Room[]>(filledRooms)

  useEffect(() => {
    // If rooms exist in store, use them; otherwise initialize store with filledRooms
    if (rooms && rooms.length > 0) {
      setState(rooms)
    } else if (filledRooms && filledRooms.length > 0) {
      setState(filledRooms)
    }
  }, [rooms, filledRooms])



  const maxPersons = roomDetails?.maxPersons || 2
  const addGuests = (id: string, guests: { adults: number, children: number }) => {
    const totalGuests = guests.adults + guests.children;
    if (totalGuests > maxPersons) {
      console.warn(`Cannot add more than ${maxPersons} guests per room`);
      return;
    }
    
    const updatedRooms = state.map((room) => 
      room.id === id 
        ? { ...room, adults: guests.adults, children: guests.children } 
        : room
    )
    
    setState(updatedRooms)
    setRooms(updatedRooms)
  }

  const handleEditRoom = (id: string) => {
    console.log('Edit room:', id)
    // TODO: Implement edit room modal/functionality
  }

  const handleRemoveRoom = (id: string) => {
    if (state.length === 1) return
    removeRoom(id)
    // setState will be updated by useEffect when rooms changes
  }


  return (
    <div className='flex flex-col gap-4 py-6 pb-4 border-b border-gray mb-4'>
      {state.map((room, index) =>{
        return (  
          <div key={room.id} className='flex flex-col  gap-2 border-b pb-4 border-gray'>
            <div className='flex gap-2 mb-3 items-center'>
              <Image 
                src={'/images/room1.webp'} 
                alt={'booking room image'} 
                width={42} 
                height={42} 
                className='size-[42px] min-w-[42px] rounded-lg object-cover' 
              />
              <div className='font-semibold text-[16px] mr-auto'>Room {index + 1}</div>
              {maxPersons > 1 &&
                <Guests
                  maxPersons={maxPersons}
                  setValue={(guests) => addGuests(room.id, guests)} 
                  value={room} 
                  className='!max-w-[120px]'
                />
              }
              {state.length > 1 && <HiOutlineTrash className='size-6 cursor-pointer text-red-700 self-center' onClick={() => handleRemoveRoom(room.id)} />}
            </div>
            <div className='flex px-2 gap-2 items-center'>
              <BsCalendar2Fill className='size-5 cursor-pointer self-center text-blue' /> {dayjs(room.from).format('DD MMM YYYY')} - {dayjs(room.to).format('DD MMM YYYY')}
              <FiEdit2 className='size-5 cursor-pointer self-center ml-auto' onClick={() => handleEditRoom(room.id)} />
            </div>

          </div>
        )
      })}
      <Button variant="outline" className='w-full' onClick={addRoom}>+ Add Room</Button>  
    </div>
  )
}

export default AddRooms