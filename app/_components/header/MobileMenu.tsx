'use client';
import { Link } from "@/navigation"
import { Button } from "../ui/button"
import Language from "./Language"
import AuthModal from "../Auth/AuthModal"
import { useAuth } from "@/lib/auth-provider"
import Image from "next/image"
import { FaFacebookF, FaYoutube } from 'react-icons/fa'
import { AiFillInstagram } from 'react-icons/ai'
import { TbMenu2 } from "react-icons/tb";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "../ui/drawer"
import { useProfile } from "@/app/hooks/useProfile";
// import SignOut from "../Auth/SignOut"
import { useTranslations } from "next-intl";
const MobileMenu = ({ locale }: { locale: string }) => {
  const { profile } = useProfile(); 
  const t = useTranslations();
  const [open, setOpen] = useState(false)
  const { user, loading } = useAuth();

  const links = [
    {
      label: t('header.rooms_link'),
      href: '/rooms',
    },
    {
      label: t('header.about_us_link'),
      href: '/concept',
    },
    {
      label: t('header.location_link'),
      href: '/location',
    },
    {
      label: "FAQ",
      href: '/faq',
    },
  ]

  return (
  <>
    <TbMenu2 className='size-8 md:hidden mr-3' onClick={()=> setOpen(true)} />
    
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <DrawerTitle className='hidden'>Mobile Menu</DrawerTitle>
      <DrawerContent className='p-0 border-none bg-mute min-w-full h-full rounded-[16px]'>
        <div className='flex flex-col items-center py-5 px-3 h-full'>
          <XIcon 
            onClick={()=> setOpen(false)}
            className='absolute top-5 size-10 left-3 text-white' 
          /> 
          <Link href="/">
            <Image 
              src="/images/Logo.svg" 
              alt="logo" 
              width={163} 
              height={104} 
              priority
              className="w-[163px] h-[104px] mb-[26px]" 
            />
          </Link>
          <div className='flex flex-col gap-5 items-center mb-9'>
            {links.map(item =>(
              <Link 
                key={item.href} 
                href={item.href} 
                className='text-[18px] text-white'
                onClick={() => setOpen(false)}
              >{item.label}</Link>
            ))}
          </div>
          <div className='flex flex-col gap-6 w-full mb-6 border-b border-0.5 border-brown pb-6 flex-1'> 
            <Link href='/rooms' className='w-full' onClick={() => setOpen(false)}>
              <Button className='w-full h-[55px]'> {t('book_now_btn')} </Button>
            </Link>
            {!loading && !user && (<>
              <Link href='/rooms' className='w-full' onClick={() => setOpen(false)}>
                <Button variant='outline' className='w-full h-[55px] text-white border-white'> {t('check_in_btn')} </Button>
              </Link>
              <AuthModal  type="signin" className='w-full h-[55px] text-white border-white' />
            </>)}

            {!loading && user &&
              <Link href="/profile" className="flex flex-col items-center mt-auto" onClick={() => setOpen(false)}>
                <h3 className="text-[18px] text-white"> {t('header.my_account_link')} </h3>
                <span className=" text-blue">{profile?.name || 'Dear guest'}</span>
              </Link>
            }
          </div>
          <ul className="flex gap-5 text-black mb-6">
            <li className="flex size-10 rounded-full bg-blue items-center justify-center"><FaFacebookF className='size-6' /></li>
            <li className="flex size-10 rounded-full bg-blue items-center justify-center"><AiFillInstagram className='size-6' /></li>
            <li className="flex size-10 rounded-full bg-blue items-center justify-center"><FaYoutube className='size-6' /></li>
          </ul>
 
          <Language /> 
        </div>
      </DrawerContent>
    </Drawer>
  </>
  )
}

export default MobileMenu