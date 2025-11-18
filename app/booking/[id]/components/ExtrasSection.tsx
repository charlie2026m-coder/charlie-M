'use client'
import ExtraCard from './ExtraCard'
import { useBookingStore } from '@/store/bookingStore'
import type { ExtrasItem } from '@/types/beds24'

const ExtrasSection = ({ extras }: { extras: ExtrasItem[] | undefined }) => {
  const { booking, setBooking } = useBookingStore()

  const setExtra = (extra: ExtrasItem) => {
    setBooking({ ...booking, extras: [...booking.extras, extra] })
  };

  const isSelected = (item: ExtrasItem) => {
    return booking.extras.some((extra) => extra.index === item.index)
  }

  if(!extras || extras.length === 0) return null;

  return (  
    <div className='flex flex-col gap-[26px]'>
      <h2 className='inter  font-semibold w-full pb-2.5 border-b'>Add Extras:</h2>
      <div className='grid grid-cols-4 gap-6 gap-y-10'>
        {extras.filter((extra) => extra.type === 'optional').map((extra, index) => (
          <ExtraCard key={extra.name + index} item={extra} setExtra={setExtra} isSelected={isSelected(extra)} />
        ))}
      </div>
      {/* <h2 className='inter  font-semibold w-full text-lg'>Additional "Special" Packages:</h2>
      <div className='grid grid-cols-4 gap-6 gap-y-10'>
        {specialPackages.map((specialPackage, index) => (
          <ExtraCard key={specialPackage.title + index} item={specialPackage} setExtra={setExtra} isSelected={isSelected(specialPackage)} />
        ))}
      </div>
      <h2 className='inter  font-semibold w-full text-lg'>External Extras:</h2>
      <div className='grid grid-cols-4 gap-6 gap-y-10'>
        {externalExtras.map((specialPackage, index) => (
          <ExtraCard key={specialPackage.title + index} item={specialPackage} setExtra={setExtra} isSelected={isSelected(specialPackage)} />
        ))}
      </div> */}
    </div>
  )
}

export default ExtrasSection;


const extras = [
  { image: '/images/extra-1.png', title: 'Extra Bed', price: 10, id: 1 },
  { image: '/images/extra-2.png', title: 'Extra Bed', price: 10, id: 2 },
  { image: '/images/extra-3.png', title: 'Extra Bed', price: 10, id: 3 },
  { image: '/images/extra-1.png', title: 'Extra Bed', price: 50, id: 4 },
  { image: '/images/extra-2.png', title: 'Extra Bed', price: 30, id: 5 },
  { image: '/images/extra-3.png', title: 'Extra Bed', price: 20, id: 6 },
]
const specialPackages = [
  { image: '/images/special-1.png', title: 'Extra Bed', price: 120, id: 7 },
  { image: '/images/special-2.png', title: 'Extra Bed', price: 75, id: 8 },
  { image: '/images/special-3.png', title: 'Extra Bed', price: 3, id: 9 },
  ] 
const externalExtras = [
  { image: '/images/external-1.jpg', title: 'Car Rental', price: 10, id: 10 },
  { image: '/images/external-2.png', title: 'Airport Transfer', price: 50, id: 11 },
  { image: '/images/external-3.png', title: 'Boat Rental', price: 30, id: 12 },
  { image: '/images/external-4.jpg', title: 'Helicopter Tour', price: 10, id: 13 },
]