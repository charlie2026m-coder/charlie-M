'use client'
import Image from 'next/image'
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog";
import { useState } from "react";
import { Service } from '@/types/apaleo';
import AddUnlimitedExtra from './AddUnlimitedExtra';
import AddLimitedExtra from './AddLimitedExtra';
import AddCheckoutExtra from './AddCheckout';
import AddCleaningExtra from './AddCleaningExtra';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { getExtraImage, getExtraImages } from '@/lib/getExtraImage';
import CustomImageSlider from '@/app/_components/ui/CustomImageSlider';

const ExtraCard = ({ item, adults, nights, existingCount = 0, existingDates = [], existingDatesWithCount = [], arrival, departure, bundleServices }: { item: Service, adults: number, nights: number, existingCount?: number, existingDates?: string[], existingDatesWithCount?: any[], arrival?: string, departure?: string, bundleServices?: Service[] }) => {
  const t = useTranslations('profile');
  const params = useParams();
  const locale = params.locale as 'en' | 'de';
  const [isOpen, setIsOpen] = useState(false);
  const isUnlimited = item.unlimited;
  const isBabyBed = item.id === 'CMH-BAB';
  const isParking = item.id === 'CMH-PRK' || item.id.includes('PRK');
  const isCleaning = item.id === 'CMH-CLN' || item.name?.toLowerCase().includes('clean');
  
  const checkBabyBedAvailability = () => {
    if (isBabyBed) {
      const allTimeSlices = item.timeSlices || [];
      if (allTimeSlices.length === 0) return false;
      const allAvailable = allTimeSlices.every(ts => ts.availableCount > 0);
      return allAvailable;
    }
    return true;
  };
  
  const checkParkingAvailability = () => {
    if (isParking) return (item.minAvailable || 0) > 0;
    return true;
  };
  
  const isSoldOut = item.isSoldOut || (isBabyBed && !checkBabyBedAvailability()) || (isParking && !checkParkingAvailability());
  const isCheckout = item.id === 'CMH-LCO' || item.id === 'CMH-ECI' || item.id === 'CMH-BAB' || isParking;
  const pricingType = item.pricingType;

  const serviceName = item.name;
  const serviceDescription = item.description ?? '';
  const images = getExtraImages(item.id, item.name, item.imageUrl);
  const coverImage = getExtraImage(item.id, item.name, item.imageUrl)
  return (
    <div className='flex sm:flex-col gap-2 relative'>
      <div className='relative'>
        <div className='size-[60px] sm:w-full sm:h-[160px]'>
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
      {!isSoldOut && <div>
        {isCheckout 
          ? <AddCheckoutExtra extra={item} adults={adults} nights={nights} existingCount={existingCount} /> 
          : isCleaning
            ? <AddCleaningExtra extra={item} existingDatesWithCount={existingDatesWithCount} arrival={arrival} departure={departure} />
            : isUnlimited
              ? <AddUnlimitedExtra extra={item} adults={adults} nights={nights} existingCount={existingCount} bundleServices={bundleServices} />
              : <AddLimitedExtra extra={item} adults={adults} nights={nights} existingCount={existingCount} existingDates={existingDates} />
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
                <div className='font-semibold text-lg'>{t('price')}:</div>
                <div className='text-green font-bold text-xl'>+ €{item.price.toFixed(2)}<span className='text-base text-dark font-normal'>( {pricingType === 'Daily' ? t('perDay') : t('oneTime')} )</span></div>
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
