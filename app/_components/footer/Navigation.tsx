'use client';
import { Link, usePathname } from "@/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function Navigation() {
  const pathname = usePathname();
  const t = useTranslations();
  const isHomePage = pathname === '/' || pathname === '/de';

  const navigation = [
    {
      label: t('header.rooms_link'),
      href: isHomePage ? "/#rooms" : "/rooms",
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
    },
  ]

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
    <nav className="flex col-span-1 flex-col md:flex-row lg:flex-col md:mx-auto">
      <span className="text-white font-semibold text-2xl mb-5 md:mb-0 lg:mb-5 mr-6">Links:</span>
      <div className="flex flex-col md:flex-row lg:flex-col  gap-4">{navigation.map((item) => (
        <Link 
          key={item.href} 
          href={item.href}
          onClick={(e) => handleClick(e, item.href)}
          className={cn(
            "transition-colors border-b-4 border-transparent py-1 text-white w-fit",
            pathname === item.href || pathname === `/de${item.href}` ? "font-medium border-blue" : ""
          )}
        >
          {item.label}
        </Link>
      ))}</div> 
    </nav>
  )
}