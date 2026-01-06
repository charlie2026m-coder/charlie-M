'use client'
import { formatReservations, calculateNights, extraTooltip, getExtraPrice } from '@/lib/utils';
import { useBookingStore } from '@/store/useBookingStore'
import { BiSolidLike } from "react-icons/bi";
import { UrlParams } from "@/types/apaleo";
import { RoomOffer } from '@/types/offers';
import { TAX_RATE } from '@/lib/Constants';
import { useStore } from '@/store/useStore';
import { Button } from "@/app/_components/ui/button";
import { Room } from '@/types/types';
import CustomTooltip from '@/app/_components/ui/CustomTooltip';
import ChangeDate from './ChangeDate';
import AddRooms from './AddRooms';
import Price from "@/app/_components/ui/price";

const BookingMenu = ({
  rooms: roomsOffers,
  params,
  filledRooms,
}: {
  rooms: RoomOffer[]
  params: UrlParams
  filledRooms: Room[]
}) => {
  const { from, to } = params
  const nights = calculateNights(from as string, to as string)
  const setValue = useStore( state => state.setValue)
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

  //calculate total price for rooms and extras
  const roomsTotalPrice = rooms.reduce((acc, _) => acc + price, 0)
  const extrasTotalPrice = flatExtras.reduce((acc, extra) => acc + extra.totalPrice, 0)
  
  const taxPrice = roomsTotalPrice * TAX_RATE / 100
  const totalPrice = roomsTotalPrice + extrasTotalPrice + taxPrice
 

  const goNext = () => {
    // Pass existing booking to preserve booker data
    const reservations = formatReservations(
      from as string, 
      to as string, 
      roomDetails, 
      updatedRooms, 
    )
    setBooking({ reservations })

    setValue(2,'bookingPage')
  }


  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl'>
      <ChangeDate arrival={roomsOffers[0].arrival} departure={roomsOffers[0].departure} />
      <AddRooms filledRooms={filledRooms} availableUnits={roomsOffers[0].availableUnits} />

      <div className='flex flex-col'>
        <span className='font-semibold mb-1.5 '>Price:</span>
        <div className='flex flex-col gap-1 mb-5'>
          {rooms.map((_, index) => (
            <div key={index} className='flex items-center gap-2 inter text-sm text-dark'>
              <span className=' truncate overflow-hidden whitespace-nowrap '>Room {index + 1}</span>
              <span>€ {roomDetails.averagePrice}</span>x<span>{nights} {getText(nights)}</span>
              <span className='text-bale font-semibold ml-auto'>€ {price}</span>
            </div>
          ))}
          <div  className='flex items-center gap-2 inter text-sm text-dark mt-2'>
            <span>City tax:</span>
            <span className='text-bale font-semibold ml-auto'>€ {taxPrice.toFixed(2)}</span>
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
                      <span className='text-bale font-semibold ml-auto'>€ {extra.totalPrice}</span>
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
          <Price price={totalPrice.toFixed(2)} />
      </div>
      <div className='flex justify-center p-1 bg-[#FFC10733] rounded-full  text-[#D78426] mb-4'>
        <BiSolidLike className='size-6 text-[#D78426]' />
        -10% cheaper than on booking.com 
      </div>
      <Button 
        className='w-full h-[55px]'
        onClick={goNext}
      >Book Now</Button>  
    </div>
  )
}

export default BookingMenu