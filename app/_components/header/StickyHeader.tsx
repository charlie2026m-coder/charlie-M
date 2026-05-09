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
  const isAtTop = useScrollStore(s => s.scrollY < 60);

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-white/95 shadow-lg ease-out',
        isVisible
          ? 'translate-y-0 opacity-100 transition-all duration-300'
          : isAtTop
            ? 'translate-y-0 opacity-0 pointer-events-none transition-opacity duration-500'
            : '-translate-y-full opacity-100 transition-transform duration-300'
      )}
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <Header locale={locale} isWhite={isWhite} />
    </div>
  );
};

export default StickyHeader;
