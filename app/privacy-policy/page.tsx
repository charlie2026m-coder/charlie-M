import { MdShield } from "react-icons/md";
import Image from "next/image";
import Content from "./components/Content";

export default function PrivacyPolicy() {

  
  return (
    <section className="flex flex-col items-center justify-center container px-4 md:px-10 xl:px-[100px] py-[50px]">
      <div className="flex flex-col items-center gap-6 py-10 bg-light-blue rounded-[40px] mb-8">
        <div className='flex items-center gap-5'>
          <div className='size-10 md:size-[76px] bg-brown rounded-full flex items-center justify-center text-white '>
            <MdShield className='size-6 md:size-[40px]' />
          </div>
          <h1 className='text-3xl md:text-6xl font-bold jakarta'>Privacy Policy</h1>
        </div>
        <p className='w-4/5 text-center text-dark text-sm inter'>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>

        <div className='flex items-center gap-1 text-sm'>
          <Image src="/images/calendar-brown-icon.png" alt="calendar" width={24} height={24} />
          <span className='text-sm text-dark inter'>Last updated 24 Oct 2024</span>
        </div>
      </div>

      <Content type='privacyPolicy' />
    </section>
  )
}



