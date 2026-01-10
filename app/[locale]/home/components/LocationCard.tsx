import { PiMapPinFill } from "react-icons/pi"
import Image from 'next/image'
import { FaWalking } from "react-icons/fa";
import { LiaCarSideSolid } from "react-icons/lia";
import { LiaBusAltSolid } from "react-icons/lia";

export interface Location {
  title: string
  image: string
  distance: string
  walkTime?: string
  carTime?: string
  busTime?: string
  position: { lat: number, lng: number }
}


const LocationCard = ({ item }: { item: Location | null, index: number }) => {
  if(!item) return <MainCard />
  const {  image, distance, walkTime, carTime, busTime, position, title } = item

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${position.lat},${position.lng}`

  return (
    <div className='flex flex-col gap-5 items-center w-1/3'>
      <div className='flex flex-col rounded-[30px] bg-light-bg w-full shadow-xl overflow-hidden'>
        <Image src={image} alt='location' width={457} height={310} className='object-cover max-h-[400px] w-full'/>
        <div className='flex flex-col p-6 gap-3 text-mute'>
          <div className='text-end text-mute px-2 border rounded-full w-fit border-mute'>{distance}</div>
          {carTime && <div className=' flex items-center '>
            <LiaCarSideSolid className='size-6 mr-2' />
            Drive <span className='font-bold ml-auto'>{carTime}</span>
          </div>}
          {busTime && <div className=' flex items-center '>
            <LiaBusAltSolid className='size-6 mr-2' />Public transport <span className='font-bold ml-auto'>{busTime}</span>
          </div>}
          {walkTime && <div className=' flex items-center '>
            <FaWalking className='size-6 mr-2' />Walk <span className='font-bold ml-auto'>{walkTime}</span>
          </div>}
        </div>
      </div>
      <a 
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className=" hover:scale-120 cursor-pointer transition-all duration-300"
      >
        See on Google Maps
      </a>
    </div>
  )
}

export default LocationCard


const MainCard = () => {
  const hotelAddress = "Friedrichstraße 33, 10969 Berlin"
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelAddress)}`

  return (
    <div className='flex flex-col gap-5 items-center w-1/3'>
      <div className='flex flex-col rounded-[30px] bg-light-bg w-full shadow-xl overflow-hidden'>
        <Image src='/images/hotel-image.webp' alt='location' width={457} height={310} />
        <div className='flex flex-col p-6 gap-3 text-mute'>
          <h3 className='gap-2 flex items-center text-[20px] pb-4 border-b font-bold'>
            <PiMapPinFill className='size-5' />
            Friedrichstraße 33, 10969 Berlin
          </h3>
          <span className='gap-2 flex items-center text-[20px] font-bold'>
            Central Station (Hbf):
          </span>
          <div className='flex items-center italic pl-2'>
            <LiaBusAltSolid className='size-6 mr-2' />Public Transport <span className='font-bold ml-auto'>15 min</span>
          </div>
          <div className=' flex items-center italic pl-2'>
            <LiaCarSideSolid className='size-6 mr-2' />
            Taxi <span className='font-bold ml-auto'>10 min</span>
          </div>

          <span className='gap-2 flex items-center text-[20px] font-bold'>
            Berlin Brandenburg Airport (BER):
          </span>
          <div className=' flex items-center italic pl-2'>
            <LiaBusAltSolid className='size-6 mr-2' />Public Transport <span className='font-bold ml-auto'>40 min</span>
          </div>
          <div className=' flex items-center italic pl-2'>
            <LiaCarSideSolid className='size-6 mr-2' />Taxi <span className='font-bold ml-auto'>35 min</span>
          </div>
        </div>
      </div>
      <a 
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-120 cursor-pointer transition-all duration-300"
      >
        See on Google Maps
      </a>
    </div>
  )
}