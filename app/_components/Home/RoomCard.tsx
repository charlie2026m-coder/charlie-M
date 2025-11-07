import { Button } from '../ui/button'
import PhotoSlider from './PhotoSlider'

const RoomCard = ({ 
  title, 
  extra, 
  price, 
  squareMeters, 
  beds 
}: { 
  title: string, 
  extra: string, 
  price: number, 
  squareMeters: number, 
  beds: string 
}) => {
  
  const images = [
    '/images/room.jpg',
    '/images/room2.jpg',
    '/images/room3.jpg',
    '/images/room2.jpg',
    '/images/room.jpg',
  ]
  return (
    <div className='w-[400px] flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg'>
      <PhotoSlider height={260} images={images} />
      <div className='flex flex-col p-4 pb-6'>
        <h2 className='text-xl font-medium jakarta mb-3'>{title}</h2>
        <div className='flex items-center gap-1 mb-3'>
          <span className='text-dark text-sm'>{squareMeters}m²</span>
          <div className='size-[7px] rounded-full bg-blue'/>
          <span className='text-dark text-sm'>{beds}</span>
          <div className='size-[7px] rounded-full bg-blue'/>
          <span className='text-dark text-sm'>{extra}</span>
        </div>
        <div className='flex items-center justify-between mb-4'>
          <div className='text-brown '>per night from</div>
          <div className='text-xl rounded-full bg-green/15 font-[700] text-green px-2.5 py-2'>€{price.toFixed(2)}</div>
        </div>

        <div className='flex items-center justify-between'>
          <Button variant='outline' className='h-[55px]'>Discover More</Button>
          <Button className='h-[55px]'>Book Now</Button>
        </div>
      </div>
    </div>
  )
}

export default RoomCard