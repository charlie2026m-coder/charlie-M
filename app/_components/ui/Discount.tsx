'use client';

import { useState, useEffect } from 'react';
import { RiCloseLargeLine } from "react-icons/ri";
import { useTranslations } from 'next-intl';
import { useScrollStore } from '@/store/useScrollStore';

const Discount = () => {
  const t = useTranslations();
  const [isVisible, setIsVisible] = useState(false);
  const setDiscountClosed = useScrollStore(s => s.setDiscountClosed);

  useEffect(() => {
    const isClosed = sessionStorage.getItem('discountBannerClosed');
    if (!isClosed) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem('discountBannerClosed', 'true');
    setDiscountClosed(true);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className='w-full flex items-center bg-mute text-white'>
      <div className='container flex items-center justify-between p-2.5'>
        <div />
        <span>{t('discount.text')}</span>
        <RiCloseLargeLine 
          className='size-6 text-white/50 cursor-pointer hover:text-white transition-opacity' 
          onClick={handleClose}
        />
      </div>
    </div>
  );
}

export default Discount