'use client'
import InfoCard from './InfoCard'

const InformationSection = () => {
  return (
    <div className='px-3 lg:px-[30px]'>
      <h3 className='font-semibold text-mute text-[40px] mb-8'>Information</h3>
      <div className='grid grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-10  gap-y-5'>
        {infoItems.map((item) => (
          <InfoCard key={item.id} card={item} />
        ))}
      </div>
    </div>
  )
}

export default InformationSection


const infoItems = [
  {
    id:1,
    title: 'Co-Working Space',
    image: '/images/co-working-icon.svg',
  },
  {
    id:2,
    title: 'Luggage Lockers',
    image: '/images/luggage-icon.svg',
  },
  {
    id:3,
    title: 'Self-Service Closet',
    image: '/images/closet-icon.svg',
  },
  {
    id:4,
    title: 'Laundry Room',
    image: '/images/laundry-icon.svg',
  },
  {
    id:5,
    title: 'In-Room Coffee Machine',
    image: '/images/coffee-m-icon.svg',
  },
  {
    id:6,
    title: 'Fast WiFi',
    image: '/images/wifi-icon.svg',
  },
  {
    id:7,
    title: 'Lost and Found',
    image: '/images/lost-icon.svg',
  },
  {
    id:8,
    title: 'Room Refresh',
    image: '/images/refresh-icon.svg',
  },
  {
    id:9,
    title: 'Garbage disposal',
    image: '/images/garbage-icon.svg',
  },
 
]