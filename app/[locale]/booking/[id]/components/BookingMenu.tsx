'use client'
import { formatReservations, calculateNights, extraTooltip, getExtraPrice } from '@/lib/utils';
import { useBookingStore } from '@/store/useBookingStore'
import { UrlParams } from "@/types/apaleo";
import { RoomOffer } from '@/types/offers';
import { Button } from "@/app/_components/ui/button";
import { Room } from '@/types/types';
import CustomTooltip from '@/app/_components/ui/CustomTooltip';
import ChangeDate from './ChangeDate';
import AddRooms from './AddRooms';
import Price from "@/app/_components/ui/price";
import { useRouter, useParams } from 'next/navigation';

const BookingMenu = ({
  rooms: roomsOffers,
  params,
  filledRooms,
  isKidsBedAvailable = true
}: {
  rooms: RoomOffer[]
  params: UrlParams
  filledRooms: Room[]
  isKidsBedAvailable?: boolean
}) => {
  const router = useRouter()
  const urlParams = useParams()
  const { from, to } = params
  const nights = calculateNights(from as string, to as string)
  const { setBooking } = useBookingStore()
  const rooms = useBookingStore(state => state.rooms) || roomsOffers
  const roomDetails = useBookingStore(state => state.roomDetails) || roomsOffers[0]
  const price = roomDetails.price || 0

  const updatedRooms = rooms.map(room => {
    const updateExtras = room.extras?.map(extra => {
      return {
        ...extra,
        totalPrice: getExtraPrice(extra, room.adults + room.children, nights, from as string, to as string),
      }
    })
    return {
      ...room,
      extras: updateExtras,
    }
  })


  const flatExtras = updatedRooms.flatMap(room => room.extras || [])
  const getText = (days: number) => days === 1 ? 'night' : 'nights'

  // Calculate price for each room based on guest count
  const calculateRoomPrice = (adultsCount: number) => {
    const maxPersons = roomDetails.maxPersons || 2;
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    
    if (adultsCount === 1) {
      return roomDetails.price || 0;
    } else if (adultsCount % 2 === 0) {
      return roomsNeeded * (roomDetails.priceForTwo || roomDetails.price || 0);
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      return (doubleRooms * (roomDetails.priceForTwo || roomDetails.price || 0)) + (roomDetails.price || 0);
    }
  };

  // Calculate total price for all rooms based on their guest counts
  const roomsTotalPrice = rooms.reduce((acc, room) => acc + calculateRoomPrice(room.adults), 0);
  const extrasTotalPrice = flatExtras.reduce((acc, extra) => acc + extra.totalPrice, 0)
  
  const totalPrice = roomsTotalPrice + extrasTotalPrice
 

  const goNext = () => {
    const reservations = formatReservations(
      from as string, 
      to as string, 
      roomDetails, 
      updatedRooms as Room[], 
    )
    setBooking({ 
      reservations,
      totalAmount: totalPrice
    })

    router.push(`/${urlParams.locale}/booking/${urlParams.id}/payment`)
  }


  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl'>
      <ChangeDate arrival={roomsOffers[0].arrival} departure={roomsOffers[0].departure} />
      <AddRooms filledRooms={filledRooms} availableUnits={roomsOffers[0].availableUnits} isKidsBedAvailable={isKidsBedAvailable} />

      <div className='flex flex-col'>
        <span className='font-semibold mb-1.5 '>Price:</span>
        <div className='flex flex-col gap-1 mb-5'>
          {rooms.map((room, index) => {
            const roomPrice = calculateRoomPrice(room.adults);
            return (
              <div key={index} className='flex items-center gap-2 inter text-sm text-dark'>
                <span className=' truncate overflow-hidden whitespace-nowrap '>Room {index + 1} ({room.adults} {room.adults === 1 ? 'guest' : 'guests'})</span>
                <span>€ {roomDetails.averagePrice}</span>x<span>{nights} {getText(nights)}</span>
                <span className='text-bale font-semibold ml-auto'>€ {roomPrice}</span>
              </div>
            )
          })}
          <div  className='flex items-center gap-2 inter text-sm text-dark mt-2'>
            <span>City tax:</span>
            <span className='text-bale font-semibold ml-auto'>7.5%</span>
          </div>
        </div>
        {flatExtras.length > 0 && <>
          <span className='font-semibold mb-1.5 '>Extras:</span>
          {updatedRooms.map((room, index) => {
            return (
              <div key={index} className='flex flex-col gap-1 mb-2'>
                {room.extras?.map(extra => {
                  return (
                    <div key={extra.id} className='flex items-center gap-2 inter text-sm text-dark'>
                      <div className=' truncate overflow-hidden whitespace-nowrap flex items-center'>
                        Room {index + 1} - {extra.name}
                        <CustomTooltip className='self-center ml-2' text={extraTooltip(extra)}/>
                      </div>
                      <span className='text-bale font-semibold ml-auto'>€ {extra.totalPrice.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </>}
      </div>

      <div className='flex items-center justify-between mb-3'>
          <span className='font-semibold text-lg'>Total price:</span>
          <Price price={Number(totalPrice.toFixed(2))} />
      </div>

      <Button 
        className='w-full h-[55px]'
        onClick={goNext}
      >Book Now</Button>  
    </div>
  )
}

export default BookingMenu