'use client'
import Image from 'next/image'
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog";
import { useState } from "react";
import { Service } from '@/types/apaleo';
import AddUnlimitedExtra from './AddUnlimitedExtra';
import { RoomOffer } from '@/types/offers';
import AddLimitedExtra from './AddLimitedExtra';
import AddCheckoutExtra from './AddCheckout';
import { Room } from '@/types/types'
import { useTranslations } from 'next-intl'
import { getExtraImage, getExtraImages } from '@/lib/getExtraImage'
import CustomImageSlider from '@/app/_components/ui/CustomImageSlider'

const ExtraCard = ({ item, room, guests, rooms, nights }: { item: Service, room: RoomOffer, guests: number, rooms: Room[], nights: number }) => {
  const t = useTranslations('bookingForm')
  const [isOpen, setIsOpen] = useState(false);
  const isUnlimited = item.unlimited;
  const isSoldOut = item.isSoldOut;
  const isCheckout = item.id === 'CMH-LCO' || item.id === 'CMH-ECI';

  // Получаем все изображения для слайдера
  const images = getExtraImages(item.id, item.name);
  // Первое изображение для обложки карточки
  const coverImage = getExtraImage(item.id, item.name)
  return (
    <div className='flex sm:flex-col gap-2 relative'>
      <div className='relative'>
        <div className='size-[80px] sm:w-full sm:h-[185px]'>
          <Image 
            src={coverImage} 
            alt={item.name} 
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
          : isUnlimited 
            ? <AddUnlimitedExtra extra={item} room={room} guests={guests} rooms={rooms} nights={nights} /> 
            : <AddLimitedExtra extra={item} rooms={rooms} room={room} guests={guests} />
        }
      </div>}

      <div className='flex flex-col '>
        <h3 className='inter font-semibold'>{item.name}</h3>
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
                <Image src={coverImage} alt={item.name || 'Extra'} width={185} height={185} className='w-full h-[185px] lg:h-[230px] xl:h-[350px] rounded-lg object-cover mb-7' />
              )}
              <div className='flex  justify-between items-center mb-4'>
                <div className='font-semibold text-lg'>{t('price')}</div>
                <div className='text-green font-bold text-xl'>+ €{item.price.toFixed(2)}<span className='text-base text-dark font-normal'></span></div>
              </div>
              <p className='text-dark'>
                {item.description}
              </p>
            </div>
          } 
          title={item.name} 
        /> 
      </div>
    </div>
  )
}

export default ExtraCard
