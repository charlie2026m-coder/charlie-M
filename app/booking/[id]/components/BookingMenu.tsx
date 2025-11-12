
import { Separator } from "@/app/_components/ui/separator"
import { MdOutlineWatchLater } from "react-icons/md";
import { Button } from "@/app/_components/ui/button";
import { DateRange } from "react-day-picker";
import dayjs from "dayjs";
import AddRooms from "./AddRooms";
import { useState } from "react";
import { FiInfo } from "react-icons/fi";
import Price from "@/app/_components/ui/price";
import { BiSolidLike } from "react-icons/bi";

const BookingMenu = ({
  dateRange,
  extras,
}: {
  dateRange: DateRange
  extras: { image: string, title: string, price: number }[]
}) => {
  
  const [rooms, setRooms] = useState([
    {
      id:0,
      image: '/images/room.jpg',
      name: 'Room X',
      guests: { adults: 1, children: 0 },
      price: 100,
      days: 5,
    }
  ])
  const tax = 85;
  const total = Number((extras.reduce((acc, item) => acc + item.price, 0) + rooms.reduce((acc, item) => acc + item.price * item.days, 0) + tax)).toFixed(2);
  console.log(total);
  const getText = (days: number) => days === 1 ? 'night' : 'nights'

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl'>
      <div className='flex '>
        <div className='flex flex-col gap-2 items-center w-1/2'>
          <span>Check in</span>
          <span className='text-lg font-bold'>{dayjs(dateRange.from).format('DD MMM YYYY')}</span>
          <div className='flex items-center gap-1'>
            <MdOutlineWatchLater className='size-5 text-blue' />
            <span>11:30 - 14:30</span>
          </div>
        </div>
        <Separator orientation="vertical" />
        <div className='flex flex-col gap-2 items-center w-1/2'>
          <span>Check out</span>
          <span className='text-lg font-bold'>{dayjs(dateRange.to).format('DD MMM YYYY')}</span>
          <div className='flex items-center gap-1'>
            <MdOutlineWatchLater className='size-5 text-blue' />
            <span>11:30 - 14:30</span>
          </div>
        </div>
      </div>
      <AddRooms 
        rooms={rooms}
        setRooms={setRooms}
      />

      <div className='flex flex-col'>
        <span className='font-semibold mb-1.5 text-[15px]'>Price:</span>
        <div className='flex flex-col gap-1 mb-5'>
          {rooms.map(item => (
            <div key={item.id} className='flex items-center gap-2 inter text-sm text-dark'>
              <span className='font-semibold'>{item.name}</span>
              <span>{item.price}</span>x<span>{item.days} {getText(item.days)}</span>
              <span className='text-bale font-semibold ml-auto'>€ {item.price * item.days}</span>
            </div>
          ))}
            <div  className='flex items-center gap-2 inter text-sm text-dark'>
              <span className='font-semibold'>Tax</span>
              <span className='text-bale font-semibold ml-auto'>€ 85</span>
            </div>
        </div>
      </div>
      {
        extras.length > 0 && (
          <div className='flex flex-col mb-5'>
            <span className='font-semibold mb-1.5 text-[15px]'>Extras:</span>
              {extras.map(item => (
                <div key={item.title} className='flex items-center justify-between gap-2 inter text-sm pb-1 text-dark'>
                  <div className=' flex items-center ' >
                    {item.title}
                    <FiInfo className='size-5 text-brown ml-2 cursor-pointer' />
                  </div>
                  <button className='text-red-600 hover:text-red-500/80 transition-all duration-300 cursor-pointer'>Remove</button>
                </div>
              ))}
              <div className='flex items-center justify-between gap-2 inter text-sm text-dark mt-2'>
                <div className=' flex items-center ' >
                  Total:
                </div>
                <span className='text-bale font-semibold ml-auto'>€ {extras.reduce((acc, item) => acc + item.price, 0)}</span>
              </div>

          </div>
        )
      }
      <div className='flex items-center justify-between mb-3'>
          <span className='font-semibold text-lg'>Total:</span>
          <Price price={total} />
      </div>
      <div className='flex justify-center p-1 bg-[#FFC10733] rounded-full text-sm text-[#D78426] mb-4'>
        <BiSolidLike className='size-5 text-[#D78426]' />
        -10% cheaper than on booking.com 
      </div>
      <Button className='w-full h-[55px]'>Book Now</Button>  
    </div>
  )
}

export default BookingMenu