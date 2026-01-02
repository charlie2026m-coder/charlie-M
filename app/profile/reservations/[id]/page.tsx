import { FaArrowLeft } from "react-icons/fa6";
import Link from 'next/link';

import UpgradeSection from './components/UpgradeSection';
import MainInfo from './components/MainInfo';
import AddExtras from './components/AddExtras';
import InformationSection from "./components/InformationSection";
import { getReservationById } from "@/services/getReservation";
import { getApaleoExtras } from "@/services/getExtras";
import { bookingStatuses } from "@/types/types";

const ReservationPage = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  const reservation = await getReservationById(id);
  const extras = await getApaleoExtras();
  const isActive = reservation?.status === bookingStatuses.Confirmed || reservation?.status === bookingStatuses.InHouse;
  const isUpcoming = reservation?.status === bookingStatuses.Confirmed;
  
  return (
    <div className='flex flex-col flex-1'>
      <Link href='/profile/reservations'>
        <div className='flex items-center gap-2 border-b pb-5 mb-5 cursor-pointer px-[30px]'>
          <FaArrowLeft /> Back to My Reservations
        </div>
      </Link>
      <MainInfo reservation={reservation} />
      {isUpcoming && <UpgradeSection />}
      {isActive && <AddExtras extras={extras} />}
      <InformationSection />
      
    </div>
  )
}

export default ReservationPage;


