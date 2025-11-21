import Link from 'next/link'
import { Button } from '../ui/button'
import { RoomsCarousel } from './RoomsCarousel'
import { getRoomsData } from '@/services/getRoomsData'
import ErrorCard from '@/app/rooms/components/ErrorCard'
import Dot from '../ui/dot'

const RoomsSection = async () => {
  const rooms = await getRoomsData()
  
  // Show fallback UI if no rooms available (e.g., API error)
  if ('error' in rooms || !rooms || rooms.length === 0) {
    return <ErrorCard link='/' isSingleRoom={false} />
  }
  
  return (
    <div className='w-full flex flex-col pb-[85px]'>
      <div className='flex items-center justify-between gap-10'>
        <div className='flex items-center gap-2'>
          <Dot size={20} color="blue" />
          <h2 className='font-medium text-[40px]'>Featured rooms</h2>
        </div>
        <Link href='/rooms' className='hidden md:block'>
          <Button variant='outline' className='px-[45px]'>View all</Button>
        </Link>
      </div>
      <span className='w-full text-dark text-lg mb-[50px]'>Comfort and freedom — all in one listing.</span>
      <RoomsCarousel items={rooms} />
      <Link href='/rooms' className='block md:hidden mt-5 '>
          <Button variant='outline' className='px-[45px] w-full'>View all</Button>
        </Link>
    </div>
  )
}

export default RoomsSection


// const rooms = [
//   {
//     adults: 2,
//     children: 0,
//     features: ["BALCONY"],
//     hasBalcony: true,
//     id: 612384,
//     name: "Studio with queen size bed and balcony",
//     roomType: "double",
//     roomSize: 12,
//     propertyId: 287404,
//     qty: 6,
//     total: 6,
//     free: 6,
//     maxAdult: 12,
//     maxChildren: 0,
//     maxPeople: 12,
//     maxStay: 180,
//     minStay: 1,
//     minPrice: 40,
//     rackRate: 0,
//     people: 2,
//     unitsAvailable: {
//       availability: {
//         1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         4: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         5: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         6: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
//       }
//     }
//   },
//   {
//     adults: 1,
//     children: 1,
//     features: [],
//     hasBalcony: false,
//     id: 612385,
//     name: "Single room with extra bed",
//     roomType: "single",
//     roomSize: 8,
//     propertyId: 287404,
//     qty: 4,
//     total: 4,
//     free: 4,
//     maxAdult: 4,
//     maxChildren: 4,
//     maxPeople: 8,
//     maxStay: 180,
//     minStay: 1,
//     minPrice: 30,
//     rackRate: 0,
//     people: 2,
//     unitsAvailable: {
//       availability: {
//         1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         4: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
//       }
//     }
//   },
//   {
//     adults: 4,
//     children: 2,
//     features: ["BALCONY", "KITCHEN"],
//     hasBalcony: true,
//     id: 612386,
//     name: "Family apartment with kitchen",
//     roomType: "apartment",
//     roomSize: 25,
//     propertyId: 287404,
//     qty: 3,
//     total: 3,
//     free: 3,
//     maxAdult: 12,
//     maxChildren: 6,
//     maxPeople: 18,
//     maxStay: 180,
//     minStay: 2,
//     minPrice: 80,
//     rackRate: 0,
//     people: 6,
//     unitsAvailable: {
//       availability: {
//         1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
//       }
//     }
//   },
//   {
//     adults: 1,
//     children: 0,
//     features: [],
//     hasBalcony: false,
//     id: 612387,
//     name: "Economy single room",
//     roomType: "single",
//     roomSize: 6,
//     propertyId: 287404,
//     qty: 8,
//     total: 8,
//     free: 8,
//     maxAdult: 8,
//     maxChildren: 0,
//     maxPeople: 8,
//     maxStay: 180,
//     minStay: 1,
//     minPrice: 25,
//     rackRate: 0,
//     people: 1,
//     unitsAvailable: {
//       availability: {
//         1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         4: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         5: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         6: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         7: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         8: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
//       }
//     }
//   },
//   {
//     adults: 3,
//     children: 1,
//     features: ["BALCONY"],
//     hasBalcony: true,
//     id: 612388,
//     name: "Deluxe triple room with balcony",
//     roomType: "triple",
//     roomSize: 18,
//     propertyId: 287404,
//     qty: 2,
//     total: 2,
//     free: 2,
//     maxAdult: 6,
//     maxChildren: 2,
//     maxPeople: 8,
//     maxStay: 180,
//     minStay: 1,
//     minPrice: 65,
//     rackRate: 0,
//     people: 4,
//     unitsAvailable: {
//       availability: {
//         1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
//       }
//     }
//   },
//   {
//     adults: 2,
//     children: 2,
//     features: ["KITCHEN"],
//     hasBalcony: false,
//     id: 612389,
//     name: "Family room with kitchenette",
//     roomType: "family",
//     roomSize: 20,
//     propertyId: 287404,
//     qty: 5,
//     total: 5,
//     free: 5,
//     maxAdult: 10,
//     maxChildren: 10,
//     maxPeople: 20,
//     maxStay: 180,
//     minStay: 1,
//     minPrice: 70,
//     rackRate: 0,
//     people: 4,
//     unitsAvailable: {
//       availability: {
//         1: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         2: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         3: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         4: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true },
//         5: { "2025-11-15": true, "2025-11-16": true, "2025-11-17": true, "2025-11-18": true, "2025-11-19": true }
//       }
//     }
//   }
// ]