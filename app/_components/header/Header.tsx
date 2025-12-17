import Image from "next/image"
import Navigation from "./Navigation"
import Link from "next/link"
import AuthBlock from "./AuthBlock"
import { Button } from "../ui/button"
import MobileMenu from "./MobileMenu";

const Header = () => {
  return (
    <header className="w-full  bg-white shadow-lg z-20">
      <section className="container px-4  xl:px-[100px] py-3 flex items-center ">
        <MobileMenu />
        <Link href="/">
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