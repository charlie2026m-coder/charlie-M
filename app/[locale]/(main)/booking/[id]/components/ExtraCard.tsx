'use client'
import Image from 'next/image'
import { Service } from '@/types/apaleo';
import AddUnlimitedExtra from './AddUnlimitedExtra';
import AddCheckoutExtra from './AddCheckout';
import AddCleaningExtra from './AddCleaningExtra';
import { Room } from '@/types/types'
import { useTranslations } from 'next-intl'
import { getExtraImage } from '@/lib/getExtraImage'

const ExtraCard = ({ item, rooms, nights }: { item: Service, rooms: Room[], nights: number }) => {
  const t = useTranslations('bookingForm')
  const isSoldOut = item.isSoldOut;
  const isCheckout = item.id === 'CMH-LCO' || item.id === 'CMH-ECI';
  const isParking = item.id === 'CMH-PRK' || item.name?.toLowerCase().includes('park');
  const isCleaning = item.id === 'CMH-CLN' || item.name?.toLowerCase().includes('clean');

  const coverImage = getExtraImage(item.id, item.name, item.imageUrl)

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

      <div className='flex flex-col'>
        <h3 className='inter font-semibold'>{item.name}</h3>
        <div className='text-green font-bold'>+ €{item.price.toFixed(2)}</div>
      </div>

      {!isSoldOut && (
        <div>
          {isCheckout
            ? <AddCheckoutExtra extra={item} rooms={rooms} />
            : isCleaning
              ? <AddCleaningExtra extra={item} rooms={rooms} />
              : <AddUnlimitedExtra extra={item} rooms={rooms} nights={nights} isParking={isParking} />
          }
        </div>
      )}
    </div>
  )
}

export default ExtraCard
