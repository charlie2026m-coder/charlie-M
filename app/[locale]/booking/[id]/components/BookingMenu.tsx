'use client'
import { formatReservations, calculateNights, extraTooltip, getExtraPrice } from '@/lib/utils';
import { useBookingStore } from '@/store/useBookingStore'
import { UrlParams } from "@/types/apaleo";
import { RoomOffer } from '@/types/offers';
import { Button } from "@/app/_components/ui/button";
import { Room } from '@/types/types';
import CustomTooltip from '@/app/_components/ui/CustomTooltip';
import ChangeDate from './ChangeDate';
import AddRooms from './AddRooms';
import Price from "@/app/_components/ui/price";
import { useRouter, useParams } from 'next/navigation';

import { Service } from '@/types/apaleo';

const BookingMenu = ({
  rooms: roomsOffers,
  params,
  filledRooms,
  isKidsBedAvailable = true,
  extras = [],
  nights: passedNights,
}: {
  rooms: RoomOffer[]
  params: UrlParams
  filledRooms: Room[]
  isKidsBedAvailable?: boolean
  extras?: Service[]
  nights: number
}) => {
  const router = useRouter()
  const urlParams = useParams()
  const { from, to } = params
  const nights = calculateNights(from as string, to as string)
  const { setBooking } = useBookingStore()
  const rooms = useBookingStore(state => state.rooms) || roomsOffers
  const roomDetails = useBookingStore(state => state.roomDetails) || roomsOffers[0]
  const services = useBookingStore(state => state.services)

  const updatedRooms = rooms.map(room => {
    const updateExtras = room.extras?.map(extra => {
      return {
        ...extra,
        totalPrice: getExtraPrice(extra, room.adults + room.children, nights, from as string, to as string),
      }
    })
    return {
      ...room,
      extras: updateExtras,
    }
  })


  const flatExtras = updatedRooms.flatMap(room => room.extras || [])
  const getText = (days: number) => days === 1 ? 'night' : 'nights'

  // Calculate price for unlimited services
  const calculateUnlimitedServicePrice = (serviceId: string, count: number) => {
    const service = extras.find(e => e.id === serviceId);
    if (!service) return 0;

    const mode = service.availability?.mode;
    const pricingUnit = service.pricingUnit;
    
    // For all modes: count already represents the quantity selected
    if (mode === 'Daily' && pricingUnit === 'Room') {
      return service.price * count * passedNights;
    }
    if (mode === 'Daily' && pricingUnit === 'Person') {
      return service.price * count * passedNights;
    }
    // For Arrival/Departure: count is already the number of rooms/persons
    return service.price * count;
  };

  // Calculate total price for all services (unlimited and limited)
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

  // Calculate price for each room based on guest count
  const calculateRoomPrice = (adultsCount: number) => {
    const maxPersons = roomDetails.maxPersons || 2;
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    
    if (adultsCount === 1) {
      return roomDetails.price || 0;
    } else if (adultsCount % 2 === 0) {
      return roomsNeeded * (roomDetails.priceForTwo || roomDetails.price || 0);
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      return (doubleRooms * (roomDetails.priceForTwo || roomDetails.price || 0)) + (roomDetails.price || 0);
    }
  };

  // Calculate total price for all rooms based on their guest counts
  const roomsTotalPrice = rooms.reduce((acc, room) => acc + calculateRoomPrice(room.adults), 0);
  const extrasTotalPrice = flatExtras.reduce((acc, extra) => acc + extra.totalPrice, 0)
  
  const totalPrice = roomsTotalPrice + extrasTotalPrice + servicesTotalPrice
 

  const goNext = () => {
    const reservations = formatReservations(
      from as string, 
      to as string, 
      roomDetails, 
      updatedRooms as Room[],
      services
    )
    setBooking({ 
      reservations,
      totalAmount: totalPrice
    })

    router.push(`/${urlParams.locale}/booking/${urlParams.id}/payment`)
  }


  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 border'>
      <ChangeDate arrival={roomsOffers[0].arrival} departure={roomsOffers[0].departure} />
      <AddRooms filledRooms={filledRooms} availableUnits={roomsOffers[0].availableUnits} isKidsBedAvailable={isKidsBedAvailable} />

      <div className='flex flex-col'>
        <span className='font-semibold mb-1.5 '>Price:</span>
        <div className='flex flex-col gap-1 mb-5'>
          {rooms.map((room, index) => {
            const roomPrice = calculateRoomPrice(room.adults);
            // Calculate price per night for this room
            const pricePerNight = room.adults === 1 
              ? (roomDetails.oneNightPrice || roomDetails.averagePrice || 0)
              : (roomDetails.oneNightPriceForTwo || roomDetails.averagePrice || 0);
            
            return (
              <div key={index} className='flex items-center gap-2 inter text-sm text-dark'>
                <span className=' truncate overflow-hidden whitespace-nowrap '>Room {index + 1} ({room.adults} {room.adults === 1 ? 'guest' : 'guests'})</span>
                <span>€ {pricePerNight}</span>x<span>{nights} {getText(nights)}</span>
                <span className='text-bale font-semibold ml-auto'>€ {roomPrice.toFixed(2)}</span>
              </div>
            )
          })}
          <div  className='flex items-center gap-2 inter text-sm text-dark mt-2'>
            <span>City tax:</span>
            <span className='text-bale font-semibold ml-auto'>7.5%</span>
          </div>
        </div>
        {(flatExtras.length > 0 || services.length > 0) && <>
          <span className='font-semibold mb-1.5 '>Extras:</span>
          {updatedRooms.map((room, index) => {
            return (
              <div key={index} className='flex flex-col gap-1 mb-2'>
                {room.extras?.map(extra => {
                  return (
                    <div key={extra.id} className='flex items-center gap-2 inter text-sm text-dark'>
                      <div className=' truncate overflow-hidden whitespace-nowrap flex items-center'>
                        Room {index + 1} - {extra.name}
                        <CustomTooltip className='self-center ml-2' text={extraTooltip(extra)}/>
                      </div>
                      <span className='text-bale font-semibold ml-auto'>€ {extra.totalPrice.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
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
        </>}
      </div>

      <div className='flex items-center justify-between mb-3'>
          <span className='font-semibold text-lg'>Total price:</span>
          <Price price={Number(totalPrice.toFixed(2))} />
      </div>

      <Button 
        className='w-full h-[55px]'
        onClick={goNext}
      >Book Now</Button>  
    </div>
  )
}

export default BookingMenu