import { Link } from '@/navigation';
import { FaArrowLeft } from "react-icons/fa6";
import { getTranslations } from 'next-intl/server';

export default async function BackButton() {
  const t = await getTranslations('profile');
  
  return (
    <Link href='/profile/reservations'>
      <div className='flex items-center gap-2 border-b pb-5 mb-5 cursor-pointer px-[30px]'>
        <FaArrowLeft /> {t('backToMyReservations')}
      </div>
    </Link>
  );
}
