'use client'
import Header from './components/Header'
import { useTranslations } from 'next-intl'
import { PiMapPinFill } from "react-icons/pi";
import { useState } from 'react'
import { cn } from '@/lib/utils'
import LocationCard from './components/LocationCard'
import { Location } from './components/LocationCard'


const LocationSection = () => {
  const t = useTranslations('home')
  const [activeItem, setActiveItem] = useState(-1)

  return (
    <div id="location" className='w-full flex flex-col container px-4 xl:px-[100px] pb-30'>
      <Header title={t('location_title')} />
      <span className='w-full text-dark text-lg text-center mb-20'>{t('location_subtitle')}</span>
      <div 
        className='w-full bg-contain bg-center bg-no-repeat flex justify-between'
        style={{ backgroundImage: "url('/images/map-1.svg')" }}
      >
        <div className='flex flex-col gap-2 items-start'>
          <div 
            className={cn('flex items-center font-[900] gap-1 text-mute rounded-full cursor-pointer transition-all -translate-x-3 duration-500 text-5xl', activeItem === -1 && 'bg-blue text-white  border-blue scale-120 translate-x-8 px-2  py-1.5' )} 
            onClick={() => setActiveItem(-1)}
            onMouseEnter={() => setActiveItem(-1)}
          >
            <PiMapPinFill className='size-12' />
            We are here
          </div>
          {
            locations.map((item, index) => (
              <div 
                key={item.title} 
                className={cn('text-mute/50 font-[900] cursor-pointer transition-all duration-300 text-4xl', activeItem === index && 'text-blue scale-120 translate-x-8')} 
                onClick={() => setActiveItem(index)}
                onMouseEnter={() => setActiveItem(index)}
              >
                {item.title}
              </div>
            ))
          }
        </div>

          <LocationCard item={activeItem == -1 ? null : locations[activeItem]} index={activeItem} />
      </div>
    </div>
  )
}

export default LocationSection



const locations: Location[] = [
  {
    title: 'Checkpoint Charlie',
    image: '/images/street.webp',
    distance: '200m',
    walkTime: '5 min', 
    position: { lat: 52.507568531531284,lng:  13.39085829584042, }
  },
  {
    title: 'Gendarmenmarkt',
    image: '/images/location-5.svg',
    distance: '1 km',
    carTime: '5 min',
    busTime: '10 min',
    walkTime: '10 min',
    position: { lat:52.513329699995126,lng:  13.392952080498011 }
  },
  {
    title: 'Potsdamer Platz',
    image: '/images/location-3.svg',
    distance: '1.4 km',
    carTime: '5 min',
    busTime: '10 min',
    walkTime: '15 min',
    position: { lat: 52.509296471309916, lng:13.376298417277027, }
  },
  {
    title: 'Brandenburg Gate',
    image: '/images/location-2.svg',
    distance: '1.6 km',
    carTime: '5 min',
    busTime: '15 min',
    walkTime: '20 min',
    position: { lat: 52.51639862067084,lng: 13.378401472554446, }
 
  },

  {
    title: 'Reichstag & Glass Dome',
    image: '/images/location-4.svg',
    distance: '2 km',
    carTime: '5 min',
    busTime: '15 min',
    walkTime: '20 min',
    position: { lat: 52.518763727555815, lng: 13.376734359111904 }
     
  },

  {
    title: 'Museum Island',
    image: '/images/location-6.svg',
    distance: '2 km',
    carTime: '5 min',
    busTime: '15 min',
    walkTime: '20 min',
    position: { lat: 52.51850083469369, 
    lng: 13.400688789322478, }
    
  },
  {
    title: 'Alexanderplatz & TV Tower',
    image: '/images/location-7.svg',
    distance: '2.9 km',
    carTime: '10 min',
    busTime: '15 min',
    walkTime: '40 min',
    position: { lat:52.520965120606746, 
    lng: 13.409826793991215 , }
    
  },
  {
    title: 'Tiergarten',
    image: '/images/location-8.svg',
    distance: '1.5 km',
    carTime: '5 min',
    busTime: '10 min',
    walkTime: '15 min',
    position: { lat: 52.51467283163672,lng: 13.350340222712656, }
     
  },
  {
    title: 'Mall of Berlin',
    image: '/images/location-9.svg',
    distance: '900 m',
    carTime: '5 min',
    walkTime: '10 min',
    position: { lat: 52.510635577461365, lng:13.381190528920152, }
     
  },
  {
    title: 'KaDeWe',
    image: '/images/location-10.svg',
    distance: '4 km',
    carTime: '15 min',
    busTime: '25 min',
    position: { lat: 52.50178494145241,lng: 13.341100286591294, }
     
  },
  {
    title: 'East Side Gallery',
    image: '/images/location-11.svg',
    distance: '3.8 km',
    carTime: '15 min',
    busTime: '20 min',
    position: { lat: 52.50511553277002, 
    lng: 13.439679610694357 }
  },
  {
    title: 'Nikolaiviertel',
    image: '/images/location-12.svg',
    distance: '2.3 km',
    carTime: '10 min',
    busTime: '15 min',
    walkTime: '30 min',
    position: { lat: 52.51750072494429, 
    lng: 13.407166000356913 }
    
  },
  {
    title: 'Kaiser Wilhelm Memorial Church',
    image: '/images/location-13.svg',
    distance: '4.4 km',
    carTime: '15 min',
    busTime: '20 min',
    position: {   lat: 52.50496164470728,
    lng: 13.335092727070208 }
     
  },
  {
    title: 'Berlin Hauptbahnhof',
    image: '/images/location-14.svg',
    distance: '3.4 km',
    carTime: '10 min',
    busTime: '15 min',
    position: { lat: 52.52466107894526, 
    lng:  13.3696716550808 }
   
  },
  {
    title: 'Unter den Linden',
    image: '/images/location-15.svg',
    distance: '1.3 km',
    carTime: '5 min',
    busTime: '5 min',
    walkTime: '15 min',
    position: { lat:52.51704110522542, 
    lng:13.389289771249139 }
  },
]