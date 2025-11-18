'use client'
import CustomInput from '@/app/_components/ui/customInput'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Switch } from '@/app/_components/ui/switch'
import { Label } from '@/app/_components/ui/label'
import { Button } from '@/app/_components/ui/button'
import { useBookingStore } from '@/store/bookingStore'
import { GuestDetailsFormData, guestDetailsSchema } from '@/types/schemas'


const GuestDetailsForm = () => {
  const { setBooking, booking, setValue } = useBookingStore()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestDetailsFormData>({
    resolver: zodResolver(guestDetailsSchema),
    defaultValues: {
      name: '',
      last_name: '',
      email: '',
      phone: '',
    },
  })

  const onSubmit = (data: GuestDetailsFormData) => {
    setBooking({ ...booking, firstName: data.name, lastName: data.last_name, email: data.email, mobile: data.phone })
    setValue(3,'bookingPage')
  }

  console.log(booking)
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
      <div className="flex items-center gap-2 mb-9">
        <Switch id="withoutAccount" checked={booking.withoutAccount} onCheckedChange={() => setBooking({ ...booking, withoutAccount: !booking.withoutAccount })} />
        <Label htmlFor="withoutAccount" className='text-[17px] font-[400]'>Continue without creating an account </Label>
      </div>

      <div className='flex items-center gap-3 justify-start'>
        <Button 
          type='button' 
          variant='outline' 
          className='w-[210px] h-[55px]'
          onClick={() => setValue(1,'bookingPage')}
        >Back</Button>
        <Button type='submit' className='w-[210px] h-[55px]'>Continue</Button>
      </div>
    </form>
  )
}

export default GuestDetailsForm