'use client'
import { FaArrowLeft } from "react-icons/fa6";
import Link from 'next/link';

import UpgradeSection from './components/UpgradeSection';
import MainInfo from './components/MainInfo';
import AddExtras from './components/AddExtras';
import InformationSection from "./components/InformationSection";
import { useParams } from "next/navigation";
import { reservations } from "@/content/content";
const ReservationPage = () => {
  const { id } = useParams();
  const reservation = reservations.find((reservation) => reservation.id === Number(id));

  return (
    <div className='flex flex-col flex-1'>
      <Link href='/profile/reservations'>
        <div className='flex items-center gap-2 border-b pb-5 mb-5 cursor-pointer px-[30px]'>
          <FaArrowLeft /> Back to My Reservations
        </div>
      </Link>
      <MainInfo reservation={reservation} />
      <UpgradeSection />
      <AddExtras />
      <InformationSection />
      
    </div>
  )
}

export default ReservationPage;


