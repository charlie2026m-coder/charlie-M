'use client';

import CheckInForm from './CheckInForm';
import { UrlParams } from '@/types/apaleo';
import { useScrollStore, STICKY_HEADER_HEIGHT } from '@/store/useScrollStore';

interface StickyCheckInFormProps {
  params?: UrlParams;
}

const StickyCheckInForm = ({ params }: StickyCheckInFormProps) => {
  const isStickyActive = useScrollStore(s => s.isHomeStickyActive);
  const isHeaderVisible = useScrollStore(s => s.isHeaderVisible);

  if (!isStickyActive) return null;

  const top = isHeaderVisible ? STICKY_HEADER_HEIGHT + 8 : 8;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-32px)] md:w-full max-w-[900px] shadow-xl rounded-full"
      style={{
        top: `${top}px`,
        transition: 'top 0.3s ease-out',
      }}
    >
      <CheckInForm params={params} className='w-full' />
    </div>
  );
};

export default StickyCheckInForm;
