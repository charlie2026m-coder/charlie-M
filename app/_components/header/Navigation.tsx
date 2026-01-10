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
      href: isHomePage ? '/#rooms' : '/rooms',
    },
    {
      label: t('header.location_link'),
      href: isHomePage ? "/#location" : "/location",
    },
    {
      label: t('header.about_us_link'),
      href: isHomePage ? "/#concept" : "/concept",
    },
    {
      label: 'FAQ',
      href: isHomePage ? "/#faq" : "/faq",
    }
  ];

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      const id = href.substring(2);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="hidden md:flex items-center 2xl:w-1/4 gap-6 justify-between">
      {navigation.map((item) => (
        <Link 
          key={item.href}
          href={item.href}
          onClick={(e) => handleClick(e, item.href)}
          className={cn(
            "transition-colors border-b-4 border-transparent py-1  mx-1",
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