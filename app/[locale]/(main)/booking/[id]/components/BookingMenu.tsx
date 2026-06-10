'use client'
import { formatReservations, calculateNights, getExtraPrice } from '@/lib/utils'
import { useBookingStore } from '@/store/useBookingStore'
import { UrlParams } from "@/types/apaleo";
import { RoomOffer } from '@/types/offers';
import { Button } from "@/app/_components/ui/button";
import { Room } from '@/types/types';
import ChangeDate from './ChangeDate';
import AddRooms from './AddRooms';
import Price from "@/app/_components/ui/price";
import { useParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { Spinner } from '@/app/_components/ui/spinner';
import TaxesInfo from '@/app/_components/ui/Taxes';
import { useState } from 'react';
import { calculateTotalTaxes } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

const BookingMenu = ({
  rooms: roomsOffers,
  params,
  filledRooms,
  isKidsBedAvailable = true,
  babyBedAvailability,
}: {
  rooms: RoomOffer[]
  params: UrlParams
  filledRooms: Room[]
  isKidsBedAvailable?: boolean
  babyBedAvailability?: { isAvailable: boolean; count: number }
}) => {
  const t = useTranslations('bookingForm')
  const tCommon = useTranslations()
  const router = useRouter()
  const urlParams = useParams()
  const { from, to } = params
  const nights = calculateNights(from as string, to as string)
  const setBooking = useBookingStore(state => state.setBooking)
  const booking = useBookingStore(state => state.booking)
  const editRoom = useBookingStore(state => state.editRoom)
  const rooms = useBookingStore(state => state.rooms) || roomsOffers
  const roomDetails = useBookingStore(state => state.roomDetails) || roomsOffers[0]
  const [isLoading, setIsLoading] = useState(false)

  if (!roomDetails || !rooms || rooms.length === 0) return <div className="p-5 text-center">{tCommon('loading')}</div>

  const removeRoomExtra = (roomId: string, extraId: string) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room) return
    editRoom(roomId, { ...room, extras: room.extras?.filter(e => e.id !== extraId) || [] })
  }

  console.log('🛏️ Booking menu rooms:', rooms)

  const updatedRooms = rooms.map(room => ({
    ...room,
    extras: room.extras?.map(extra => ({
      ...extra,
      totalPrice: getExtraPrice(extra, room.adults + room.children, nights, from as string, to as string),
    })),
  }));

  const extrasTotalPrice = updatedRooms.reduce((acc, room) =>
    acc + (room.extras?.reduce((sum, extra) => sum + (extra.totalPrice || 0), 0) || 0), 0
  );

  const getText = (days: number) => days === 1 ? t('night') : t('nights')

  const maxPersons = roomDetails.maxPersons || 2
  const price = roomDetails.price || 0
  const priceForTwo = roomDetails.priceForTwo || price
  const oneNightPrice = roomDetails.oneNightPrice || 0
  const oneNightPriceForTwo = roomDetails.oneNightPriceForTwo || oneNightPrice

  // City tax is baked into price/priceForTwo — no separate addition
  const calculateRoomPrice = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    if (adultsCount === 1) return price;
    if (adultsCount % 2 === 0) return roomsNeeded * priceForTwo;
    return Math.floor(adultsCount / 2) * priceForTwo + price;
  };

  const roomsTotalPrice = rooms.reduce((acc, room) => acc + calculateRoomPrice(room.adults), 0);
  const totalPrice = Math.round((roomsTotalPrice + extrasTotalPrice) * 100) / 100

  const totalTaxes = roomDetails.taxes
    ? calculateTotalTaxes(rooms, roomDetails.taxes, maxPersons)
    : null;
 

  const goNext = () => {
    setIsLoading(true)
    const { reservations, totalAmount } = formatReservations(
      from as string,
      to as string,
      roomDetails,
      updatedRooms as Room[]
    )
    setBooking({
      ...(booking?.booker && { booker: booking.booker }),
      reservations,
      totalAmount,
    })

    router.push(`/booking/${urlParams.id}/payment`, { scroll: true })
  }


  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 border'>
      <ChangeDate arrival={roomsOffers[0].arrival} departure={roomsOffers[0].departure} />
      <AddRooms filledRooms={filledRooms} availableUnits={roomsOffers[0].availableUnits} isKidsBedAvailable={isKidsBedAvailable} babyBedAvailability={babyBedAvailability} />

      <div className='flex flex-col'>
        <span className='font-semibold mb-1.5 '>{t('price')}</span>
        <div className='flex flex-col gap-1 mb-5'>
          {rooms.map((room, index) => {
            const roomPrice = calculateRoomPrice(room.adults);
            // Calculate price per night for this room
            const pricePerNight = room.adults === 1 ? oneNightPrice : oneNightPriceForTwo;
            
            return (
              <div key={index} className='flex items-center gap-2 inter text-sm text-dark'>
                <span className=' truncate overflow-hidden whitespace-nowrap '>{t('room')} {index + 1} ({room.adults} {room.adults === 1 ? t('guest') : t('guests')})</span>
                <span>€ {pricePerNight}</span>x<span>{nights} {getText(nights)}</span>
                <span className='text-bale font-semibold ml-auto'>€ {roomPrice.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
        {updatedRooms.some(room => room.extras && room.extras.length > 0) && <>
          <span className='font-semibold mb-1.5 '>{t('addExtras')}</span>
          <div className='flex flex-col gap-1 mb-5'>
            {updatedRooms.map((room, index) => {
              if (!room.extras || room.extras.length === 0) return null;
              
              return (
                <div key={index} className='flex flex-col gap-1'>
                  {updatedRooms.length > 1 && (
                    <span className=' mt-2'>{t('room')} {index + 1}</span>
                  )}
                  {room.extras.map(extra => {
                    const serviceName = extra.name;
                    let displayText = serviceName;
                    
                    if (extra.selectedDates && extra.selectedDates.length > 0) {
                      const totalCount = extra.selectedDates.reduce((sum, date) => sum + date.count, 0);
                      displayText = `${serviceName} (x${totalCount})`;
                    } else if (extra.count && extra.count > 1) {
                      displayText = `${serviceName} (x${extra.count})`;
                    }
                    
                    return (
                      <div key={extra.id} className='flex items-center gap-2 inter text-sm text-dark'>
                        <div className='truncate overflow-hidden whitespace-nowrap'>
                          {displayText}
                        </div>
                        <span className='text-bale font-semibold ml-auto whitespace-nowrap'>€ {(extra.totalPrice || 0).toFixed(2)}</span>
                        <button
                          onClick={() => removeRoomExtra(room.id, extra.id)}
                          className='text-red-400 hover:text-red-600 transition-colors flex-shrink-0 cursor-pointer'
                          type='button'
                        >
                          <Trash2 className='size-3.5' />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          
          <div className='flex items-center justify-between gap-2 inter text-sm text-dark mb-2'>
            <span>{t('total')}</span>
            <span className='text-bale font-semibold'>€ {extrasTotalPrice.toFixed(2)}</span>
          </div>
        </>}
      </div>

      <div className='flex items-center justify-between mb-3'>
          <span className='font-semibold text-lg'>{t('totalPrice')}</span>
          <Price price={totalPrice} />
      </div>
      <TaxesInfo taxes={totalTaxes} className='mb-3' />


      <Button 
        className='w-full h-[55px]'
        onClick={goNext}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className='flex items-center gap-2'>
            <Spinner className='size-4' />
            {tCommon('loading')}
          </span>
        ) : t('bookNow')}
      </Button>  
    </div>
  )
}

export default BookingMenu