'use client'
import Header from './components/Header'
import { useTranslations } from 'next-intl'
import { PiMapPinFill } from "react-icons/pi";
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import LocationCard from './components/LocationCard'
import { Location } from './components/LocationCard'


const LocationSection = () => {
  const t = useTranslations('home')
  const [activeItem, setActiveItem] = useState(-1)
  const [map, setMap] = useState('/images/map/location-0.svg')

  const handleMap = (index: number) => {
    if(index === -1) {
      setMap('/images/map/location-0.svg')
      setActiveItem(-1)
      return
    }
    const mapImage = locations[index].mapImage
    setMap(mapImage)
    setActiveItem(index)
  }

  
  return (
    <div id="location" className='w-full flex flex-col container px-4 xl:px-[100px] pb-10 '>
      <Header title={t('location_title')} />
      <span className='w-full text-dark text-lg text-center '>{t('location_subtitle')}</span>
      <div className='w-full relative flex justify-between pt-5 lg:pt-20 flex-col lg:flex-row transition-all duration-500'>
        <MapImage map={map} />
        <div className='flex flex-col lg:gap-2 items-start pb-6 lg:pb-0 z-10 w-1/2 xs:w-1/3 sm:w-1/2 lg:w-full '>
          <div 
            className={cn('flex items-center font-[900] gap-1 text-sm text-mute rounded-full cursor-pointer transition-all  xl:-translate-x-3 duration-500 md:text-2xl lg:text-4xl', activeItem === -1 && 'bg-blue text-white  border-blue scale-120 translate-x-4 xl:translate-x-8 px-2 mb-1 lg:mb-0 lg:py-1.5' )} 
            onClick={() => handleMap(-1)}
            onMouseEnter={() => handleMap(-1)}
          >
            <PiMapPinFill className='md:size-6 lg:size-10' />
            We are here
          </div>
          {
            locations.map((item, index) => (
              <div 
                key={item.title} 
                className={cn('text-mute/50 font-[900] cursor-pointer text-sm transition-all duration-300 md:text-xl lg:text-3xl', activeItem === index && 'text-blue scale-120 translate-x-3 md:translate-x-8')} 
                onClick={() => handleMap(index)}
                onMouseEnter={() => handleMap(index)}
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

const MapImage = ({ map }: { map: string }) => {
  const [layers, setLayers] = useState<Array<{ id: number; map: string; opacity: number }>>([
    { id: 0, map: '/images/map/location-0.svg', opacity: 1 }
  ])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
  
    const existingLayer = layers.find(l => l.map === map && l.opacity === 1)
    if (existingLayer) return

    const newLayerId = Date.now()
    setLayers(prev => [
      ...prev.map(l => ({ ...l, opacity: 0 })), 
      { id: newLayerId, map, opacity: 1 } 
    ])

    const cleanupTimer = setTimeout(() => {
      setLayers(prev => prev.filter(l => l.id === newLayerId))
    }, 600)

    return () => clearTimeout(cleanupTimer)
  }, [map])

  return (
    <>
      {layers.map((layer, index) => (
        <div 
          key={layer.id}
          className='absolute top-0 left-4  right-0  lg:right-4 bottom-0   bg-contain bg-top bg-no-repeat transition-opacity duration-500'
          style={{ 
            backgroundImage: `url(${layer.map})`,
            opacity: layer.opacity,
            zIndex: -50 + index,
            backgroundSize: isMobile ? '250%' : 'contain',
            backgroundPosition: isMobile ? 'calc(50% + 80px) calc(-100vw * 0.3)' : 'top',
          }} 
        />
      ))}
    </>
  )
}



const locations: Location[] = [
  {
    title: 'Checkpoint Charlie',
    mapImage: '/images/map/location-1.svg',
    image: '/images/street.webp',
    distance: '200m',
    walkTime: '5 min', 
    position: { lat: 52.507568531531284,lng:  13.39085829584042, }
  },
  {
    title: 'Gendarmenmarkt',
    mapImage: '/images/map/location-7.svg',
    image: '/images/location-5.svg',
    distance: '1 km',
    carTime: '5 min',
    busTime: '10 min',
    walkTime: '10 min',
    position: { lat:52.513329699995126,lng:  13.392952080498011 }
  },
  {
    title: 'Potsdamer Platz',
    mapImage: '/images/map/location-3.svg',
    image: '/images/location-3.svg',
    distance: '1.4 km',
    carTime: '5 min',
    busTime: '10 min',
    walkTime: '15 min',
    position: { lat: 52.509296471309916, lng:13.376298417277027, }
  },
  {
    title: 'Brandenburg Gate',
    mapImage: '/images/map/location-8.svg',
    image: '/images/location-2.svg',
    distance: '1.6 km',
    carTime: '5 min',
    busTime: '15 min',
    walkTime: '20 min',
    position: { lat: 52.51639862067084,lng: 13.378401472554446, }
 
  },

  {
    title: 'Reichstag & Glass Dome',
    mapImage: '/images/map/location-9.svg',
    image: '/images/location-4.svg',
    distance: '2 km',
    carTime: '5 min',
    busTime: '15 min',
    walkTime: '20 min',
    position: { lat: 52.518763727555815, lng: 13.376734359111904 }
     
  },

  {
    title: 'Museum Island',
    mapImage: '/images/map/location-6.svg',
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
    mapImage: '/images/map/location-5.svg',
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
    mapImage: '/images/map/location-12.svg',
    image: '/images/location-8.svg',
    distance: '1.5 km',
    carTime: '5 min',
    busTime: '10 min',
    walkTime: '15 min',
    position: { lat: 52.51467283163672,lng: 13.350340222712656, }
     
  },
  {
    title: 'Mall of Berlin',
    mapImage: '/images/map/location-2.svg',
    image: '/images/location-9.svg',
    distance: '900 m',
    carTime: '5 min',
    walkTime: '10 min',
    position: { lat: 52.510635577461365, lng:13.381190528920152, }
     
  },
  {
    title: 'KaDeWe',
    mapImage: '/images/map/location-13.svg',
    image: '/images/location-10.svg',
    distance: '4 km',
    carTime: '15 min',
    busTime: '25 min',
    position: { lat: 52.50178494145241,lng: 13.341100286591294, }
     
  },
  {
    title: 'East Side Gallery',
    mapImage: '/images/map/location-15.svg',
    image: '/images/location-11.svg',
    distance: '3.8 km',
    carTime: '15 min',
    busTime: '20 min',
    position: { lat: 52.50511553277002, 
    lng: 13.439679610694357 }
  },
  {
    title: 'Nikolaiviertel',
    mapImage: '/images/map/location-4.svg',
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
    mapImage: '/images/map/location-14.svg',
    image: '/images/location-13.svg',
    distance: '4.4 km',
    carTime: '15 min',
    busTime: '20 min',
    position: {   lat: 52.50496164470728,
    lng: 13.335092727070208 }
     
  },
  {
    title: 'Berlin Hauptbahnhof',
    mapImage: '/images/map/location-11.svg',
    image: '/images/location-14.svg',
    distance: '3.4 km',
    carTime: '10 min',
    busTime: '15 min',
    position: { lat: 52.52466107894526, 
    lng:  13.3696716550808 }
   
  },
  {
    title: 'Unter den Linden',
    mapImage: '/images/map/location-10.svg',
    image: '/images/location-15.svg',
    distance: '1.3 km',
    carTime: '5 min',
    busTime: '5 min',
    walkTime: '15 min',
    position: { lat:52.51704110522542, 
    lng:13.389289771249139 }
  },
]