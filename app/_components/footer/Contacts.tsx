import { FaFacebookF, FaYoutube } from 'react-icons/fa'
import { AiFillInstagram } from 'react-icons/ai'
import Image from 'next/image'
import { Link } from '@/navigation'
import { FaGooglePay,FaApplePay, FaStripe } from "react-icons/fa";
import { SiVisa } from "react-icons/si";
import { RiMastercardFill } from "react-icons/ri";
import { getTranslations } from 'next-intl/server';

const Contacts = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: 'footer' })
  const paymentMethods = [
    <SiVisa className='text-white size-7' />,
    <RiMastercardFill className='text-white size-7' />,
    <FaGooglePay className='text-white size-7' />,
    <FaApplePay className='text-white size-7' />,
  ];

  return (
    <>
      <div className='flex flex-col md:flex-row gap-8  w-full py-8 md:items-center justify-between'>
        <div className="flex flex-col sm:flex-row gap-5 md:items-center">
          <div className="flex flex-col">
            <span className='text-white text-[28px] text-[#E0E0E0] font-semibold'>{t('getSocial')}</span>
            <span className='text-white text-[#E0E0E0] '>{t('tagUs')}</span>
          </div>
          <ul className="flex gap-5 text-[#eoeoeo] justify-around md:justify-start">
              <li className="flex size-14 rounded-full border border-blue items-center justify-center hover:bg-blue transition-colors cursor-pointer">
                <a 
                  href="https://www.facebook.com/profile.php?id=61587365155032" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full h-full"
                  aria-label="Facebook"
                >
                  <FaFacebookF className='text-white size-7' />
                </a>
              </li>
              <li className="flex size-14 rounded-full border border-blue items-center justify-center hover:bg-blue transition-colors cursor-pointer">
                <a 
                  href="https://www.instagram.com/charliemhotel/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full h-full"
                  aria-label="Instagram"
                >
                  <AiFillInstagram className='text-white size-7' />
                </a>
              </li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-5 md:gap-7 opacity-50 text-white text-2xl md:items-center font-semibold">
          {t('payWith')}:
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
          <Link href="/privacy-policy" locale={locale as 'en' | 'de'} className="text-white text-sm pr-4 border-r border-white hover:text-blue transition-colors">{t('privacyPolicy')}</Link>
          <Link href="/terms-and-conditions" locale={locale as 'en' | 'de'} className="text-white text-sm px-4 border-r border-white hover:text-blue transition-colors">{t('termsAndConditions')}</Link>
          <Link href="/imprint" locale={locale as 'en' | 'de'} className="text-white text-sm pl-4 hover:text-blue transition-colors">{t('imprint')}</Link>
        </div>
        <span className="text-white text-sm md:ml-auto">{t('copyright')}</span>
      </div>
    </>
  )
}

export default Contacts