import { FaFacebookF, FaYoutube } from 'react-icons/fa'
import { AiFillInstagram } from 'react-icons/ai'
import Image from 'next/image'
import Link from 'next/link'

const Contacts = () => {
  const paymentMethods = [
    '/images/visaIcon.png',
    '/images/mastercardIcon.png',
    '/images/stripeIcon.png',
    '/images/googlepayIcon.png',
    '/images/applepayIcon.png',
  ];

  return (
    <>
      <div className='flex w-full py-10 items-center justify-between'>
        <div className="flex gap-5 text-white text-2xl items-center font-semibold">
          Finds Us:
          <ul className="flex gap-5 text-black">
              <li className="flex size-10 rounded-full bg-blue items-center justify-center"><FaFacebookF /></li>
              <li className="flex size-10 rounded-full bg-blue items-center justify-center"><AiFillInstagram /></li>
              <li className="flex size-10 rounded-full bg-blue items-center justify-center"><FaYoutube /></li>
          </ul>
        </div>
        <div className="flex gap-5 text-white text-2xl items-center font-semibold">
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
      <div className='flex w-full pb-10 items-center '>
        <Link href="/privacy-policy" className="text-white text-sm pr-4 border-r border-white hover:text-blue transition-colors">Privacy Policy</Link>
        <Link href="/terms-of-conditions" className="text-white text-sm pl-4 hover:text-blue transition-colors">Terms of Conditions</Link>
        <span className="text-white text-sm ml-auto">© Charlie M. All Rights Reserved.</span>
      </div>
    </>
  )
}

export default Contacts