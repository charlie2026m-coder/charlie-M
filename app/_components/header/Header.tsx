'use client';
import Image from "next/image"
import Navigation from "./Navigation"
import { Link, useRouter } from "@/navigation"
import AuthBlock from "./AuthBlock"
import { Button } from "../ui/button"
import MobileMenu from "./MobileMenu";
import ViberNumber from "./ViberNumber"
import Language from "./Language"
import { cn } from "@/lib/utils"
import { Suspense, useState } from "react"

const Header = ({ locale, isWhite = false }: { locale: string, isWhite?: boolean }) => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleMobileBookNow = () => {
    setIsNavigating(true);
    router.push('/rooms');
  };

  return (
        <header className={cn('w-full', !isWhite && 'bg-white shadow-lg ')}>
          <section className="container px-4  xl:px-[100px] py-3 flex items-center ">
            <MobileMenu isWhite={isWhite} />
            <Link href="/" locale={locale as 'en' | 'de'}>
              <Image 
                src={isWhite ? "/images/logo-white.svg" : "/images/Logo.svg"} 
                alt="logo" 
                width={106} 
                height={67} 
                priority
                className="mr-2  w-[76px] h-[48px] lg:mr-5 md:mr-[60px]" 
              />
            </Link>
            <Navigation isWhite={isWhite} />
            <div className='flex items-center ml-auto'>
              
              <AuthBlock isWhite={isWhite} />
              <div className="hidden md:block">
                <Suspense fallback={<div className="w-10 h-10" />}>
                  <Language isWhite={isWhite} />
                </Suspense>
              </div>

              {/* for mobile version */}
              <Button 
                onClick={handleMobileBookNow}
                disabled={isNavigating}
                className={cn('h-[44px] md:hidden ml-auto', isWhite && ' bg-white hover:bg-white/90 hover:text-black')}
              >
                {isNavigating ? 'Loading...' : 'Book Now'}
              </Button>

            </div>
          </section>
        </header>
  )
}

export default Header