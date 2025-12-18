'use client'
import { FaArrowLeft } from "react-icons/fa6";
import Link from 'next/link';

import UpgradeSection from './components/UpgradeSection';
import MainInfo from './components/MainInfo';
import AddExtras from './components/AddExtras';
import InformationSection from "./components/InformationSection";

const ReservationPage = () => {
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



const reservation = {
  id: 1,
  checkInStatus: 'Pending Check-in', 
  name: 'Cozy Retreat Suite',
  date: '2025-01-01',
  checkIn: '2025-01-01',
  checkOut: '2025-01-02',
  status: 'upcoming',
  image: '/images/reservation_1.jpg',
  category: 'Suite',
  people: 2,
  roomSize: 50,
  roomType: 'Suite',
  hasBalcony: true,
  price: 1245.50,
  code: 123456,
  roomNumber: 101,
}

