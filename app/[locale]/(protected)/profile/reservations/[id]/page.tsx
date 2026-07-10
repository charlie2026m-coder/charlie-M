import MainInfo from './components/MainInfo';
import BackButton from './components/BackButton';
import AddExtras from './components/AddExtras';
import InformationSection from "./components/InformationSection";
import { getReservationById } from "@/services/getReservation";
import { getApaleoExtras } from '@/app/actions/apaleo/services/getExtras';
import { bookingStatuses } from "@/types/types";
import ErrorCard from "@/app/[locale]/(main)/rooms/components/ErrorCard";
import dayjs from "dayjs";
import Contacts from "./components/Contacts";
import ExtandYourStay from "./components/ExtandYourStay";
import { Suspense } from 'react';

const ReservationPage = async ({ params }: { params: Promise<{ id: string; locale: string }> }) => {
  const { id, locale } = await params;
  const reservation = await getReservationById(id);
  if(!reservation) return <ErrorCard isSingleRoom={false} />
  // Convert ISO date strings to YYYY-MM-DD format
  const arrivalDate = dayjs(reservation.arrival).format('YYYY-MM-DD');
  const departureDate = dayjs(reservation.departure).format('YYYY-MM-DD');

  // Already-applied Late Check-Out / Early Check-In: the amend moved the
  // reservation's wall-clock time to 13:00. Read it straight from the ISO string
  // (NOT via dayjs, which would shift the +02:00 Berlin time into UTC on the
  // server) so we can hide a card the guest can no longer re-buy.
  // ECI uses `< '15:00'` (not `=== '13:00'`): the Room-Ready webhook moves
  // arrivals to 13:00+ (e.g. 13:47) when the room is cleaned early — an exact
  // match would re-show the buyable ECI card to a guest who already has an
  // earlier arrival. Departure is never moved, so LCO stays an exact match.
  // Zero-padded HH:mm ⇒ lexical `<` is chronological.
  const lcoApplied = reservation.departure.match(/T(\d{2}:\d{2})/)?.[1] === '13:00';
  const eciArrivalTime = reservation.arrival.match(/T(\d{2}:\d{2})/)?.[1] ?? '';
  const eciApplied = eciArrivalTime !== '' && eciArrivalTime < '15:00';

  // Check if reservation is active and not in the past
  const isActive = reservation?.status === bookingStatuses.Confirmed || reservation?.status === bookingStatuses.InHouse;
  const isNotPast = dayjs(departureDate).isAfter(dayjs(), 'day') || dayjs(departureDate).isSame(dayjs(), 'day');
  const canAddExtras = isActive && isNotPast;
  
  const today = dayjs().format('YYYY-MM-DD');
  const extrasStartDate = dayjs(arrivalDate).isBefore(today, 'day') || dayjs(arrivalDate).isSame(today, 'day')
    ? today
    : arrivalDate;
  

  const nightsDiff = dayjs(departureDate).startOf('day').diff(dayjs(extrasStartDate).startOf('day'), 'day');
  const nights = nightsDiff === 0 ? 1 : nightsDiff;
  
  // Only fetch extras if reservation is active and not past
  const extras = canAddExtras ? await getApaleoExtras(extrasStartDate, departureDate, locale) : [];
  return (
    <div >
      <div className='flex flex-col flex-1 p-3 lg:p-[30px]'>
        <BackButton />
        <Suspense fallback={<div>Loading...</div>}>
          <MainInfo reservation={reservation} />
        </Suspense>
        <ExtandYourStay 
          existingServices={reservation.services} 
          nights={nights}
          arrival={arrivalDate}
          departure={departureDate}
          availableExtras={extras}
          unitGroupId={reservation.unitGroup?.id}
          adults={reservation.adults}
          children={reservation.childrenAges?.length || 0}
          booker={reservation.booker}
          primaryGuest={reservation.primaryGuest}
        />
        {canAddExtras && extras.length > 0 && (
          <AddExtras
            extras={extras}
            existingServices={reservation.services}
            adults={reservation.adults}
            nights={nights}
            isBabyBedAvailable={reservation.attributes?.includes('kids')}
            arrival={arrivalDate}
            departure={departureDate}
            lcoApplied={lcoApplied}
            eciApplied={eciApplied}
          />
        )}
        
        <InformationSection />
      </div>
      <Contacts />
    </div>
  )
}

export default ReservationPage;


