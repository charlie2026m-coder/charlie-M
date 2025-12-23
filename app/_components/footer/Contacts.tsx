import { FaFacebookF, FaYoutube } from 'react-icons/fa'
import { AiFillInstagram } from 'react-icons/ai'
import Image from 'next/image'
import Link from 'next/link'

const Contacts = () => {
  const paymentMethods = [
    '/images/payment-visa.svg',
    '/images/payment-ms.svg',
    '/images/payment-stripe.svg',
    '/images/payment-google.svg',
    '/images/payment-apple.svg',
  ];

  return (
    <>
      <div className='flex flex-col md:flex-row gap-8  w-full py-10 md:items-center justify-between'>
        <div className="flex flex-col sm:flex-row gap-5 text-white text-2xl items-center font-semibold">
          Finds Us:
          <ul className="flex gap-5 text-black">
              <li className="flex size-10 rounded-full bg-blue items-center justify-center"><FaFacebookF /></li>
              <li className="flex size-10 rounded-full bg-blue items-center justify-center"><AiFillInstagram /></li>
              <li className="flex size-10 rounded-full bg-blue items-center justify-center"><FaYoutube /></li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-5 text-white text-2xl items-center font-semibold">
          Pay with:
          <ul className="flex gap-5 text-black">
            {paymentMethods.map((method, index) => (
              <Image 
                key={index}
                src={method} 
                alt="payment method" 
                width={45} 
                height={31} 
                className="w-[45px] h-[31px]"
              />
            ))}
          </ul>
        </div>
      </div>
      <div className='flex flex-col-reverse md:flex-row w-full pb-10 md:items-center gap-8'>
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