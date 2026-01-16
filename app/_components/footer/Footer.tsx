'use client';
import Line from "./Line";
import Image from "next/image";
import MapWindow from "./MapWindow";
import Navigation from "./Navigation";
import Contacts from "./Contacts";
import { usePathname, Link } from "@/navigation";
import { PHONE_NUMBER, EMAIL } from "@/lib/Constants";
import { cn } from "@/lib/utils";
export default function Footer() {
  const pathname = usePathname();
  const contacts = [
    {
      type: "whatsapp",
      label: "WhatsApp Chat Support 24/7",
      value: PHONE_NUMBER, 
    },
    {
      type: "email",
      label: EMAIL,
      value: EMAIL,
    },
    {
      type: "phone",
      label: "Call: " + PHONE_NUMBER,
      value: PHONE_NUMBER,
    },
    {
      type: "location",
      label: "Friedrichstraße 33, 10969 Berlin",
      value: "https://maps.app.goo.gl/v21VbyU2o6WZWJFo7",
    },
  ];

  const handleContactClick = (type: string, value: string) => {
    switch (type) {
      case "phone":
        window.location.href = `tel:${value}`;
        break;
      case "email":
        window.location.href = `mailto:${value}`;
        break;
      case "whatsapp":
        // Убираем + и пробелы для WhatsApp
        const cleanPhone = value.replace(/[\s+]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
        break;
      case "location":
        window.open(value, '_blank');
        break;
      default:
        break;
    }
  };

  const isHomePage = pathname === '/' || pathname === '/de';

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
              <span className='text-[#E0E0E0] font-bold text-[17px] mt-auto mb-2.5 uppercase'>Modern stays - Berlin days</span>
              <span className='text-[#E0E0E0] text-[15px]'>Fully automated stay</span>

              {isHomePage && <div className="flex md:hidden my-6 w-full">
                <Navigation />
              </div>}
            </div>


            <div className="flex flex-col md:justify-center">
              <span className="text-white  font-semibold text-2xl mb-5">Contacts:</span>
              <div className="flex flex-row md:items-center justify-between md:justify-center gap-6 w-full">
                <ul className="flex md:hidden flex-col gap-1 text-white justify-center pl-0 mb-6 md:mb-0">
                  {contacts.map((contact, index) => (
                    <li 
                      key={index}
                      onClick={() => handleContactClick(contact.type, contact.value)}
                      className={cn("cursor-pointer text-sm md:text-base ", index === 0 && "font-bold text-blue")}
                    >
                      <span>{contact.label}</span>
                    </li>
                  ))}
                </ul>
                <div className="map-isolated w-[94px] h-[94px] md:w-[226px] md:h-[186px]" style={{ isolation: 'isolate', zIndex: 1 }}>
                  <MapWindow width="100%" height="100%" isFullscreen={false} />
                </div>
                <ul className="hidden md:flex flex-col gap-6 text-white justify-center">
                  {contacts.map((contact, index) => (
                    <li 
                      key={index}
                      onClick={() => handleContactClick(contact.type, contact.value)}
                      className={cn("cursor-pointer ", index === 0 && "font-bold text-blue")}
                    >
                      <span>{contact.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {isHomePage ? <div className="hidden md:flex my-6 w-full md:w-1/4 ">  
              <Navigation />
            </div> : <div className="hidden md:flex my-6 w-full md:w-1/4 " />}
          </div>
          <Contacts />
        </div>
      <Line />
    </footer>
  );
}