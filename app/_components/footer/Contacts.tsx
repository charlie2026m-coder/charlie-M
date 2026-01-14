import { FaFacebookF, FaYoutube } from 'react-icons/fa'
import { AiFillInstagram } from 'react-icons/ai'
import Image from 'next/image'
import { Link } from '@/navigation'
import { FaGooglePay,FaApplePay, FaStripe } from "react-icons/fa";
import { SiVisa } from "react-icons/si";
import { RiMastercardFill } from "react-icons/ri";

const Contacts = () => {
  const paymentMethods = [
    <SiVisa className='text-white size-7' />,
    <RiMastercardFill className='text-white size-7' />,
    <FaStripe className='text-white size-7' />,
    <FaGooglePay className='text-white size-7' />,
    <FaApplePay className='text-white size-7' />,
  ];

  return (
    <>
      <div className='flex flex-col md:flex-row gap-8  w-full py-8 md:items-center justify-between'>
        <div className="flex flex-col sm:flex-row gap-5 md:items-center">
          <div className="flex flex-col">
            <span className='text-white text-[28px] text-[#E0E0E0] font-semibold'>Get Social:</span>
            <span className='text-white text-[#E0E0E0] '>Tag us in your photos</span>
          </div>
          <ul className="flex gap-5 text-[#eoeoeo] justify-around md:justify-start">
              <li className="flex size-14 rounded-full border border-blue items-center justify-center"><FaFacebookF className='text-white size-7' /></li>
              <li className="flex size-14 rounded-full border border-blue items-center justify-center"><AiFillInstagram className='text-white size-7' /></li>
              <li className="flex size-14 rounded-full border border-blue items-center justify-center"><FaYoutube className='text-white size-7' /></li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-5 md:gap-7 opacity-50 text-white text-2xl md:items-center font-semibold">
          Pay with:
          <ul className="flex md:gap-6 text-black justify-around md:justify-start">
            {paymentMethods.map((method, index) => (
              <div key={index} className='flex items-center justify-center rounded border px-2'>
                {method}
              </div>
            ))}
          </ul>
        </div>
      </div>
      <div className='flex flex-col md:flex-row w-full pb-10 md:items-center gap-6 pt-5 border-t md:border-t-0 md:pt-0'>
        <div>
          <Link href="/privacy-policy" className="text-white text-sm pr-4 border-r border-white hover:text-blue transition-colors">Privacy Policy</Link>
          <Link href="/terms-and-conditions" className="text-white text-sm pl-4 hover:text-blue transition-colors">Terms and Conditions</Link>
        </div>
        <span className="text-white text-sm md:ml-auto">© Charlie M. All Rights Reserved.</span>
      </div>
    </>
  )
}

export default Contacts