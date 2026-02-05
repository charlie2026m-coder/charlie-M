'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Guests } from '@/app/_components/ui/guests'
import { Button } from '@/app/_components/ui/button'
import { useBookingStore } from '@/store/useBookingStore'
import { HiOutlineTrash } from "react-icons/hi2";
import { Room } from '@/types/types'
import { useTranslations } from 'next-intl'

const AddRooms = ({ 
  filledRooms, 
  availableUnits, 
  isKidsBedAvailable = true,
  babyBedAvailability 
}: { 
  filledRooms: Room[], 
  availableUnits: number, 
  isKidsBedAvailable?: boolean,
  babyBedAvailability?: { isAvailable: boolean; count: number }
}) => {
  const t = useTranslations('addRooms')
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
  
  // Calculate total children across all rooms
  const totalChildren = state.reduce((acc, room) => acc + (room.children || 0), 0)
  const maxBabyBeds = babyBedAvailability?.count || 0
  
  const addGuests = (id: string, guests: { adults: number, children: number }) => {
    // Only check adults count against maxPersons (children don't count)
    if (guests.adults > maxPersons) {
      console.warn(`Cannot add more than ${maxPersons} adults per room`);
      return;
    }
    
    // Calculate new total children if this change is applied
    const currentRoomChildren = state.find(r => r.id === id)?.children || 0
    const newTotalChildren = totalChildren - currentRoomChildren + guests.children
    
    // Check if adding this child would exceed available baby beds
    if (maxBabyBeds > 0 && newTotalChildren > maxBabyBeds) {
      console.warn(`Cannot add more than ${maxBabyBeds} children (baby beds available)`);
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


  const handleRemoveRoom = (id: string) => {
    if (state.length === 1) return
    removeRoom(id)
  }

  const leftRooms = availableUnits - state.length

  return (
    <div className='flex flex-col gap-4 py-6 pb-4 border-b border-gray mb-4'>
      {state.map((room, index) =>{
        const isLast = index === state.length - 1;
        return (  
          <div key={room.id} className={`flex flex-col gap-2  border-gray ${isLast ? '' : 'border-b'}`}>
            <div className='flex gap-2 mb-3 items-center'>
              <Image 
                src={'/images/room1.webp'} 
                alt={'booking room image'} 
                width={42} 
                height={42} 
                className='size-[42px] min-w-[42px] rounded-lg object-cover' 
              />
              <div className='font-semibold text-[16px] mr-auto'>{t('room')} {index + 1}</div>
              {maxPersons > 1 &&
                <Guests
                  maxPersons={maxPersons}
                  setValue={(guests) => addGuests(room.id, guests)} 
                  value={room} 
                  className='!max-w-[120px]'
                  disableChildren={!isKidsBedAvailable}
                  maxBabyBeds={maxBabyBeds}
                  totalChildrenInAllRooms={totalChildren}
                />
              }
              {state.length > 1 && <HiOutlineTrash className='size-6 cursor-pointer text-red-700 self-center' onClick={() => handleRemoveRoom(room.id)} />}
            </div>

          </div>
        )
      })}
      {leftRooms > 0 && <Button variant="outline" className='w-full' onClick={addRoom}>+ {t('addRoom')} ({leftRooms} {t('left')})</Button>}
    </div>
  )
}

export default AddRooms