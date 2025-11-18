'use client'
import { useBookingStore } from '@/store/bookingStore'

import { Separator } from "@/app/_components/ui/separator"
import { MdOutlineWatchLater } from "react-icons/md";
import { Button } from "@/app/_components/ui/button";
import dayjs from "dayjs";
import { FiInfo } from "react-icons/fi";
import Price from "@/app/_components/ui/price";
import { BiSolidLike } from "react-icons/bi";
import { Beds24RoomType, UrlParams } from "@/types/beds24";
import { useEffect } from 'react';
import { Booking } from '@/store/bookingStore';
import { getPriceData } from '@/lib/utils';
import AddRooms from './AddRooms';
import Image from 'next/image';
import { getExtrasPrice, getPeriodText, getPerText } from '@/lib/utils';
import { TAX_RATE } from '@/lib/Constants';

const BookingMenu = ({
  room,
  params,
  filledRooms,
}: {
  room: Beds24RoomType
  params: UrlParams
  filledRooms: { id: number; adults: number; children: number }[]
}) => {

  const { booking, setBooking, dateRange, guests, setValue } = useBookingStore()

  const { 
    nights, 
    roomsNeeded, 
    price 
  } = getPriceData({
    params: { 
      from: params.from || dateRange.from || undefined, 
      to: params.to || dateRange.to || undefined, 
      adults: params.adults || booking.guests.adults.toString() || guests.adults.toString() || undefined, 
      children: params.children || booking.guests.children.toString() || guests.children.toString() || undefined 
    }, 
    room 
  })
  
  useEffect(() => {
    // Update booking only if params actually changed
    const paramsChanged = 
      booking.roomId !== room.id ||
      booking.arrival !== params.from ||
      booking.departure !== params.to ||
      !booking.roomId // First time (id is undefined)
  
    if (paramsChanged) {
      
      setBooking((prev: Booking) => ({
        ...prev,
        roomId: room.id,
        status: 'new',
        arrival: params.from || dateRange.from || undefined,
        departure: params.to || dateRange.to || undefined, 
        title: room.name,

        rooms: filledRooms,
        name: room.name,
        price: room.minPrice, 
        nights: nights,
        roomsAmount: roomsNeeded,
        guests: { adults: Number(params.adults), children: Number(params.children) },
      }))
    }
  }, [room.id, params.from, params.to, nights, roomsNeeded])



  const getText = (days: number) => days === 1 ? 'night' : 'nights'

  //calculate total price for rooms and extras
  const totalForRooms = Number(price)
  const totalExtrasPrice = booking.extras.reduce((acc, item) => acc + getExtrasPrice(item, booking.roomsAmount, booking.guests, booking.nights), 0)
  const totalPrice = totalForRooms + totalExtrasPrice + TAX_RATE

  const goNext = () => {
    setBooking({ ...booking, totalPrice: totalPrice })
    setValue(2,'bookingPage')
  }

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl'>
      <div className='flex '>
        <div className='flex flex-col gap-2 items-center w-1/2'>
          <span>Check in</span>
          <span className='text-lg font-bold'>{dayjs(params.from).format('DD MMM YYYY')}</span>
          <div className='flex items-center gap-1'>
            <MdOutlineWatchLater className='size-5 text-blue' />
            <span>11:30 - 14:30</span>
          </div>
        </div>
        <Separator orientation="vertical" />
        <div className='flex flex-col gap-2 items-center w-1/2'>
          <span>Check out</span>
          <span className='text-lg font-bold'>{dayjs(params.to).format('DD MMM YYYY')}</span>
          <div className='flex items-center gap-1'>
            <MdOutlineWatchLater className='size-5 text-blue' />
            <span>11:30 - 14:30</span>
          </div>
        </div>
      </div>
      <AddRooms maxAdults={room.adults} maxChildren={room.children} />

      <div className='flex flex-col'>
        <span className='font-semibold mb-1.5 text-[15px]'>Price:</span>
        <div className='flex flex-col gap-1 mb-5'>
          {booking.rooms.map((item, index) => (
            <div key={index} className='flex items-center gap-2 inter text-sm text-dark'>
              <span className='font-semibold truncate overflow-hidden whitespace-nowrap w-1/2'>{booking.name}</span>
              <span>{booking.price}</span>x<span>{booking.nights} {getText(booking.nights)}</span>
              <span className='text-bale font-semibold ml-auto'>€ {booking.price * booking.nights}</span>
            </div>
          ))}
            <div  className='flex items-center gap-2 inter text-sm text-dark'>
              <span className='font-semibold'>Tax</span>
              <span className='text-bale font-semibold ml-auto'>€ {TAX_RATE}</span>
            </div>
        </div>
      </div>
      {
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
      }
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