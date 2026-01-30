'use client'
import { Link } from '@/navigation';
import { FaArrowLeft } from "react-icons/fa6";

export default function BackButton() {
  return (
    <Link href='/profile/reservations'>
      <div className='flex items-center gap-2 border-b pb-5 mb-5 cursor-pointer px-[30px]'>
        <FaArrowLeft /> Back to My Reservations
      </div>
    </Link>
  );
}
