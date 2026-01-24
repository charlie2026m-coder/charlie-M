'use client'
import Image from "next/image";
import { useBookingStore } from "@/store/useBookingStore";
import { Button } from "@/app/_components/ui/button";
import { useRouter } from 'next/navigation';
import Steps from "../components/Steps";
import { MdCheckCircle } from "react-icons/md";
import SummaryCard from "../components/SummaryCard";
const SuccessPage = () => {
  const booking = useBookingStore(state => state.booking)
  const router = useRouter()
  return (
    <>
      <Steps currentStep={3} />
      <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 pb-[30px]'>
        <div className='col-span-1 xl:col-span-2 flex flex-col py-10'>
          <div className='w-full flex gap-3 py-2.5  items-center justify-center text-green-600 bg-green-600/10 rounded-full mb-6'>
            <MdCheckCircle className='size-5' />
            <h2 className='text-[18px] font-bold text-center'>Success</h2>
          </div>
          <p className='text-dark text-center mb-5'>You have successfully booked a room. We have sent you detailed information to your email address: </p>
          <Image 
            src='/images/booking-completed.svg' 
            alt='success' 
            width={375}
            height={344}

            className='w-[375px] h-[344px] mx-auto object-cover mb-4'
          />
          <p className='font-medium inter  text-center mb-5'>{booking?.booker?.email}</p>
          <Button className='mx-auto' onClick={() => router.push('/')}>Back to Homepage</Button>
        </div>
        <SummaryCard />

      </div>
    </>
  )
}

export default SuccessPage
