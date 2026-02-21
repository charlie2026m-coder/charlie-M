'use client';

import { useTranslations } from 'next-intl';

const DevelopmentBanner = () => {
  const t = useTranslations();

  return (
    <div className='w-full flex items-center justify-center bg-red-600 text-white py-2.5 px-4 z-50'>
      <div className='container flex items-center justify-center text-center'>
        <span className='text-sm font-medium'>{t('developmentBanner.message')}</span>
      </div>
    </div>
  );
};

export default DevelopmentBanner;
