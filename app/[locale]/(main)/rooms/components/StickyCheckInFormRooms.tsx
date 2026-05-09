'use client';

import CheckInForm from '@/app/[locale]/_home/components/CheckInForm';
import { UrlParams } from '@/types/apaleo';
import { useScrollStore } from '@/store/useScrollStore';

interface StickyCheckInFormRoomsProps {
  params?: UrlParams;
}

const StickyCheckInFormRooms = ({ params }: StickyCheckInFormRoomsProps) => {
  const isHeaderVisible = useScrollStore(s => s.isHeaderVisible);
  const top = isHeaderVisible ? 76 : 4;

  return (
    <div
      className="sticky z-40 mb-5 transition-all duration-300"
      style={{ top: `${top}px` }}
    >
      <CheckInForm
        className="w-full shadow-xl mx-auto"
        params={params}
      />
    </div>
  );
};

export default StickyCheckInFormRooms;
