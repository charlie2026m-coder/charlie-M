'use client';
import { Link, usePathname } from "@/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const Navigation = ({isWhite = false}: {isWhite?: boolean}) => {
  const t = useTranslations();
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '/de';

  const navigation = [
    {
      label: t('header.rooms_link'),
      href: '/rooms'
    },
    {
      label: t('header.location_link'),
      href: "/#location"
    },
    {
      label: t('header.about_us_link'),
      href: "/#concept" 
    },
    {
      label: 'FAQ',
      href: "/#faq"
    },
    {
      label: t('header.group_bookings_link'),
      href: '/group-bookings'
    }
  ];

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#') && isHomePage) {
      e.preventDefault();
      const id = href.substring(2);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="hidden md:flex items-center gap-5 lg:gap-6">
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={(e) => handleClick(e, item.href)}
          className={cn(
            "transition-colors border-b-4 border-transparent py-1 whitespace-nowrap",
            isWhite ? "text-white hover:underline" : "text-black hover:text-black/50",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

export default Navigation;