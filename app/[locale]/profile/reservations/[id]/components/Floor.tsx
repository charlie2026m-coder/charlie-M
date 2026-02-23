'use client'
import { useUnit } from '@/app/hooks/useUnit';
import { useTranslations } from 'next-intl';
import Dot from '@/app/_components/ui/dot';

interface FloorProps {
  unitId: string | null | undefined;
}

export const Floor = ({ unitId }: FloorProps) => {
  const t = useTranslations('profile');
  const { data, isLoading, error } = useUnit(unitId);

  // Log to console
  if (data) {
    console.log('✅ Unit floor fetched successfully:', data);
    console.log('📋 Floor:', data.floor);
  }

  if (error) {
    console.error('❌ Error fetching unit floor:', error);
  }

  // Don't render if no floor info or loading
  if (isLoading || !data?.floor) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-blue/10 p-4 mb-4">
      <h3 className="font-bold text-black mb-2">{t('whereToFindIt')}</h3>
      <div className="flex items-center gap-2 text-dark">
        <Dot size={12} color='blue' className='-mt-0.5' />
        <span>{t('locatedOnFloor', { floor: data.floor })}</span>
      </div>
    </div>
  );
};
