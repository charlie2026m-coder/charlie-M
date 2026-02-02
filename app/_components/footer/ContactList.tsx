'use client'
import { cn } from "@/lib/utils";

interface Contact {
  type: string;
  label: string;
  value: string;
}

interface ContactListProps {
  contacts: Contact[];
}

const ContactList = ({ contacts }: ContactListProps) => {
  const handleContactClick = (type: string, value: string) => {
    switch (type) {
      case "phone":
        window.location.href = `tel:${value}`;
        break;
      case "email":
        window.location.href = `mailto:${value}`;
        break;
      case "whatsapp":
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
    <>
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
    </>
  );
};

export default ContactList;
