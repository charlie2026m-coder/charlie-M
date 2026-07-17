'use client'
import Image from 'next/image'
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog";
import { useRef, useState } from "react";
import { Service } from '@/types/apaleo';
import AddUnlimitedExtra from './AddUnlimitedExtra';
import AddLimitedExtra from './AddLimitedExtra';
import AddCheckoutExtra from './AddCheckout';
import AddCleaningExtra from './AddCleaningExtra';
import { useTranslations } from 'next-intl';
import { getExtraImage, getExtraImages } from '@/lib/getExtraImage';
import CustomImageSlider from '@/app/_components/ui/CustomImageSlider';

const ExtraCard = ({ item, adults, nights, existingCount = 0, existingDates = [], existingDatesWithCount = [], arrival, departure, bundleServices }: { item: Service, adults: number, nights: number, existingCount?: number, existingDates?: string[], existingDatesWithCount?: unknown[], arrival?: string, departure?: string, bundleServices?: Service[] }) => {
  const t = useTranslations('profile');
  const [isOpen, setIsOpen] = useState(false);
  const addTriggerRef = useRef<HTMLDivElement>(null);
  const isUnlimited = item.unlimited;
  const isBabyBed = item.id === 'CMH-BAB';
  const isParking = item.id === 'CMH-PRK' || item.id.includes('PRK');
  const isCleaning = item.id === 'CMH-CLN' || item.name?.toLowerCase().includes('clean');

  const checkBabyBedAvailability = () => {
    if (isBabyBed) {
      const allTimeSlices = item.timeSlices || [];
      if (allTimeSlices.length === 0) return false;
      return allTimeSlices.every(ts => ts.availableCount > 0);
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

  const images = getExtraImages(item.id, item.name, item.imageUrl);
  const coverImage = getExtraImage(item.id, item.name, item.imageUrl);

  return (
    <div className="flex flex-row items-center gap-3 rounded-2xl border border-light1 bg-white p-2.5 sm:flex-col sm:items-stretch sm:gap-0 sm:transition-shadow sm:hover:shadow-md">
      {/* Image — compact square on phones (whole row opens details), full-width
          cover with title overlay on larger screens */}
      <div
        className="relative size-[76px] shrink-0 overflow-hidden rounded-xl cursor-pointer sm:size-auto sm:w-full sm:h-[170px]"
        onClick={() => setIsOpen(true)}
      >
        <Image src={coverImage} alt={item.name} fill className="object-cover" />
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-[10px] sm:text-lg text-center px-1">{t('soldOut')}</span>
          </div>
        )}

        {/* Info icon — opens detail dialog (desktop; on phones the row itself is tappable) */}
        <button
          className="hidden sm:flex absolute top-2.5 right-2.5 cursor-pointer z-10 bg-dark-gold w-8 h-8 rounded-[6px] items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setIsOpen(true) }}
        >
          <Image src="/images/info-icon.svg" alt="Info" width={24} height={24} />
        </button>

        {/* Title overlay on image (desktop) */}
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
          <h3 className="text-white font-bold text-sm leading-tight">{item.name}</h3>
        </div>
      </div>

      {/* Phone middle column: name + price, tappable for details */}
      <div className="flex-1 min-w-0 sm:hidden cursor-pointer" onClick={() => setIsOpen(true)}>
        <h3 className="inter font-bold text-[14px] leading-tight line-clamp-2">{item.name}</h3>
        <div className="mt-1 text-dark-gold font-black text-[13px]">
          + €{item.price % 1 === 0 ? item.price.toFixed(0) : item.price.toFixed(2)}{' '}
          {pricingType === 'Daily' && (
            <span className="text-[11px] text-dark-gold font-[550]">({t('perDay')})</span>
          )}
        </div>
      </div>

      {/* Detail dialog */}
      <ClientCustomDialog
        open={isOpen}
        setOpen={setIsOpen}
        trigger={<span />}
        content={
          <div className="flex flex-col">
            {images.length > 1 ? (
              <CustomImageSlider images={images} />
            ) : (
              <Image src={coverImage} alt={item.name || 'Extra'} width={185} height={185} className="w-full h-[185px] lg:h-[230px] xl:h-[350px] rounded-lg object-cover mb-7" />
            )}
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold text-lg">{t('price')}:</div>
              <div className="text-dark-gold font-bold text-xl">
                + €{item.price.toFixed(2)}
                <span className="text-base text-dark font-normal">( {pricingType === 'Daily' ? t('perDay') : t('oneTime')} )</span>
              </div>
            </div>
            <p className="text-dark">{item.description ?? ''}</p>

            {!isSoldOut && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-[45px] max-w-[148px] lg:max-w-[195px] flex-1 border border-gray-300 rounded-lg py-3 text-center cursor-pointer hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setTimeout(() => {
                      const btn = addTriggerRef.current?.querySelector('button');
                      btn?.click();
                    }, 300);
                  }}
                  className="h-[45px] max-w-[148px] lg:max-w-[195px] flex-1 bg-dark-gold text-white rounded-lg py-3 text-center cursor-pointer hover:bg-dark-gold/90 transition-colors font-medium"
                >
                  {t('add')}
                </button>
              </div>
            )}
          </div>
        }
        title={item.name}
      />

      {/* Price line (desktop card body) */}
      <div className="hidden sm:flex items-center justify-between pt-2">
        <span className="font-semibold text-[15px]">{t('price')}:</span>
        <span className="text-dark-gold font-black text-[15px]">
          + €{item.price % 1 === 0 ? item.price.toFixed(0) : item.price.toFixed(2)}{' '}
          {pricingType === 'Daily' && (
            <span className="text-[13px] text-dark-gold font-[550]">({t('perDay')})</span>
          )}
        </span>
      </div>

      {/* Add control — compact on phones (right of the row), full-width in the
          card body on larger screens. bundleServices keeps the breakfast split. */}
      {!isSoldOut && (
        <div ref={addTriggerRef} className="w-[86px] shrink-0 sm:w-auto sm:mt-1.5">
          {isCheckout ? (
            <AddCheckoutExtra extra={item} adults={adults} nights={nights} existingCount={existingCount} />
          ) : isCleaning ? (
            <AddCleaningExtra extra={item} existingDatesWithCount={existingDatesWithCount} arrival={arrival} departure={departure} />
          ) : isUnlimited ? (
            <AddUnlimitedExtra extra={item} adults={adults} nights={nights} existingCount={existingCount} bundleServices={bundleServices} />
          ) : (
            <AddLimitedExtra extra={item} adults={adults} nights={nights} existingCount={existingCount} existingDates={existingDates} />
          )}
        </div>
      )}
    </div>
  )
}

export default ExtraCard
