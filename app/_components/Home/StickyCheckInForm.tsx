'use client';

import { useState, useEffect, useRef } from 'react';
import CheckInForm from './CheckInForm';
import { UrlParams } from '@/types/apaleo';

interface StickyCheckInFormProps {
  params?: UrlParams;
}

const StickyCheckInForm = ({ params }: StickyCheckInFormProps) => {
  const [isSticky, setIsSticky] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const scrollDirection = scrollY > lastScrollY.current ? 'down' : 'up';
          const isAtTop = scrollY === 0;
          
          const stickyHeader = document.querySelector('[class*="fixed"][class*="top-0"]');
          const headerHeight = stickyHeader ? stickyHeader.clientHeight : 80;
          
          let isHeaderVisible = false;
          
          if (scrollY >= 400 && !isAtTop) {
            if (scrollDirection === 'up') {
              isHeaderVisible = true;
            } else {
              isHeaderVisible = false;
            }
          }
          
          const originalForm = document.querySelector('[data-checkin-form="original"]');
          
          if (originalForm && originalForm instanceof HTMLElement) {
            const rect = originalForm.getBoundingClientRect();
            
            const topThreshold = isHeaderVisible ? headerHeight + 8 : 8;
            const shouldBeSticky = rect.top <= topThreshold;
            
            if (shouldBeSticky) {
              originalForm.style.visibility = 'hidden';
              originalForm.style.opacity = '0';
              originalForm.style.pointerEvents = 'none';
            } else {
              originalForm.style.visibility = 'visible';
              originalForm.style.opacity = '1';
              originalForm.style.pointerEvents = 'auto';
            }
            
            if (shouldBeSticky !== isSticky) {
              setIsSticky(shouldBeSticky);
            }
            if (isHeaderVisible !== headerVisible) {
              setHeaderVisible(isHeaderVisible);
            }
          }
          
          lastScrollY.current = scrollY;
          ticking = false;
        });
        
        ticking = true;
      }
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      const originalForm = document.querySelector('[data-checkin-form="original"]');
      if (originalForm && originalForm instanceof HTMLElement) {
        originalForm.style.visibility = 'visible';
        originalForm.style.opacity = '1';
        originalForm.style.pointerEvents = 'auto';
      }
    };
  }, [isSticky, headerVisible]);

  if (!isSticky) {
    return null;
  }

  const stickyHeader = typeof window !== 'undefined' 
    ? document.querySelector('[class*="fixed"][class*="top-0"]') 
    : null;
  const headerHeight = stickyHeader ? stickyHeader.clientHeight : 80;

  const topPosition = headerVisible ? headerHeight + 8 : 8;

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-40 w-full max-w-[900px] shadow-xl rounded-[30px]"
      style={{
        top: `${topPosition}px`,
        transition: 'top 0.3s ease-out',
      }}
    >
      <CheckInForm params={params} />
    </div>
  );
};

export default StickyCheckInForm;
