'use client'
import { useBookingStore } from '@/store/useBookingStore'
import Price from "@/app/_components/ui/price";
import Image from 'next/image';
import { calculateNights, getExtraPrice } from '@/lib/utils'
import { BsCalendar2Fill } from 'react-icons/bs';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import TaxesInfo from '@/app/_components/ui/Taxes';
import { calculateTotalTaxes } from '@/lib/utils';

const SummaryCard = () => {
  const t = useTranslations('summary')
  const tBooking = useTranslations('bookingForm')
  const params = useParams()
  const locale = params.locale as 'en' | 'de'
  const { booking, rooms, roomDetails, reservationIds } = useBookingStore()

  if (!booking || !booking.reservations) {
    return (
      <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl'>
        <h2 className='text-2xl font-bold mb-3 text-center'>{t('title')}</h2>
        <p className='text-center text-gray-500'>{t('noBookingData')}</p>
      </div>
    )
  }

  const { reservations } = booking
  const totalGuests = reservations[0].adults
  const nights = calculateNights(reservations[0].arrival, reservations[0].departure)

  const getText = (days: number) => days === 1 ? tBooking('night') : tBooking('nights')
  
  const maxPersons = roomDetails?.maxPersons || 2;
  const price = roomDetails?.price || 0;
  const priceForTwo = roomDetails?.priceForTwo || price;

  // City tax is baked into price/priceForTwo — no separate addition
  const calculateRoomPrice = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    if (adultsCount === 1) return price;
    if (adultsCount % 2 === 0) return roomsNeeded * priceForTwo;
    return Math.floor(adultsCount / 2) * priceForTwo + price;
  };

  const from = reservations[0].arrival;
  const to = reservations[0].departure;

  const updatedRooms = rooms.map(room => ({
    ...room,
    extras: room.extras?.map(extra => ({
      ...extra,
      totalPrice: getExtraPrice(extra, room.adults + room.children, nights, from, to),
    })),
  }));

  const extrasTotalPrice = updatedRooms.reduce((acc, room) =>
    acc + (room.extras?.reduce((sum, extra) => sum + (extra.totalPrice || 0), 0) || 0), 0
  );

  const roomsTotalPrice = rooms.reduce((acc, room) => acc + calculateRoomPrice(room.adults), 0);
  const totalPrice = Math.round((roomsTotalPrice + extrasTotalPrice) * 100) / 100

  const totalTaxes = roomDetails?.taxes
    ? calculateTotalTaxes(rooms, roomDetails.taxes, maxPersons)
    : null;

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 border self-start col-span-1'>
      <h2 className='text-2xl font-bold mb-3 text-center'>{t('title')}</h2>
      <Image 
        src={roomDetails?.images?.[0] || "/images/room1.webp"} 
        alt="summary" 
        width={327} 
        height={202} 
        className='w-full max-h-[202px] rounded-xl mb-3 object-cover'
      />

      <div className='text-[16px] flex justify-between font-[500] py-3 border-b mb-3'> 
        {t('guests')} <span className='font-bold'>{totalGuests}</span>
      </div>

      <div className='flex flex-col'>
        <span className='font-semibold mb-4 text-[15px]'>{tBooking('price')}</span>
        <div className='flex flex-col gap-1 mb-3'>
          {rooms.map((room, index) => {
            const roomPrice = calculateRoomPrice(room.adults);
            const pricePerNight = roomPrice / nights;
            
            return (
              <div key={room.id} className='flex flex-col gap-1 mb-2'>
                <div className='flex items-center gap-2 inter text-sm text-dark'>
                  <span className='truncate overflow-hidden whitespace-nowrap'>{tBooking('room')} {index + 1} ({room.adults} {room.adults === 1 ? tBooking('guest') : tBooking('guests')})</span>
                  <span>€ {pricePerNight.toFixed(2)}</span>×<span>{nights} {getText(nights)}</span>
                  <span className='text-bale font-bold text-base ml-auto'>€ {roomPrice.toFixed(2)}</span>
                </div>
                <div className='flex gap-2 text-sm '>
                  <BsCalendar2Fill className='size-4 cursor-pointer self-center text-blue' /> {dayjs(room.from).format('DD MMM YYYY')} - {dayjs(room.to).format('DD MMM YYYY')}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {updatedRooms.some(room => room.extras && room.extras.length > 0) && (
        <div className='flex flex-col mb-5'>
          <span className='font-semibold mb-4 text-[15px]'>{tBooking('addExtras')}</span>
          <div className='flex flex-col gap-1 mb-2'>
            {updatedRooms.map((room, index) => {
              if (!room.extras || room.extras.length === 0) return null;

              return (
                <div key={index} className='flex flex-col gap-1'>
                  {updatedRooms.length > 1 && (
                    <span className='text-xs font-semibold text-green mt-2'>{tBooking('room')} {index + 1}</span>
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
            <span>{tBooking('total')}</span>
            <span className='text-bale font-semibold'>€ {extrasTotalPrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      <TaxesInfo taxes={totalTaxes} className='mb-3' />
      <div className='flex items-center justify-between mb-3'>
        <span className='font-semibold text-lg'>{tBooking('totalPrice')}</span>
        <Price price={totalPrice} />
      </div>


      {reservationIds && reservationIds.length > 0 && (
        <div className='flex flex-col border-t pt-3 gap-2'>
          <p className='text-sm text-gray-600'>{t('reservationIdsInfo')}</p>
          <div className='flex flex-col gap-1'>
            {reservationIds.map((id, index) => (
              <div key={id} className='flex items-center justify-between'>
                <span className='text-gray-500 text-sm'>{t('reservation')}{reservationIds.length > 1 ? index + 1 : ''}:</span>
                <span className='font-bold text-base'>{id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SummaryCard
