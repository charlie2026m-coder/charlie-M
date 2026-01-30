import MainInfo from './components/MainInfo';
import BackButton from './components/BackButton';
import AddExtras from './components/AddExtras';
import InformationSection from "./components/InformationSection";
import { getReservationById } from "@/services/getReservation";
import { getApaleoExtras } from "@/services/getExtras";
import { bookingStatuses } from "@/types/types";
import ErrorCard from "@/app/[locale]/rooms/components/ErrorCard";
import dayjs from "dayjs";
import Contacts from "./components/Contacts";
import ExtandYourStay from "./components/ExtandYourStay";

const ReservationPage = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  const reservation = await getReservationById(id);
  if(!reservation) return <ErrorCard isSingleRoom={false} />
  
  // Convert ISO date strings to YYYY-MM-DD format
  const arrivalDate = dayjs(reservation.arrival).format('YYYY-MM-DD');
  const departureDate = dayjs(reservation.departure).format('YYYY-MM-DD');
  
  // Check if reservation is active and not in the past
  const isActive = reservation?.status === bookingStatuses.Confirmed || reservation?.status === bookingStatuses.InHouse;
  const isNotPast = dayjs(departureDate).isAfter(dayjs(), 'day') || dayjs(departureDate).isSame(dayjs(), 'day');
  const canAddExtras = isActive && isNotPast;
  
  // For extras, use tomorrow if arrival is today or in the past
  const today = dayjs().format('YYYY-MM-DD');
  const extrasStartDate = dayjs(arrivalDate).isBefore(today, 'day') || dayjs(arrivalDate).isSame(today, 'day')
    ? dayjs().add(1, 'day').format('YYYY-MM-DD')
    : arrivalDate;
  
  // Calculate nights for extras (from extrasStartDate to departure)
  const nights = dayjs(departureDate).startOf('day').diff(dayjs(extrasStartDate).startOf('day'), 'day');
  
  // Only fetch extras if reservation is active and not past
  const extras = canAddExtras ? await getApaleoExtras(extrasStartDate, departureDate) : [];

  return (
    <div >
      <div className='flex flex-col flex-1 p-3 lg:p-[30px]'>
        <BackButton />
        <MainInfo reservation={reservation} />
        {canAddExtras && (
          <ExtandYourStay 
            existingServices={reservation.services} 
            nights={nights}
            arrival={arrivalDate}
            departure={departureDate}
            availableExtras={extras}
          />
        )}
        {canAddExtras && extras.length > 0 && (
          <AddExtras 
            extras={extras}
            existingServices={reservation.services}
            adults={reservation.adults}
            nights={nights}
          />
        )}
        
        <InformationSection />
      </div>
      <Contacts />
    </div>
  )
}

export default ReservationPage;


