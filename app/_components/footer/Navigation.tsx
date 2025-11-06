'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Navigation() {

  const pathname = usePathname();

  const navigation = [
    {
      label: 'Home',
      href: '/',
    },
    {
      label: 'Rooms',
      href: "/rooms",
    },
    {
      label: 'Location',
      href: "/location",
    },
    {
      label: 'FAQ',
      href: "/faq",
    },
    {
      label: 'Customer Reviews',
      href: "/reviews",
    }
  ]

  return (
    <nav className="flex flex-col w-1/4 ">
      <span className="text-white font-semibold text-2xl mb-5">Links:</span>
      <div className="flex flex-col gap-4">{navigation.map((item) => (
        <Link key={item.href} href={item.href} className={cn(
          "transition-colors border-b-4 border-transparent py-1 text-white w-fit",
          pathname === item.href ? "font-medium border-blue" : ""
        )}>
          {item.label}
        </Link>
      ))}</div> 
    </nav>
  )
}