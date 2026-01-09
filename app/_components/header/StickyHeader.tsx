'use client';

import { useState, useEffect, useRef } from 'react';
import Header from './Header';
import { cn } from '@/lib/utils';

interface StickyHeaderProps {
  locale: string;
  isWhite?: boolean;
}

const StickyHeader = ({ locale, isWhite = false }: StickyHeaderProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;
    let isInitialLoad = true;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const scrollDirection = scrollY > lastScrollY.current ? 'down' : 'up';
          const isAtTop = scrollY === 0;
          
          if (isInitialLoad) {
            isInitialLoad = false;
            lastScrollY.current = scrollY;
            ticking = false;
            return;
          }
          
          // If scroll < 100, never show menu - just return
          if (scrollY < 400 && !isAtTop) {
            lastScrollY.current = scrollY;
            ticking = false;
            return;
          }
          
          lastScrollY.current = scrollY;
          
          if (isAtTop) {
            if (isVisible && !isFading) {
              setIsFading(true);
              setOpacity(0);
              setTimeout(() => {
                setIsVisible(false);
                setIsFading(false);
              }, 800);
            }
          } else {
            if (scrollDirection === 'down') {
              if (isVisible) {
                setIsFading(false);
                setOpacity(1);
                setIsVisible(false);
              }
            } else {
              if (!isVisible) {
                setIsFading(false);
                setOpacity(1);
                setIsVisible(true);
              } else {
                setIsFading(false);
                setOpacity(1);
              }
            }
          }
          
          ticking = false;
        });
        
        ticking = true;
      }
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isVisible]);

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-white/95 shadow-lg ease-out',
        isVisible ? 'translate-y-0' : '-translate-y-full',
        isFading ? 'transition-opacity' : 'transition-transform'
      )}
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        opacity: opacity,
        transitionDuration: isFading ? '500ms' : '300ms',
      }}
    >
      <Header locale={locale} isWhite={isWhite} />
    </div>
  );
};

export default StickyHeader;
