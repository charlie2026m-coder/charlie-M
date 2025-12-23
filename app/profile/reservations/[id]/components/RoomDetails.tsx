'use client'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/app/_components/ui/ClientDialog";
import { PiMapPinFill } from "react-icons/pi";
import { RiSofaFill } from "react-icons/ri";
import ImagesSlider from './ImagesSlider'
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow'
import Amenities from './Amenities'

export const RoomDetailsButton = ({ reservation }: { reservation: any }) => {
  const images = [
    '/images/room1.webp',
    '/images/room2.webp',
    '/images/room3.webp',
    '/images/room1.webp',
    '/images/room2.webp',
    '/images/room3.webp',
    '/images/room1.webp',
    '/images/room2.webp',
  ]
  return (
    <>
      <Dialog>
        <DialogTrigger className='flex gap-2 items-center  rounded-full border border-black cursor-pointer hover:opacity-60 h-[35px] text-sm px-5 gap-2 justify-start w-full'>
          <RiSofaFill />Room info
        </DialogTrigger>
        <DialogContent className='w-[90%] max-w-[600px] px-4 rounded-3xl gap-0 max-h-[90vh] overflow-y-auto'>
          <DialogHeader className='mb-7'>
            <DialogTitle className='text-center'>Room info</DialogTitle>
          </DialogHeader>
            <h2 className='text-2xl font-bold jakarta mb-1'>{reservation.name}</h2>
            <div className='flex gap-1 items-center text-sm mb-4'>
              <PiMapPinFill className='size-6 min-w-6' />
              <span>Friedrichstraße 33, 10969 Berlin</span>
            </div>
          <ImagesSlider images={images} />
          <div className='flex flex-col lg:flex-row gap-2 lg:items-center mb-5'>
            <div className='flex px-2.5 rounded-full border border-red py-1 text-sm w-fit'>Category A</div>
            <RoomParamsRow item={reservation} />
          </div>
          <Amenities />
          <p className='text-mute text-sm mt-5'>
            { reservation.description }
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
