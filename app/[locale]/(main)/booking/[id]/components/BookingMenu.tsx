'use client'
import { formatReservations, calculateNights } from '@/lib/utils'
import { useBookingStore } from '@/store/useBookingStore'
import { UrlParams } from "@/types/apaleo";
import { RoomOffer } from '@/types/offers';
import { Button } from "@/app/_components/ui/button";
import { Room } from '@/types/types';
import ChangeDate from './ChangeDate';
import AddRooms from './AddRooms';
import Price from "@/app/_components/ui/price";
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Spinner } from '@/app/_components/ui/spinner';
import { useState } from 'react';
import { CITY_TAX_RATE } from '@/lib/Constants';

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
  const locale = urlParams.locale as 'en' | 'de'
  const { from, to } = params
  const nights = calculateNights(from as string, to as string)
  const setBooking = useBookingStore(state => state.setBooking)
  const booking = useBookingStore(state => state.booking)
  const rooms = useBookingStore(state => state.rooms) || roomsOffers
  const roomDetails = useBookingStore(state => state.roomDetails) || roomsOffers[0]
  const [isLoading, setIsLoading] = useState(false)

  if (!roomDetails || !rooms || rooms.length === 0) return <div className="p-5 text-center">{tCommon('loading')}</div>

  console.log('🛏️ Booking menu rooms:', rooms)

  const extrasTotalPrice = rooms.reduce((acc, room) => {
    const roomExtrasTotal = room.extras?.reduce((sum, extra) => sum + (extra.totalPrice || 0), 0) || 0;
    return acc + roomExtrasTotal;
  }, 0);

  const getText = (days: number) => days === 1 ? t('night') : t('nights')

  const maxPersons = roomDetails.maxPersons || 2
  const price = roomDetails.price || 0
  const priceForTwo = roomDetails.priceForTwo || price
  const cityTax = roomDetails.cityTax || Math.round(price * CITY_TAX_RATE * 100) / 100
  const cityTaxForTwo = roomDetails.cityTaxForTwo || Math.round(priceForTwo * CITY_TAX_RATE * 100) / 100
  const oneNightPrice = roomDetails.oneNightPrice || 0
  const oneNightPriceForTwo = roomDetails.oneNightPriceForTwo || oneNightPrice

  const calculateRoomPrice = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    
    if (adultsCount === 1) {
      return price;
    } else if (adultsCount % 2 === 0) {
      return roomsNeeded * priceForTwo;
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      return (doubleRooms * priceForTwo) + price;
    }
  };

  const calculateRoomTax = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    
    if (adultsCount === 1) {
      return cityTax;
    } else if (adultsCount % 2 === 0) {
      return roomsNeeded * cityTaxForTwo;
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      return (doubleRooms * cityTaxForTwo) + cityTax;
    }
  };

  const roomsTotalPrice = rooms.reduce((acc, room) => acc + calculateRoomPrice(room.adults), 0);
  const cityTaxAmount = rooms.reduce((acc, room) => acc + calculateRoomTax(room.adults), 0);
  const totalPrice = Math.round((roomsTotalPrice + cityTaxAmount + extrasTotalPrice) * 100) / 100
 

  const goNext = () => {
    setIsLoading(true)
    const reservations = formatReservations(
      from as string, 
      to as string, 
      roomDetails, 
      rooms as Room[]
    )
    setBooking({ 
      ...(booking?.booker && { booker: booking.booker }),
      reservations,
      totalAmount: totalPrice
    })

    router.push(`/${urlParams.locale}/booking/${urlParams.id}/payment`)
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
        <div  className='flex items-center gap-2 inter text-sm text-dark mt-2'>
          <span>{t('cityTax')}</span>
          <span className='text-bale font-semibold ml-auto'>€ {cityTaxAmount.toFixed(2)}</span>
        </div>
        </div>
        {rooms.some(room => room.extras && room.extras.length > 0) && <>
          <span className='font-semibold mb-1.5 '>{t('addExtras')}</span>
          <div className='flex flex-col gap-1 mb-5'>
            {rooms.map((room, index) => {
              if (!room.extras || room.extras.length === 0) return null;
              
              return (
                <div key={index} className='flex flex-col gap-1'>
                  {rooms.length > 1 && (
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
                        <span className='text-bale font-semibold ml-auto'>€ {(extra.totalPrice || 0).toFixed(2)}</span>
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