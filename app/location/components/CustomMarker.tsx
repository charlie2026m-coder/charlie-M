'use client'
import { useState, useMemo, useEffect } from 'react'
import { Marker, OverlayView } from '@react-google-maps/api'
import Image from 'next/image'
import { FaPersonWalking } from "react-icons/fa6";
import { PiCarFill } from "react-icons/pi";
import { FaBus } from 'react-icons/fa';

interface CustomMarkerProps {
  item:any
  markerSize?: number
  iconUrl?: string
}

const CustomMarker = ({ 
  item, 
  markerSize = 40,
  iconUrl = '/images/map-marker.svg'
}: CustomMarkerProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const customIcon = useMemo(() => {
    if (typeof google === 'undefined') return undefined

    return {
      url: iconUrl,
      scaledSize: new google.maps.Size(markerSize, markerSize * 1.3),
      anchor: new google.maps.Point(markerSize / 2, markerSize * 1.3),
    }
  }, [iconUrl, markerSize])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.custom-marker-popup')) {
        setIsOpen(false)
      }
    }

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  return (
    <>
      <Marker 
        position={item.position} 
        icon={customIcon}
        onClick={() => setIsOpen(!isOpen)}
      />

      {isOpen && (
        <OverlayView
          position={item.position}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div 
            style={{ 
              transform: `translate(-50%, -${markerSize * 1.3 + 15}px)`,
              position: 'absolute',
              zIndex: 1000
            }}
          >
            <div className='custom-marker-popup flex flex-col bg-white rounded-2xl w-[240px] shadow-lg overflow-hidden'>
              <div className='relative w-full h-[150px]'>
                <Image 
                  src={item.image} 
                  alt={item.title} 
                  fill
                  className='object-cover'
                />
              </div>
              <div className='p-3 flex flex-col gap-1'>
                <h3 className='font-semibold text-dark text-base'>{item.title}</h3>
                {item.distance && <p className=' px-2 py-1 border border-light1 rounded-full text-mute text-[17px] w-fit'>{item.distance}</p>}
                <div className='flex flex-wrap gap-1 mt-1 gap-2.5'>
                  {item.walkTime && <div className='flex items-center gap-1 bg-blue px-2 py-1 rounded-full text-mute text-[17px] w-fit'><FaPersonWalking className='size-4' />{item.walkTime}</div>}
                  {item.carTime && <div className='flex items-center gap-1 bg-blue px-2 py-1 rounded-full text-mute text-[17px] w-fit'><PiCarFill className='size-4' />{item.carTime}</div>}
                  {item.busTime && <div className='flex items-center gap-1 bg-blue px-2 py-1 rounded-full text-mute text-[17px] w-fit'><FaBus className='size-4' />{item.busTime}</div>}
                </div>
              </div>
            </div>
          </div>
        </OverlayView>
      )}
    </>
  )
}

export default CustomMarker

