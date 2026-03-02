'use client'
import Image from 'next/image'
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog";
import { useState } from "react";
import { Service } from '@/types/apaleo';
import AddUnlimitedExtra from './AddUnlimitedExtra';
import AddCheckoutExtra from './AddCheckout';
import AddCleaningExtra from './AddCleaningExtra';
import { Room } from '@/types/types'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { getExtraImage, getExtraImages } from '@/lib/getExtraImage'
import { getTranslatedServiceName, getTranslatedServiceDescription } from '@/lib/utils'
import CustomImageSlider from '@/app/_components/ui/CustomImageSlider'

const ExtraCard = ({ item, rooms, nights }: { item: Service, rooms: Room[], nights: number }) => {
  const t = useTranslations('bookingForm')
  const params = useParams()
  const locale = params.locale as 'en' | 'de'
  const [isOpen, setIsOpen] = useState(false);
  const isSoldOut = item.isSoldOut;
  const isCheckout = item.id === 'CMH-LCO' || item.id === 'CMH-ECI';
  const isParking = item.id === 'CMH-PRK' || item.name?.toLowerCase().includes('park');
  const isCleaning = item.id === 'CMH-CLN' || item.name?.toLowerCase().includes('clean');

  const serviceName = getTranslatedServiceName(item.id, item.name, locale);
  const serviceDescription = getTranslatedServiceDescription(item.id, item.description || '', locale);
  const images = getExtraImages(item.id, item.name);
  const coverImage = getExtraImage(item.id, item.name)
  return (
    <div className='flex sm:flex-col gap-2 relative'>
      <div className='relative'>
        <div className='size-[80px] sm:w-full sm:h-[185px]'>
          <Image 
            src={coverImage} 
            alt={serviceName} 
            fill
            className='rounded-lg object-cover'
          />
          {isSoldOut && (
            <div className='absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center'>
              <span className='text-white font-bold text-sm sm:text-lg'>{t('soldOut')}</span>
            </div>
          )}
        </div>
      </div>
      {!isSoldOut &&<div>
        {isCheckout 
          ? <AddCheckoutExtra extra={item} rooms={rooms} /> 
          : isCleaning
            ? <AddCleaningExtra extra={item} rooms={rooms} />
            : <AddUnlimitedExtra extra={item} rooms={rooms} nights={nights} isParking={isParking} /> 
        }
      </div>}

      <div className='flex flex-col '>
        <h3 className='inter font-semibold'>{serviceName}</h3>
        <div className='text-green font-bold'>+ €{item.price.toFixed(2)}</div>
        
        <ClientCustomDialog 
          open={isOpen}
          setOpen={setIsOpen}
          trigger={<span className='text-brown underline cursor-pointer w-full'>{t('learnMore')}</span>} 
          content={
            <div className='flex flex-col '>
              {images.length > 1 ? (
                <CustomImageSlider images={images} />
              ) : (
                <Image src={coverImage} alt={serviceName || 'Extra'} width={185} height={185} className='w-full h-[185px] lg:h-[230px] xl:h-[350px] rounded-lg object-cover mb-7' />
              )}
              <div className='flex  justify-between items-center mb-4'>
                <div className='font-semibold text-lg'>{t('price')}</div>
                <div className='text-green font-bold text-xl'>+ €{item.price.toFixed(2)}<span className='text-base text-dark font-normal'></span></div>
              </div>
              <p className='text-dark'>
                {serviceDescription}
              </p>
            </div>
          } 
          title={serviceName} 
        /> 
      </div>
    </div>
  )
}

export default ExtraCard
