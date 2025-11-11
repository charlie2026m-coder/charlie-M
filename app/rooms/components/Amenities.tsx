import Image from 'next/image'
const Amenities = ({ title = true }: { title?: boolean }) => {
  return (
    <div className='flex flex-col gap-4 '>
      {title && <h2 className='text-xl font-semibold inter mb-5'>Amenities included:</h2>} 
      <div className='flex flex-wrap gap-2.5'>
        {amenities.map((amenity) => (
          <div key={amenity.name} className='flex items-center bg-light-blue rounded-full px-2.5 py-1 items-center gap-1'>
            <Image className='size-[15px]' src={amenity.image} alt={amenity.name} width={15} height={15} />
            <span className=''>{amenity.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Amenities

const amenities = [
  { name: 'Kettle',  image: '/images/amenities/kettle.png' },
  { name: 'Coffee machine',  image: '/images/amenities/coffee.png' },
  { name: 'Fresh towels & bed linen',  image: '/images/amenities/towels.png' },
  { name: 'Mini Fridge',  image: '/images/amenities/mini_fridge.png' },
  { name: 'Hairdryer',  image: '/images/amenities/hairdryer.png' },
  { name: 'Smart TV',  image: '/images/amenities/tv.png' },
  { name: 'Hight-speed Wi-Fi',  image: '/images/amenities/wifi.png' },
  { name: 'Air Conditioning',  image: '/images/amenities/air.png' },
  { name: 'Blackout curtains',  image: '/images/amenities/curtains.png' },
  { name: 'Essential Closets',  image: '/images/amenities/closets.png' },
  { name: 'Elevator',  image: '/images/amenities/elevator.png' },
  { name: 'Weekly cleaning (for stays of 7+ nights)',  image: '/images/amenities/cleaning.png' },
  { name: 'Luggage Storage',  image: '/images/amenities/storage.png' },
  { name: 'Bicycle parking',  image: '/images/amenities/cycle-parking.png' },
  { name: 'Community area with co-working space ',  image: '/images/amenities/co-working.png' },
  { name: 'Virtual concierge “Charlie” available 24/7',  image: '/images/amenities/service.png' },

]