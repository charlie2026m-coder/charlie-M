import Line from "./Line";
import Image from "next/image";
import MapWindow from "./MapWindow";
import Contacts from "./Contacts";
import ContactList from "./ContactList";
import { MobileNavigation, DesktopNavigation } from "./FooterContent";
import { Link } from "@/navigation";
import { PHONE_NUMBER, EMAIL } from "@/lib/Constants";
import { getTranslations } from 'next-intl/server';

export default async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  
  const contacts = [
    {
      type: "whatsapp",
      label: t('whatsappSupport'),
      value: PHONE_NUMBER, 
    },
    {
      type: "email",
      label: EMAIL,
      value: EMAIL,
    },
    {
      type: "phone",
      label: t('call', { phone: PHONE_NUMBER }),
      value: PHONE_NUMBER,
    },
    {
      type: "location",
      label: t('address'),
      value: "https://maps.app.goo.gl/v21VbyU2o6WZWJFo7",
    },
  ];

  return (
    <footer className={`w-full relative z-0 bg-mute`}>
        <div className="container px-4 xl:!px-[100px] flex flex-col items-center ">
          <div className="flex flex-col w-full md:flex-row md:justify-between items-center pt-[30px] lg:pt-[50px] md:pb-8  md:border-b border-white/40">

            <div className="flex flex-col items-center md:items-start col-span-1 h-full w-full md:w-1/4">
              <Link href="/">
                <Image 
                  src="/images/Logo.svg" 
                  alt="logo" 
                  width={180} 
                  height={150} 
                  className="w-[124px] lg:w-[180px] h-[83px] lg:h-[150px] object-contain mb-5"
                />
              </Link>
              <span className='text-[#E0E0E0] font-bold text-[17px] mt-auto mb-2.5 uppercase'>{t('tagline')}</span>
              <span className='text-[#E0E0E0] text-[15px]'>{t('subtitle')}</span>

              <MobileNavigation />
            </div>


            <div className="flex flex-col md:justify-center">
              <span className="text-white  font-semibold text-2xl mb-5">{t('contacts')}</span>
              <div className="flex flex-row md:items-center justify-between md:justify-center gap-6 w-full">
                <ContactList contacts={contacts} />
                <div className="map-isolated w-[94px] h-[94px] md:w-[226px] md:h-[186px]" style={{ isolation: 'isolate', zIndex: 1 }}>
                  <MapWindow width="100%" height="100%" isFullscreen={false} />
                </div>
              </div>
            </div>
            <DesktopNavigation />
          </div>
          <Contacts locale={locale} />
        </div>
      <Line />
    </footer>
  );
}