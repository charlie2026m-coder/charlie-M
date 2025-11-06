'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const pathname = usePathname();

  const navigation = [
    {
      label: 'Rooms',
      href: '/rooms',
    },
    {
      label: 'Why Charlie M',
      href: "/why",
    },
    {
      label: 'Location',
      href: "/location",
    },
    {
      label: 'FAQ',
      href: "/faq",
    }
  ]

  return (
    <nav className="flex items-center w-1/4 justify-between">
      {navigation.map((item) => (
        <Link 
          key={item.href}
          href={item.href}
          className={cn(
            "transition-colors border-b-4 border-transparent py-1 hover:text-black/50",
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