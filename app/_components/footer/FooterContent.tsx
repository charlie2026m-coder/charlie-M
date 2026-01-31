'use client'
import { usePathname } from "@/navigation";
import Navigation from "./Navigation";

export const MobileNavigation = () => {
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '/de';

  if (!isHomePage) return null;

  return (
    <div className="flex md:hidden my-6 w-full">
      <Navigation />
    </div>
  );
};

export const DesktopNavigation = () => {
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '/de';

  return (
    <div className="hidden md:flex my-6 w-full md:w-1/4 ">
      {isHomePage ? <Navigation /> : null}
    </div>
  );
};
