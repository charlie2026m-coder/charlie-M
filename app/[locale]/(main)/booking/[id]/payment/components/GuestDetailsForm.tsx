'use client'
import { useEffect, useState } from 'react'
import CustomInput from '@/app/_components/ui/customInput'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/app/_components/ui/button'
import { Checkbox } from '@/app/_components/ui/checkbox'
import { useBookingStore } from '@/store/useBookingStore'
import { GuestDetailsFormData, guestDetailsSchema } from '@/types/schemas'
import { Link, useRouter } from '@/navigation'
import LoadingDots from '@/app/_components/ui/LoadingDots'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { CountrySelect } from '@/app/_components/ui/CountrySelect'

interface GuestDetailsFormProps {
  onSubmit: (data: GuestDetailsFormData) => void
  isLoading?: boolean
}

const GuestDetailsForm = ({ onSubmit,  isLoading = false }: GuestDetailsFormProps) => {
  const t = useTranslations('payment')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as 'en' | 'de'
  const defaultValues = {
    name: '', 
    last_name: '', 
    email: '', 
    phone: '', 
    company_name: '',
    street_address: '',
    house_number: '',
    postal_code: '',
    city: '',
    country: '',
    consent: false
  }
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue: setFormValue, control } = useForm<GuestDetailsFormData>({ 
    resolver: zodResolver(guestDetailsSchema), 
    defaultValues,
  })
  const consent = watch('consent')
  const booking = useBookingStore(state => state.booking)
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
        // Get address data
    const addressData = (bookerData as any)?.address || (guestData as any)?.address
    const streetAddress = addressData?.addressLine1 || ''
    const houseNumber = addressData?.addressLine2 || ''
    const postalCode = addressData?.postalCode || ''
    const city = addressData?.city || ''
    const country = addressData?.countryCode || ''
    
    // Get company data
    const companyData = (bookerData as any)?.company || (guestData as any)?.company
    const companyName = companyData?.name || ''
    
    if (firstName || lastName || email || phone) {
      reset({
        name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        company_name: companyName,
        street_address: streetAddress,
        house_number: houseNumber,
        postal_code: postalCode,
        city: city,
        country: country,
        consent: false,
      })
    }
  }, [booking, reset, isHydrated])

  const handleBack = () => {
    router.back()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col col-span-1 xl:col-span-2'>
      <h2 className='text-[22px] font-bold mb-10'>{t('guestDetails')}</h2>
      
      <div className='grid md:grid-cols-2 gap-4 md:mb-4'>
        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register} 
            name='name' 
            type='text' 
            placeholder={`${t('name')} *`}
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
            placeholder={`${t('lastName')} *`}
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
            placeholder={`${t('email')} *`}
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
            placeholder={`${t('phone')} *`}
            icon='phone'
            isError={!!errors.phone}
          />
          {errors.phone && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.phone.message}</span>
          )}
        </div>
      </div>

      <h3 className='text-[18px] font-bold mb-4 mt-6'>{t('addressDetails')}</h3>
      
      <div className='grid md:grid-cols-2 gap-4 md:mb-4'>
        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register}
            name='company_name' 
            type='text' 
            placeholder={t('companyName')}
            icon='company'
            isError={!!errors.company_name}
          />
          {errors.company_name && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.company_name.message}</span>
          )}
        </div>

        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register}
            name='street_address' 
            type='text' 
            placeholder={`${t('streetAddress')} *`}
            icon='postal'
            isError={!!errors.street_address}
          />
          {errors.street_address && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.street_address.message}</span>
          )}
        </div>

        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register}
            name='house_number' 
            type='text' 
            placeholder={`${t('houseNumber')} *`}
            icon='postal'
            isError={!!errors.house_number}
          />
          {errors.house_number && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.house_number.message}</span>
          )}
        </div>

        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register}
            name='postal_code' 
            type='text' 
            placeholder={`${t('postalCode')} *`}
            icon='postal'
            isError={!!errors.postal_code}
          />
          {errors.postal_code && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.postal_code.message}</span>
          )}
        </div>

        <div className='relative flex flex-col gap-1 pb-5'>
          <CustomInput 
            register={register}
            name='city' 
            type='text' 
            placeholder={`${t('city')} *`}
            icon='postal'
            isError={!!errors.city}
          />
          {errors.city && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.city.message}</span>
          )}
        </div>

        <div className='relative flex flex-col gap-1 pb-5'>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <CountrySelect
                value={field.value || ''}
                onValueChange={field.onChange}
                locale={locale}
                placeholder={`${t('country')} *`}
                searchPlaceholder={locale === 'en' ? 'Search country...' : 'Land suchen...'}
                emptyText={locale === 'en' ? 'No country found.' : 'Kein Land gefunden.'}
                error={!!errors.country}
              />
            )}
          />
          {errors.country && (
            <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.country.message}</span>
          )}
        </div>
      </div>

      <div className='mb-8'>
        <div className='flex items-center gap-3'>
          <Checkbox
            size='sm'
            id='consent'
            checked={consent}
            onCheckedChange={(checked) => {
              setFormValue('consent', checked === true, { shouldValidate: true })
            }}
            className={errors.consent ? 'border-red' : ''}
          />
          <div className='text-sm text-dark cursor-pointer leading-relaxed' >
            {t('agreeToThe')}{' '}
            <Link 
              href='/privacy-policy' 
              locale={locale}
              target='_blank'
              className='text-blue underline hover:text-blue/80'
              onClick={(e) => e.stopPropagation()}
            >
              {t('privacyPolicy')}
            </Link>
            {' *'}
          </div>
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
          onClick={handleBack}
          disabled={isLoading}
        >{t('back')}</Button>
        <Button 
          type='submit' 
          className='flex-1 max-w-[210px] h-[55px]'
          disabled={isLoading || !consent}
        >
          {isLoading ? <LoadingDots /> : t('continue')}
        </Button>
      </div>
    </form>
  )
}

export default GuestDetailsForm