import { PiSealCheckFill } from "react-icons/pi";
import Image from "next/image";
import { useBookingStore } from "@/store/useBookingStore";
import { Button } from "@/app/_components/ui/button";
import { useRouter } from "next/navigation";
const SuccessSection = () => {
  const booking = useBookingStore(state => state.booking)
  const router = useRouter()
  return (
    <div className='col-span-1 xl:col-span-2 flex flex-col '>
        <div className='flex gap-2 items-center mb-10'>
          <PiSealCheckFill className='size-10 text-green' />
          <h2 className='text-[22px] font-bold text-center'>Success</h2>
        </div>
        <p className='text-dark text-center mb-5'>You have successfully booked a room. We have sent you detailed information to your email address: </p>
        <Image 
          src='/images/booking-completed.svg' 
          alt='success' 
          width={375}
          height={344}

          className='w-[375px] h-[344px] mx-auto object-cover mb-4'
        />
        <p className='font-medium inter  text-center mb-5'>{booking?.booker.email}</p>
        <Button className='mx-auto' onClick={() => router.push('/')}>Back to Homepage</Button>
    </div>
  )
}

export default SuccessSection