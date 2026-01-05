import Image from "next/image"
import Navigation from "./Navigation"
import { Link } from "@/navigation"
import AuthBlock from "./AuthBlock"
import { Button } from "../ui/button"
import MobileMenu from "./MobileMenu";

const Header = ({ locale }: { locale: string }) => {
  return (
    <header className="w-full  bg-white shadow-lg z-20">
      <section className="container px-4  xl:px-[100px] py-3 flex items-center ">
        <MobileMenu locale={locale} />
        <Link href="/" locale={locale as 'en' | 'de'}>
          <Image 
            src="/images/Logo.svg" 
            alt="logo" 
            width={106} 
            height={67} 
            priority
            className="mr-2  w-[76px]  h-[48px] lg:w-[106px] lg:h-[67px] lg:mr-5 lg:mr-[60px]" 
          />
        </Link>
        <Navigation />
        <AuthBlock />

        {/* for mobile version */}
        <Link href='/rooms' className=' md:hidden ml-auto'>
          <Button> Book Now </Button>
        </Link>
      </section>
    </header>
  )
}

export default Header