'use client';
import Line from "./Line";
import Image from "next/image";
import MapWindow from "./MapWindow";
import { FaPhone } from "react-icons/fa";
import { IoLogoWhatsapp } from "react-icons/io";
import { FaLocationDot } from "react-icons/fa6";
import { TbMailFilled } from "react-icons/tb";
import Navigation from "./Navigation";
import Contacts from "./Contacts";

export default function Footer() {

  const contacts = [
    {
      type: "phone",
      icon: <FaPhone color={'#9EC2DD'} size={20}/>,
      label: "+5 077 6764 8570",
      value: "+50776764857",
    },
    {
      type: "email",
      icon: <TbMailFilled color={'#9EC2DD'} size={20}/>,
      label: "info@charlie.com",
      value: "info@charlie-m.com",
    },
    {
      type: "whatsapp",
      icon: <IoLogoWhatsapp color={'#9EC2DD'} size={20}/>,
      label: "WhatsApp Chat Support (24/7)",
      value: "+50776764857", 
    },
    {
      type: "location",
      icon: <FaLocationDot color={'#9EC2DD'} size={20}/>,
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

  return (
    <footer className="w-full bg-black shadow-lg rounded-t-4xl">
      <section className="container !px-[100px] flex flex-col items-center ">
        <div className="flex w-full items-center py-[60px] justify-between border-b border-white/40">
          <div className="flex items-center  w-1/4">
            <Image 
              src="/images/logo.png" 
              alt="logo" 
              width={235} 
              height={151} 
              className="w-[235px] h-[151px]"
            />
          </div>

          <div className="flex flex-col items-start justify-center w-1/2">
            <span className="text-white font-semibold text-2xl mb-5">Contacts:</span>
            <div className="flex items-center  gap-6 w-full">
              <MapWindow width="226px" height="226px" />
              <ul className="flex flex-col gap-6 text-white">
                {contacts.map((contact, index) => (
                  <li 
                    key={index}
                    onClick={() => handleContactClick(contact.type, contact.value)}
                    className="flex items-center gap-2.5 cursor-pointer hover:text-blue transition-colors"
                  >
                    {contact.icon}
                    <span>{contact.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Navigation />
        </div>
        <Contacts />
      </section>
      <Line />
    </footer>
  );
}