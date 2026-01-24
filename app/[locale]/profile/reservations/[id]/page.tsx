import { FaArrowLeft } from "react-icons/fa6";
import { Link } from '@/navigation';
import MainInfo from './components/MainInfo';
import AddExtras from './components/AddExtras';
import InformationSection from "./components/InformationSection";
import { getReservationById } from "@/services/getReservation";
import { getApaleoExtras } from "@/services/getExtras";
import { bookingStatuses } from "@/types/types";
import ErrorCard from "@/app/[locale]/rooms/components/ErrorCard";
import dayjs from "dayjs";
import Contacts from "./components/Contacts";

const ReservationPage = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  const reservation = await getReservationById(id);
  if(!reservation) return <ErrorCard isSingleRoom={false} />
  console.log(reservation, 'reservation')
  
  // Convert ISO date strings to YYYY-MM-DD format
  const arrivalDate = dayjs(reservation.arrival).format('YYYY-MM-DD');
  const departureDate = dayjs(reservation.departure).format('YYYY-MM-DD');
  
  const extras = await getApaleoExtras(arrivalDate, departureDate);
  const isActive = reservation?.status === bookingStatuses.Confirmed || reservation?.status === bookingStatuses.InHouse;
  
  return (
    <div >
      <div className='flex flex-col flex-1 p-3 lg:p-[30px]'>
        <Link href='/profile/reservations'>
          <div className='flex items-center gap-2 border-b pb-5 mb-5 cursor-pointer px-[30px]'>
            <FaArrowLeft /> Back to My Reservations
          </div>
        </Link>
        <MainInfo reservation={reservation} />
        {isActive && <AddExtras extras={extras} />}
        
        <InformationSection />
      </div>
      <Contacts />
    </div>
  )
}

export default ReservationPage;


