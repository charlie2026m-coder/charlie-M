import Image from "next/image"
import Navigation from "./Navigation"
import Link from "next/link"
import AuthBlock from "./AuthBlock"

const Header = () => {
  return (
    <header className="w-full  bg-white shadow-lg">
      <section className="container px-[100px] py-3 flex items-center ">
        <Link href="/">
          <Image 
            src="/images/logo.png" 
            alt="logo" 
            width={106} 
            height={67} 
            priority
            className="mr-[60px] w-[106px] h-[67px]" 
          />
        </Link>
        <Navigation />
        <AuthBlock />
      </section>
    </header>
  )
}

export default Header