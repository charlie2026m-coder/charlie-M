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
import { useTranslations } from 'next-intl';
import { Spinner } from '@/app/_components/ui/spinner';
import { useState, useEffect } from 'react';

import { Service } from '@/types/apaleo';

const BookingMenu = ({
  rooms: roomsOffers,
  params,
  filledRooms,
  isKidsBedAvailable = true,
  extras = [],
  nights: passedNights,
  babyBedAvailability,
}: {
  rooms: RoomOffer[]
  params: UrlParams
  filledRooms: Room[]
  isKidsBedAvailable?: boolean
  extras?: Service[]
  nights: number
  babyBedAvailability?: { isAvailable: boolean; count: number }
}) => {
  const t = useTranslations('bookingForm')
  const tCommon = useTranslations()
  const router = useRouter()
  const urlParams = useParams()
  const { from, to } = params
  const nights = calculateNights(from as string, to as string)
  const { setBooking, setServices } = useBookingStore()
  const rooms = useBookingStore(state => state.rooms) || roomsOffers
  const roomDetails = useBookingStore(state => state.roomDetails) || roomsOffers[0]
  const services = useBookingStore(state => state.services)
  const [isLoading, setIsLoading] = useState(false)

  if (!roomDetails || !rooms || rooms.length === 0) {
    return <div className="p-5 text-center">Loading room details...</div>
  }
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

  // Auto-add baby beds based on children count
  useEffect(() => {
    // Calculate total children from all rooms
    const totalChildren = rooms.reduce((acc, room) => acc + (room.children || 0), 0)
    
    // Get current services from store
    const currentServices = useBookingStore.getState().services
    const babyBedServiceId = 'CMH-BAB'
    const existingBabyBedIndex = currentServices.findIndex(s => s.serviceId === babyBedServiceId)
    
    // Auto-add baby beds if children exist and baby beds are available
    if (totalChildren > 0 && isKidsBedAvailable) {
      let updatedServices = [...currentServices]
      
      if (existingBabyBedIndex >= 0) {
        // Update existing baby bed count to match children count
        if (currentServices[existingBabyBedIndex].count !== totalChildren) {
          updatedServices[existingBabyBedIndex] = {
            ...currentServices[existingBabyBedIndex],
            count: totalChildren
          }
          setServices(updatedServices)
        }
      } else {
        // Add new baby bed service
        updatedServices.push({
          serviceId: babyBedServiceId,
          count: totalChildren
        })
        setServices(updatedServices)
      }
    } else if (totalChildren === 0 && existingBabyBedIndex >= 0) {
      // Remove baby beds if no children
      const updatedServices = currentServices.filter(s => s.serviceId !== babyBedServiceId)
      setServices(updatedServices)
    }
  }, [rooms, isKidsBedAvailable, setServices])

  const getText = (days: number) => days === 1 ? t('night') : t('nights')

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

  // Safe defaults
  const maxPersons = roomDetails.maxPersons || 2
  const price = roomDetails.price || 0
  const priceForTwo = roomDetails.priceForTwo || price
  const cityTax = roomDetails.cityTax || 0
  const cityTaxForTwo = roomDetails.cityTaxForTwo || cityTax
  const oneNightPrice = roomDetails.oneNightPrice || 0
  const oneNightPriceForTwo = roomDetails.oneNightPriceForTwo || oneNightPrice

  // Calculate price for each room based on guest count
  const calculateRoomPrice = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    
    if (adultsCount === 1) {
      return price;
    } else if (adultsCount % 2 === 0) {
      return roomsNeeded * priceForTwo;
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      return (doubleRooms * priceForTwo) + price;
    }
  };

  // Calculate city tax for each room based on guest count
  const calculateRoomTax = (adultsCount: number) => {
    const roomsNeeded = Math.ceil(adultsCount / maxPersons);
    
    if (adultsCount === 1) {
      return cityTax;
    } else if (adultsCount % 2 === 0) {
      return roomsNeeded * cityTaxForTwo;
    } else {
      const doubleRooms = Math.floor(adultsCount / 2);
      return (doubleRooms * cityTaxForTwo) + cityTax;
    }
  };

  // Calculate total price for all rooms based on their guest counts
  const roomsTotalPrice = rooms.reduce((acc, room) => acc + calculateRoomPrice(room.adults), 0);
  
  // Calculate city tax using actual tax amounts from Apaleo
  const cityTaxAmount = rooms.reduce((acc, room) => acc + calculateRoomTax(room.adults), 0);
  
  // Round to 2 decimal places to handle floating point errors
  const totalPrice = Math.round((roomsTotalPrice + cityTaxAmount + servicesTotalPrice) * 100) / 100
 

  const goNext = () => {
    setIsLoading(true)
    const reservations = formatReservations(
      from as string, 
      to as string, 
      roomDetails, 
      updatedRooms as Room[],
      services,
      extras // Pass extras array
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
      <AddRooms filledRooms={filledRooms} availableUnits={roomsOffers[0].availableUnits} isKidsBedAvailable={isKidsBedAvailable} babyBedAvailability={babyBedAvailability} />

      <div className='flex flex-col'>
        <span className='font-semibold mb-1.5 '>{t('price')}</span>
        <div className='flex flex-col gap-1 mb-5'>
          {rooms.map((room, index) => {
            const roomPrice = calculateRoomPrice(room.adults);
            // Calculate price per night for this room
            const pricePerNight = room.adults === 1 ? oneNightPrice : oneNightPriceForTwo;
            
            return (
              <div key={index} className='flex items-center gap-2 inter text-sm text-dark'>
                <span className=' truncate overflow-hidden whitespace-nowrap '>{t('room')} {index + 1} ({room.adults} {room.adults === 1 ? t('guest') : t('guests')})</span>
                <span>€ {pricePerNight}</span>x<span>{nights} {getText(nights)}</span>
                <span className='text-bale font-semibold ml-auto'>€ {roomPrice.toFixed(2)}</span>
              </div>
            )
          })}
        <div  className='flex items-center gap-2 inter text-sm text-dark mt-2'>
          <span>{t('cityTax')}</span>
          <span className='text-bale font-semibold ml-auto'>€ {cityTaxAmount.toFixed(2)}</span>
        </div>
        </div>
        {services.length > 0 && <>
          <span className='font-semibold mb-1.5 '>{t('addExtras')}</span>
          {updatedRooms.map((room, index) => {
            return (
              <div key={index} className='flex flex-col gap-1 mb-2'>
                {room.extras?.map(extra => {
                  return (
                    <div key={extra.id} className='flex items-center gap-2 inter text-sm text-dark'>
                      <div className=' truncate overflow-hidden whitespace-nowrap flex items-center'>
                        {t('room')} {index + 1} - {extra.name}
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
          <span className='font-semibold text-lg'>{t('totalPrice')}</span>
          <Price price={totalPrice} />
      </div>

      <Button 
        className='w-full h-[55px]'
        onClick={goNext}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className='flex items-center gap-2'>
            <Spinner className='size-4' />
            {tCommon('loading')}
          </span>
        ) : t('bookNow')}
      </Button>  
    </div>
  )
}

export default BookingMenu