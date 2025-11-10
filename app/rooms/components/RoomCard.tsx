import { Button } from '@/app/_components/ui/button'
import PhotoSlider from '@/app/_components/Home/PhotoSlider'

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
    <div className='w-full flex flex-col rounded-[40px] bg-white overflow-hidden shadow-lg h-full'>
      <PhotoSlider height={260} images={images} />
      <div className='flex flex-col p-4 pb-6 h-full'>
        <h2 className='text-xl font-medium jakarta mb-3'>{title}</h2>
        <div className='flex items-center gap-1 mb-3'>
          <span className='text-dark text-sm'>{squareMeters}m²</span>
          <div className='size-[7px] rounded-full bg-blue'/>
          <span className='text-dark text-sm'>{beds}</span>
          {extra && <>
            <div className='size-[7px] rounded-full bg-blue'/>
            <span className='text-dark text-sm'>{extra}</span>
          </>}
        </div>
        <p className='mb-3 text-[13px] inter font-[400]'>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
        
        <div className='text-brown mt-auto'>per night from</div>
        <div className='flex items-center justify-between '>
          <div className='text-xl rounded-full bg-green/15 font-[700] text-green px-2.5 py-2'>€{price.toFixed(2)}</div>
          <Button className='h-[55px]'>Book Now</Button>
        </div>
      </div>
    </div>
  )
}

export default RoomCard