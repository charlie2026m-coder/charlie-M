'use client';
import { Link, usePathname } from "@/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const Navigation = () => {
  const pathname = usePathname();
  const t = useTranslations();
  
  const navigation = [
    {
      label: t('header.rooms_link'),
      href: '/rooms',
    },
    {
      label: t('header.location_link'),
      href: "/location",
    },
    {
      label: t('header.about_us_link'),
      href: "/concept",
    },
    {
      label: 'FAQ',
      href: "/faq",
    }
  ];

  return (
    <nav className="hidden md:flex items-center 2xl:w-1/4 justify-between">
      {navigation.map((item) => (
        <Link 
          key={item.href}
          href={item.href}
          className={cn(
            "transition-colors border-b-4 border-transparent py-1 hover:text-black/50 mx-1",
            pathname === item.href ? "font-medium border-blue" : ""
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

export default Navigation;