'use client'
import { useEffect, useState } from 'react'
import CustomInput from '@/app/_components/ui/customInput'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/app/_components/ui/button'
import { Checkbox } from '@/app/_components/ui/checkbox'
import { useBookingStore } from '@/store/useBookingStore'
import { GuestDetailsFormData, guestDetailsSchema } from '@/types/schemas'
import { useCreateBooking } from '@/app/hooks/useCreateBooking'
import { Link } from '@/navigation'

const GuestDetailsForm = ({ setBookingPage }: { setBookingPage: (page: number) => void }) => {  
  const defaultValues = {name: '', last_name: '', email: '', phone: '', consent: false}
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue: setFormValue } = useForm<GuestDetailsFormData>({ resolver: zodResolver(guestDetailsSchema), defaultValues,})
  const consent = watch('consent')

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
        consent: false,
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
      consent: data.consent, // Include consent flag
      reservations: updatedReservations
    }
    setBooking(bookingModel)

    //Create booking temporrary
    createBooking.mutate(bookingModel)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col col-span-1 xl:col-span-2'>
      <h2 className='text-[22px] font-bold mb-10'>Guest Details</h2>
      
      <div className='grid md:grid-cols-2 gap-4 md:mb-4'>
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

      <div className='mb-8'>
        <div className='flex items-start gap-3'>
          <Checkbox
            size='sm'
            id='consent'
            checked={consent}
            onCheckedChange={(checked) => {
              setFormValue('consent', checked === true, { shouldValidate: true })
            }}
            className={errors.consent ? 'border-red' : ''}
          />
          <label 
            htmlFor='consent' 
            className='text-sm text-dark cursor-pointer leading-relaxed'
            onClick={() => setFormValue('consent', !consent, { shouldValidate: true })}
          >
            I agree to the{' '}
            <Link 
              href='/privacy-policy' 
              target='_blank'
              className='text-blue underline hover:text-blue/80'
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </Link>
          </label>
        </div>
        {errors.consent && (
          <span className='text-red text-xs mt-1 block pl-10'>{errors.consent.message}</span>
        )}
      </div>

      <div className='flex items-center gap-3 justify-start'>
        <Button 
          type='button' 
          variant='outline' 
          className='flex-1 max-w-[210px] h-[55px]'
          onClick={() => setBookingPage(1)}
          disabled={createBooking.isPending}
        >Back</Button>
        <Button 
          type='submit' 
          className='flex-1 max-w-[210px] h-[55px]'
          disabled={createBooking.isPending || !consent}
        >
          {createBooking.isPending ? 'Creating Booking...' : 'Continue'}
        </Button>
      </div>
    </form>
  )
}

export default GuestDetailsForm