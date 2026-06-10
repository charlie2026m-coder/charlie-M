'use client';

import Header from './Header';
import { cn } from '@/lib/utils';
import { useScrollStore } from '@/store/useScrollStore';

interface StickyHeaderProps {
  locale: string;
  isWhite?: boolean;
}

const StickyHeader = ({ locale, isWhite = false }: StickyHeaderProps) => {
  const isVisible = useScrollStore(s => s.isHeaderVisible);

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-white/95 shadow-lg ease-out transition-transform duration-300',
        isVisible ? 'translate-y-0' : '-translate-y-full'
      )}
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        opacity: isVisible ? 1 : 0,
        transitionDuration: '300ms',
      }}
    >
      <Header locale={locale} isWhite={isWhite} />
    </div>
  );
};

export default StickyHeader;
