'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Guests } from '@/app/_components/ui/guests'
import { Button } from '@/app/_components/ui/button'
import { Checkbox } from '@/app/_components/ui/checkbox'
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
  const extras = useBookingStore(state => state.extras)
  const setRooms = useBookingStore(state => state.setRooms)
  const addRoom = useBookingStore(state => state.addRoom)
  const removeRoom = useBookingStore(state => state.removeRoom)
  const state = useMemo(() => {
    if (rooms && rooms.length > 0) return rooms
    return filledRooms || []
  }, [rooms, filledRooms])



  const maxPersons = roomDetails?.maxPersons || 2
  
  const totalChildren = state.reduce((acc, room) => acc + (room.children || 0), 0)
  const maxBabyBeds = babyBedAvailability?.count || 0
  
  const babyBedService = extras?.find(extra => extra.id === 'CMH-BAB')

  const selectedBabyBeds = state.reduce((acc, room) => {
    const hasBabyBed = room.extras?.some(e => e.id === 'CMH-BAB');
    return acc + (hasBabyBed ? 1 : 0);
  }, 0);
  
  const availableBabyBeds = Math.max(0, maxBabyBeds - selectedBabyBeds);
  
  const toggleCrib = (roomId: string, checked: boolean) => {
    if (!babyBedService) return

    const updatedRooms = state.map((room) => {
      if (room.id !== roomId) return room

      const currentExtras = room.extras || []
      const hasBabyBed = currentExtras.some((extra) => extra.id === 'CMH-BAB')

      if (checked && !hasBabyBed) {
        return { ...room, extras: [...currentExtras, { ...babyBedService }] }
      }

      if (!checked && hasBabyBed) {
        return { ...room, extras: currentExtras.filter((extra) => extra.id !== 'CMH-BAB') }
      }

      return room
    })

    setRooms(updatedRooms)
  }

  const addGuests = (id: string, guests: { adults: number, children: number }) => {
    if (guests.adults > maxPersons) return console.warn(`Cannot add more than ${maxPersons} adults per room`);
    const currentRoomChildren = state.find(r => r.id === id)?.children || 0
    const newTotalChildren = totalChildren - currentRoomChildren + guests.children
    
    if (isKidsBedAvailable && maxBabyBeds > 0 && newTotalChildren > maxBabyBeds) return console.warn(`Cannot add more than ${maxBabyBeds} children (baby beds available: ${availableBabyBeds})`);
    if (isKidsBedAvailable && maxBabyBeds > 0 && guests.children > 0 && availableBabyBeds === 0)  return console.warn('No baby beds available');
    
    const updatedRooms = state.map((room) => {
      if (room.id === id) {
        const updatedRoom = { ...room, adults: guests.adults, children: guests.children }
        const currentExtras = room.extras || []
        const hadChildrenBefore = room.children > 0
        const hasChildrenNow = guests.children > 0
        const isAddingBaby = !hadChildrenBefore && hasChildrenNow
        
        if (isAddingBaby && isKidsBedAvailable && babyBedService) {
          const hasBabyBed = currentExtras.some(e => e.id === 'CMH-BAB')
          
          if (!hasBabyBed) {
            updatedRoom.extras = [...currentExtras, { ...babyBedService }]
          } else {
            updatedRoom.extras = currentExtras
          }
        } else if (!hasChildrenNow) {
          updatedRoom.extras = currentExtras.filter(e => e.id !== 'CMH-BAB')
        } else {
          updatedRoom.extras = currentExtras
        }
        
        return updatedRoom
      }
      return room
    })
    
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
        const hasCribSelected = room.extras?.some((extra) => extra.id === 'CMH-BAB') ?? false
        const selectedBedsWithoutCurrent = selectedBabyBeds - (hasCribSelected ? 1 : 0)
        const availableBedsForCurrentRoom = Math.max(0, maxBabyBeds - selectedBedsWithoutCurrent)
        const canEnableCrib = availableBedsForCurrentRoom > 0
        const isCribDisabled = !isKidsBedAvailable || !babyBedService || room.children === 0 || (!hasCribSelected && !canEnableCrib)
        return (  
          <div key={room.id} className={`flex flex-col gap-2  border-gray ${isLast ? '' : 'border-b'}`}>
            <div className='flex gap-2 mb-3 items-center'>
              <Image 
                src={roomDetails?.images?.[0] || '/images/room1.webp'} 
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
                  maxChildrenPerRoom={1}
                />
              }
              {state.length > 1 && <HiOutlineTrash className='size-6 cursor-pointer text-red-700 self-center' onClick={() => handleRemoveRoom(room.id)} />}
            </div>
            {room.children > 0 && (
              <label className='mb-3 flex items-start gap-2 text-sm text-dark'>
                <Checkbox
                  checked={hasCribSelected}
                  disabled={isCribDisabled}
                  onCheckedChange={(checked) => toggleCrib(room.id, checked === true)}
                  aria-label={t('cribOption')}
                />
                <div className='leading-5'>
                  <span className='font-medium'>{t('cribOption')}</span>
                  <p className='text-xs text-gray-500'>
                    {!canEnableCrib && !hasCribSelected
                      ? t('cribUnavailable')
                      : t('cribVisibleInExtras')}
                  </p>
                </div>
              </label>
            )}

          </div>
        )
      })}
      {leftRooms > 0 && <Button variant="outline" className='w-full' onClick={addRoom}>+ {t('addRoom')} ({leftRooms} {t('left')})</Button>}
    </div>
  )
}

export default AddRooms