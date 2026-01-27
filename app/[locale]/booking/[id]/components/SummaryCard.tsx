'use client'
import { useBookingStore } from '@/store/useBookingStore'
import Price from "@/app/_components/ui/price";
import Image from 'next/image';
import { calculateNights } from '@/lib/utils';
import { BsCalendar2Fill } from 'react-icons/bs';
import dayjs from 'dayjs';
import { getExtraPrice } from '@/lib/utils';

const SummaryCard = () => {
  const { booking, rooms, roomDetails, services, extras } = useBookingStore()

  if (!booking || !booking.reservations) {
    return (
      <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl'>
        <h2 className='text-2xl font-bold mb-3 text-center'>Summary</h2>
        <p className='text-center text-gray-500'>No booking data available</p>
      </div>
    )
  }

  const { reservations } = booking
  const totalGuests = reservations[0].adults + (reservations[0].childrenAges?.length || 0)
  const nights = calculateNights(reservations[0].arrival, reservations[0].departure)
  const roomPrice = roomDetails?.price || 0

  const updatedRooms = rooms.map(room => {
    const updateExtras = room.extras?.map(extra => {
      return {
        ...extra,
        totalPrice: getExtraPrice(extra, room.adults + room.children, nights, reservations[0].arrival, reservations[0].departure),
      }
    })
    return {
      ...room,
      extras: updateExtras,
    }
  })


  const flatExtras = updatedRooms.flatMap(room => room.extras || [])
  const getText = (days: number) => days === 1 ? 'night' : 'nights'
  
  // Calculate price for each room based on guest count
  const calculateRoomPrice = (adultsCount: number) => {
    const maxPersons = roomDetails?.maxPersons || 2;
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    
    if (adultsCount === 1) {
      return roomDetails?.price || 0;
    } else if (adultsCount % 2 === 0) {
      return roomsNeeded * (roomDetails?.priceForTwo || roomDetails?.price || 0);
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      return (doubleRooms * (roomDetails?.priceForTwo || roomDetails?.price || 0)) + (roomDetails?.price || 0);
    }
  };

  // Calculate price for unlimited/checkout services
  const calculateUnlimitedServicePrice = (serviceId: string, count: number) => {
    const service = extras.find(e => e.id === serviceId);
    if (!service) return 0;

    const mode = service.availability?.mode;
    const pricingUnit = service.pricingUnit;
    
    if (mode === 'Daily' && pricingUnit === 'Room') {
      return service.price * count * nights;
    }
    if (mode === 'Daily' && pricingUnit === 'Person') {
      return service.price * count * nights;
    }
    return service.price * count;
  };

  // Calculate total price for all services (unlimited, checkout and limited)
  const servicesTotalPrice = services.reduce((acc, service) => {
    // If service has count (unlimited or checkout services)
    if (service.count) {
      return acc + calculateUnlimitedServicePrice(service.serviceId, service.count);
    }
    
    // If service has dates array (limited services)
    if (service.dates && service.dates.length > 0) {
      const serviceDetails = extras.find(e => e.id === service.serviceId);
      if (!serviceDetails) return acc;
      
      const totalForDates = service.dates.reduce((dateAcc, date) => {
        return dateAcc + (serviceDetails.price * date.count);
      }, 0);
      
      return acc + totalForDates;
    }
    
    return acc;
  }, 0);

  // Calculate total price for all rooms based on their guest counts
  const roomsTotalPrice = rooms.reduce((acc, room) => acc + calculateRoomPrice(room.adults), 0);
  const extrasTotalPrice = flatExtras.reduce((acc, extra) => acc + extra.totalPrice, 0)
  const totalPrice = roomsTotalPrice + extrasTotalPrice + servicesTotalPrice

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 shadow-xl self-start col-span-1'>
      <h2 className='text-2xl font-bold mb-3 text-center'>Summary</h2>
      <Image 
        src="/images/room1.webp" 
        alt="summary" 
        width={327} 
        height={202} 
        className='w-full max-h-[202px] rounded-xl mb-3 object-cover'
      />

      <div className='text-[16px] flex justify-between font-[500] py-3 border-b mb-3'> 
        Guests: <span className='font-bold'>{totalGuests}</span>
      </div>

      <div className='flex flex-col'>
        <span className='font-semibold mb-4 text-[15px]'>Price:</span>
        <div className='flex flex-col gap-1 mb-3'>
          {rooms.map((room, index) => {
            const roomPrice = calculateRoomPrice(room.adults);
            return (
              <div key={room.id} className='flex flex-col gap-1 mb-2'>
                <div className='flex items-center gap-2 inter text-sm text-dark'>
                  <span className='truncate overflow-hidden whitespace-nowrap'>Room {index + 1} ({room.adults} {room.adults === 1 ? 'guest' : 'guests'})</span>
                  <span>€ {roomDetails?.averagePrice || 0}</span>×<span>{nights} {getText(nights)}</span>
                  <span className='text-bale font-bold text-base ml-auto'>€ {roomPrice}</span>
                </div>
                <div className='flex gap-2 text-sm '>
                  <BsCalendar2Fill className='size-4 cursor-pointer self-center text-blue' /> {dayjs(room.from).format('DD MMM YYYY')} - {dayjs(room.to).format('DD MMM YYYY')}
                </div>
              </div>
            )
          })}
          <div className='flex items-center gap-2 inter text-sm text-dark mt-2'>
            <span>City tax:</span>
            <span className='text-bale font-semibold ml-auto'>7.5%</span>
          </div>
        </div>
      </div>

      {((flatExtras.length > 0) || (services.length > 0)) && (
        <div className='flex flex-col mb-5'>
          <span className='font-semibold mb-4 text-[15px]'>Extras:</span>
          
          {updatedRooms.map((room, index) => (
            room.extras && room.extras.length > 0 && (
              <div key={room.id} className='flex flex-col gap-1 mb-2'>
                {room.extras.map((extra) => (
                  <div key={extra.id} className='flex items-center gap-2 inter text-sm text-dark'>
                    <span className='truncate'>Room {index + 1} - {extra.name}</span>
                    <span className='text-bale font-semibold ml-auto'>
                      € {extra.totalPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )
          ))}
          
          {services.map((service) => {
            const serviceDetails = extras.find(e => e.id === service.serviceId);
            if (!serviceDetails) return null;
            
            // For unlimited/checkout services with count
            if (service.count) {
              const servicePrice = calculateUnlimitedServicePrice(service.serviceId, service.count);
              
              return (
                <div key={service.serviceId} className='flex items-center gap-2 inter text-sm text-dark mb-2'>
                  <div className='truncate overflow-hidden whitespace-nowrap flex items-center'>
                    {serviceDetails.name} (x{service.count})
                  </div>
                  <span className='text-bale font-semibold ml-auto'>€ {servicePrice.toFixed(2)}</span>
                </div>
              );
            }
            
            // For limited services with dates array
            if (service.dates && service.dates.length > 0) {
              const totalCount = service.dates.reduce((sum, date) => sum + date.count, 0);
              const totalPrice = service.dates.reduce((sum, date) => sum + (serviceDetails.price * date.count), 0);
              
              return (
                <div key={service.serviceId} className='flex items-center gap-2 inter text-sm text-dark mb-2'>
                  <div className='truncate overflow-hidden whitespace-nowrap flex items-center'>
                    {serviceDetails.name} (x{totalCount})
                  </div>
                  <span className='text-bale font-semibold ml-auto'>€ {totalPrice.toFixed(2)}</span>
                </div>
              );
            }
            
            return null;
          })}
          
          <div className='flex items-center justify-between gap-2 inter text-sm text-dark mb-2'>
            <span>Total:</span>
            <span className='text-bale font-semibold'>€ {(extrasTotalPrice + servicesTotalPrice).toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className='flex items-center justify-between mb-3'>
        <span className='font-semibold text-lg'>Total price:</span>
        <Price price={Number(totalPrice.toFixed(2))} />
      </div>
    </div>
  )
}

export default SummaryCard
