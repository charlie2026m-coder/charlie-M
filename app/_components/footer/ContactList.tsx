'use client'
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FaWhatsapp } from 'react-icons/fa';

interface Contact {
  type: string;
  label: string;
  value: string;
}

interface ContactListProps {
  contacts: Contact[];
}

const ContactList = ({ contacts }: ContactListProps) => {
  const getContactHref = (type: string, value: string) => {
    switch (type) {
      case "phone":
        return `tel:${value}`;
      case "email":
        return `mailto:${value}`;
      case "whatsapp":
        const cleanPhone = value.replace(/[\s+]/g, '');
        return `https://wa.me/${cleanPhone}`;
      case "location":
        return value;
      default:
        return '#';
    }
  };

  const handleClick = async (type: string, href: string, value: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === "whatsapp" || type === "location") {
      window.open(href, '_blank');
    } else if (type === "email") {
      // Try to open email client
      window.location.href = href;
      
      // Also copy email to clipboard as fallback
      try {
        await navigator.clipboard.writeText(value);
        toast.success('Email copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy email:', err);
      }
    } else if (type === "phone") {
      // Try to open phone dialer
      window.location.href = href;
      
      // Also copy phone to clipboard as fallback
      try {
        await navigator.clipboard.writeText(value);
        toast.success('Phone number copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy phone:', err);
      }
    }
  };

  return (
    <>
      <ul className="flex md:hidden flex-col gap-1 text-white justify-center pl-0 mb-6 md:mb-0">
        {contacts.map((contact, index) => {
          const href = getContactHref(contact.type, contact.value);
          
          return (
            <li 
              key={index}
              className={cn("text-sm md:text-base ", index === 0 && "font-bold text-blue")}
            >
              <a
                href={href}
                onClick={(e) => handleClick(contact.type, href, contact.value, e)}
                className={cn(
                  "cursor-pointer flex items-center gap-1",
                  contact.type === 'whatsapp' && "w-fit gap-1.5 rounded-full border border-white/25 px-2.5 py-1 text-xs text-white hover:border-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                )}
              >
                {contact.type === 'whatsapp' && <FaWhatsapp size={14} className="text-[#25D366] shrink-0" />}
                {contact.label}
              </a>
            </li>
          );
        })}
      </ul>
      <ul className="hidden md:flex flex-col gap-6 text-white justify-center">
        {contacts.map((contact, index) => {
          const href = getContactHref(contact.type, contact.value);
          
          return (
            <li
              key={index}
              // Align the plain lines' text under the WhatsApp button's LABEL.
              // The pill offsets its label by px-3 (12) + icon (16) + gap-2 (8) =
              // 36px = pl-9, so all four labels share one clean left edge (desktop).
              className={cn("", index === 0 && "font-bold text-blue", contact.type !== 'whatsapp' && "md:pl-9")}
            >
              <a
                href={href}
                onClick={(e) => handleClick(contact.type, href, contact.value, e)}
                className={cn(
                  "cursor-pointer flex items-center gap-1",
                  contact.type === 'whatsapp' && "w-fit gap-2 rounded-full border border-white/25 px-3 py-1.5 text-sm text-white hover:border-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                )}
              >
                {contact.type === 'whatsapp' && <FaWhatsapp size={16} className="text-[#25D366]" />}
                {contact.label}
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default ContactList;
