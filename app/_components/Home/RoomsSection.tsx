import { Button } from '../ui/button'
import { RoomsCarousel } from './RoomsCarousel'

const RoomsSection = () => {

  return (
    <div className='w-full flex flex-col pb-[85px]'>
      <div className='flex items-center justify-between gap-10'>
        <div className='flex items-center gap-2'>
          <div className='size-5 rounded-full bg-blue'/>
          <h2 className='font-medium text-[40px]'>Featured rooms</h2>
        </div>
        <Button variant='outline' className='px-[45px]'>View all</Button>
      </div>
      <span className='w-full text-dark text-lg mb-[50px]'>Comfort and freedom — all in one listing.</span>
      
      <RoomsCarousel items={items} />
    </div>
  )
}

export default RoomsSection

const items = [
  {
    id: '1',
    title: 'Deluxe Ocean View Suite',
    image: '/images/room.jpg',
    extra: 'Balcony',
    price: 250,
    squareMeters: 45,
    beds: 'King 200/200'
  },
  {
    id: '2',
    title: 'Cozy Garden Room',
    image: '/images/room.jpg',
    extra: 'Terrace',
    price: 150,
    squareMeters: 32,
    beds: 'Queen 180/200'
  },
  {
    id: '3',
    title: 'Family Comfort Suite',
    image: '/images/room.jpg',
    extra: 'Extra Bed',
    price: 320,
    squareMeters: 55,
    beds: '2 Double 160/200'
  },
  {
    id: '4',
    title: 'Modern Studio Apartment',
    image: '/images/room.jpg',
    extra: 'Kitchenette',
    price: 180,
    squareMeters: 38,
    beds: 'Double 160/200'
  },
  {
    id: '5',
    title: 'Premium Penthouse',
    image: '/images/room.jpg',
    extra: 'Jacuzzi',
    price: 450,
    squareMeters: 70,
    beds: 'King 200/220'
  }
]