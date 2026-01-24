'use client';

import { useState, useEffect } from 'react';
import CheckInForm from '@/app/[locale]/home/components/CheckInForm';
import { UrlParams } from '@/types/apaleo';

interface StickyCheckInFormRoomsProps {
  params?: UrlParams;
}

const StickyCheckInFormRooms = ({ params }: StickyCheckInFormRoomsProps) => {
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Check if sticky header is visible
      const stickyHeader = document.querySelector('[class*="fixed"][class*="top-0"]');
      if (stickyHeader) {
        const isVisible = stickyHeader.classList.contains('translate-y-0');
        setHeaderVisible(isVisible);
      } else {
        setHeaderVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const topPosition = headerVisible ? 76 : 4; // 88px with header, 8px without

  return (
    <div 
      className="sticky z-40 mb-5  transition-all duration-300"
      style={{ top: `${topPosition}px` }}
    >
      <CheckInForm 
        className="w-full shadow-xl mx-auto"
        params={params}  
      />
    </div>
  );
};

export default StickyCheckInFormRooms;

