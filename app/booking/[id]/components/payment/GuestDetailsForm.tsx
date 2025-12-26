'use client'
import { useEffect, useState } from 'react'
import CustomInput from '@/app/_components/ui/customInput'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/app/_components/ui/button'
import { useBookingStore } from '@/store/useBookingStore'
import { GuestDetailsFormData, guestDetailsSchema } from '@/types/schemas'
import { useStore } from '@/store/useStore'
import { useCreateBooking } from '@/app/hooks/useCreateBooking'

const GuestDetailsForm = () => {
  const defaultValues = {name: '', last_name: '', email: '', phone: ''}
  const { register,  handleSubmit,  formState: { errors },  reset,  } = useForm<GuestDetailsFormData>({ resolver: zodResolver(guestDetailsSchema),  defaultValues,})

  const setValue = useStore(state => state.setValue)
  const setBooking = useBookingStore(state => state.setBooking)
  const booking = useBookingStore(state => state.booking)
  const createBooking = useCreateBooking()

  const [isHydrated, setIsHydrated] = useState(false)
  

  useEffect(() => {
    if (!useBookingStore.persist.hasHydrated()) {
      useBookingStore.persist.rehydrate()
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    
    const bookerData = booking?.booker
    const guestData = booking?.reservations?.[0]?.primaryGuest
    
    const firstName = bookerData?.firstName || guestData?.firstName || ''
    const lastName = bookerData?.lastName || guestData?.lastName || ''
    const email = bookerData?.email || guestData?.email || ''
    const phone = bookerData?.phone || guestData?.phone || ''
    
    if (firstName || lastName || email || phone) {
      reset({
        name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
      })
    }
  }, [booking, reset, isHydrated])

  const onSubmit = (data: GuestDetailsFormData) => {
    if (!booking || !booking.reservations) {
      console.error('Booking data is missing')
      return
    }

    const updatedReservations = booking.reservations.map(reservation => ({
      ...reservation,
      primaryGuest: {
        ...reservation.primaryGuest,
        firstName: data.name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
      }
    }))
    const bookingModel = {
      booker: {
        firstName: data.name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
      },
      reservations: updatedReservations
    }
    setBooking(bookingModel)

    //Create booking temporrary
    createBooking.mutate(bookingModel)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4 col-span-2'>
      <h2 className='text-[22px] font-bold mb-10'>Guest Details</h2>
      
      <div className='grid grid-cols-2 gap-4 mb-9 '>
        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register} 
            name='name' 
            type='text' 
            placeholder='Name' 
            icon='name'
            isError={!!errors.name}
          />
          {errors.name && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.name.message}</span>
          )}
        </div>
        
        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register}
            name='last_name' 
            type='text' 
            placeholder='Last Name' 
            icon='name'
            isError={!!errors.last_name}
          />
          {errors.last_name && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.last_name.message}</span>
          )}
        </div>
        
        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register}
            name='email' 
            type='email' 
            placeholder='Email' 
            icon='email'
            isError={!!errors.email}
          />
          {errors.email && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.email.message}</span>
          )}
        </div>
        
        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register}
            name='phone' 
            type='phone' 
            placeholder='Phone' 
            icon='phone'
            isError={!!errors.phone}
          />
          {errors.phone && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.phone.message}</span>
          )}
        </div>
      </div>

      <div className='flex items-center gap-3 justify-start'>
        <Button 
          type='button' 
          variant='outline' 
          className='w-[210px] h-[55px]'
          onClick={() => setValue(1,'bookingPage')}
          disabled={createBooking.isPending}
        >Back</Button>
        <Button 
          type='submit' 
          className='w-[210px] h-[55px]'
          disabled={createBooking.isPending}
        >
          {createBooking.isPending ? 'Creating Booking...' : 'Continue'}
        </Button>
      </div>
    </form>
  )
}

export default GuestDetailsForm