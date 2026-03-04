'use client'
import { PiMapPinFill } from "react-icons/pi"
import Image from 'next/image'
import { FaWalking } from "react-icons/fa";
import { LiaCarSideSolid } from "react-icons/lia";
import { LiaBusAltSolid } from "react-icons/lia";
import { useTranslations } from 'next-intl'

export interface Location {
  title: string
  mapImage: string
  image: string
  distance: string
  walkTime?: string
  carTime?: string
  busTime?: string
  position: { lat: number, lng: number }
}


const LocationCard = ({ item }: { item: Location | null, index: number }) => {
  const t = useTranslations('locationCard')
  if(!item) return <MainCard />
  const {  image, distance, walkTime, carTime, busTime, position, title } = item

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${position.lat},${position.lng}`

  return (
    <div className='flex flex-col gap-5 items-center  w-full md:w-1/2 lg:w-1/3 z-10'>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className='flex md:flex-col rounded-xl md:rounded-[30px] bg-[rgba(255,255,255,0.8)] md:bg-light-bg w-full md:shadow-xl overflow-hidden hover:scale-102 transition-all duration-300 cursor-pointer'
      >
        <div className='relative w-1/2 md:w-full md:flex-1 min-h-[200px] md:min-h-[400px]'>
          <Image src={image} alt='location' fill className='object-cover object-center'/>
        </div>
        <div className='flex flex-col p-2.5 md:p-6 gap-2 md:gap-3 text-mute flex-1'>
          <div className='text-end text-mute px-2 border rounded-full w-fit border-mute'>{distance}</div>
          {carTime && <div className=' flex  text-xs md:text-base '>
            <LiaCarSideSolid className='hidden md:block size-6 mr-2' />
            {t('drive')} <span className='font-bold ml-auto min-w-10'>{carTime}</span>
          </div>}
          {busTime && <div className=' flex  text-xs md:text-base '>
            <LiaBusAltSolid className='hidden md:block size-6 mr-2' />{t('publicTransport')} <span className='font-bold ml-auto min-w-10 '>{busTime}</span>
          </div>}
          {walkTime && <div className=' flex  text-xs md:text-base '>
            <FaWalking className='hidden md:block size-6 mr-2' />{t('walk')} <span className='font-bold ml-auto min-w-10'>{walkTime}</span>
          </div>}
        </div>
      </a>
      <a 
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className=" hover:scale-120 cursor-pointer transition-all duration-300 underline"
      >
        {t('seeOnGoogleMaps')}
      </a>
    </div>
  )
}

export default LocationCard


const MainCard = () => {
  const t = useTranslations('locationCard')
  const hotelAddress = "Friedrichstraße 33, 10969 Berlin"
  const googleMapsUrl = 'https://maps.app.goo.gl/f5pcoqnd5V6NTwAw6'

  return (
    <div className='flex flex-col gap-5 items-center w-full md:w-1/2 xl:w-1/3 min-w-[460px]'>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className='flex md:flex-col rounded-xl bg-[rgba(255,255,255,0.8)] md:rounded-[30px] md:bg-light-bg w-full md:shadow-xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer'
      >
        <div className='relative w-1/2 md:w-full md:flex-1 min-h-[200px] md:min-h-[400px]'>
          <Image src='/images/hotel-image.webp' alt='location' fill className='object-cover object-center'/>
        </div>
        <div className='flex flex-col p-2.5 md:p-6 gap-2 md:gap-3 text-mute'>
          <h3 className='gap-2 flex text-xs md:text-[20px] pb-4 border-b font-bold'>
            <PiMapPinFill className='size-5 min-w-5 mt-0.5' />
            {hotelAddress}
          </h3>
          <span className='gap-2 flex items-center text-xs md:text-[20px] font-bold'>
            {t('centralStation')}
          </span>
          <div className='flex text-xs md:text-base italic md:pl-2'>
            <LiaBusAltSolid className='hidden md:block size-6 mr-2' />{t('publicTransport')} <span className='font-bold ml-auto min-w-10'>15 min</span>
          </div>
          <div className=' flex  text-xs md:text-base italic md:pl-2'>
            <LiaCarSideSolid className='hidden md:block size-6 mr-2' />
            {t('taxi')} <span className='font-bold ml-auto min-w-10'>10 min</span>
          </div>

          <span className='gap-2 flex items-center text-xs md:text-[20px] font-bold'>
            {t('airport')}
          </span>
          <div className=' flex  italic text-xs md:text-base md:pl-2'>
              <LiaBusAltSolid className='hidden md:block size-6 mr-2' />{t('publicTransport')} <span className='font-bold ml-auto min-w-10'>40 min</span>
          </div>
          <div className=' flex  italic text-xs md:text-base md:pl-2'>
            <LiaCarSideSolid className='hidden md:block size-6 mr-2' />{t('taxi')} <span className='font-bold ml-auto min-w-10'>35 min</span>
          </div>
        </div>
      </a>
      <a 
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-120 cursor-pointer transition-all duration-300"
      >
        {t('seeOnGoogleMaps')}
      </a>
    </div>
  )
}