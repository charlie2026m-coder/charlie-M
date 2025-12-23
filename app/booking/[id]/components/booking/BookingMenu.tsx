'use client'
import { useBookingStore } from '@/store/useBookingStore'
import { Button } from "@/app/_components/ui/button";
import { FiInfo } from "react-icons/fi";
import Price from "@/app/_components/ui/price";
import { BiSolidLike } from "react-icons/bi";
import { UrlParams } from "@/types/beds24";
import { calculateNights, getPriceData } from '@/lib/utils';
import AddRooms from './AddRooms';
import { getExtrasPrice, getPeriodText, getPerText } from '@/lib/utils';
import { TAX_RATE } from '@/lib/Constants';
import { useStore } from '@/store/useStore';
import { Room, RoomDetails } from '@/types/types';
import { extraItems } from "@/content/content"

const BookingMenu = ({
  room,
  params,
  filledRooms,
}: {
  room: RoomDetails
  params: UrlParams
  filledRooms: Room[]
}) => {
  const { from, to, adults, children } = params

  const { setValue } = useStore()
  const rooms = useBookingStore(state => state.rooms)
  const { price } = getPriceData({ params: { from, to, adults, children }, room  })

  const extras = useBookingStore(state => state.extras)
  console.log(extras,'extras')
  const getText = (days: number) => days === 1 ? 'night' : 'nights'

  //calculate total price for rooms and extras
  const totalForRooms = Number(price)
  // const totalExtrasPrice = booking.extras.reduce((acc, item) => acc + getExtrasPrice(item, booking.roomsAmount, booking.guests, booking.nights), 0)
  // const totalPrice = totalForRooms + totalExtrasPrice + TAX_RATE

  const goNext = () => {
    // setBooking({ ...booking, totalPrice: totalPrice })
    setValue(2,'bookingPage')
  }

  const nights = calculateNights(from as string, to as string)

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl'>
      <AddRooms initialRooms={filledRooms} roomDetails={room} />

      <div className='flex flex-col'>
        <span className='font-semibold mb-1.5 text-[15px]'>Price:</span>
        <div className='flex flex-col gap-1 mb-5'>
            {rooms.map((_, index) => (
              <div key={index} className='flex items-center gap-2 inter text-sm text-dark'>
                <span className='font-semibold truncate overflow-hidden whitespace-nowrap '>Room {index + 1}:</span>
                <span>€ {room.minPrice.toFixed(2)}</span>x<span>{nights} {getText(nights)}</span>
                <span className='text-bale font-semibold ml-auto'>€ {room.minPrice * nights}</span>
              </div>
            ))}
            <div  className='flex items-center gap-2 inter text-sm text-dark'>
              <span className='font-semibold'>Tax</span>
              <span className='text-bale font-semibold ml-auto'>€ {TAX_RATE}</span>
            </div>
        </div>
      </div>
      {/* {
        booking.extras.length > 0 && (
          <div className='flex flex-col mb-5'>
            <span className='font-semibold mb-1.5 text-[15px]'>Extras:</span>
              {booking.extras.map(item => {
                const fullPrice = getExtrasPrice(item, booking.roomsAmount, booking.guests, booking.nights)
                const periodText = getPeriodText(item, booking.nights)
                const perText = getPerText(item, booking.roomsAmount, booking.guests)

                return (
                  <div key={item.index} className='flex flex-col gap-1 inter text-sm pb-1 text-dark'>
                    <div className='flex justify-between'>
                      <div className=' flex items-center ' >
                        {item.name}<FiInfo className='size-5 text-brown ml-2 cursor-pointer' />
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-bold'>€ {fullPrice}</span>
                        <Image
                          src="/images/delete-icon.svg" 
                          alt="close" 
                          width={20} 
                          height={20} 
                          className='size-5 cursor-pointer' 
                          onClick={() => setBooking({ ...booking, extras: booking.extras.filter((extra) => extra.index !== item.index) })} 
                        />  
                      </div>
                    </div>
                    <span className='text-xs text-brown pl-2'>{periodText} x {perText}</span>
                  </div>
                )})}
              <div className='flex items-center justify-between gap-2 inter text-sm text-dark mt-2'>
                <div className=' flex items-center ' >
                  Total:
                </div>
                <span className='text-bale font-semibold ml-auto'>€ {booking.extras.reduce((acc, item) => acc + getExtrasPrice(item, booking.roomsAmount, booking.guests, booking.nights), 0)}</span>
              </div>
          </div>
        )
      } */}
      <div className='flex items-center justify-between mb-3'>
          <span className='font-semibold text-lg'>Total price:</span>
          {/* <Price price={totalPrice.toFixed(2)} /> */}
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