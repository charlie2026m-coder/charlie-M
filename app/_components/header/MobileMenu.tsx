'use client';
import { Link, usePathname } from "@/navigation"
import { Button } from "../ui/button"
import Language from "./Language"
import { useAuth } from "@/lib/auth-provider"
import Image from "next/image"
import { TbMenu2 } from "react-icons/tb";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerTitle, VisuallyHidden } from "../ui/drawer"
import { useProfile } from "@/app/hooks/useProfile";
import { useTranslations, useLocale } from "next-intl";
import ProfileInfo from "./ProfileInfo";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import MobileCheckInForm from "./MobileCheckInForm";

const MobileMenu = ({ isWhite = false }: { isWhite?: boolean }) => {
  const { profile } = useProfile(); 
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false)
  const { user, loading } = useAuth();
  const pathname = usePathname();
  
  const isHomePage = pathname === '/';

  const links = [
    {
      label: t('header.rooms_link'),
      href: '/#rooms',
    },
    {
      label: t('header.about_us_link'),
      href: '/#concept',
    },
    {
      label: t('header.location_link'),
      href: '/#location',
    },
    {
      label: "FAQ",
      href: '/#faq',
    },
  ]

  const handleLinkClick = (href: string) => {
    setOpen(false);
    
    if (isHomePage) {
      const sectionId = href.replace('/#', '');
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  return (
  <>
    <TbMenu2 className={cn('size-8 md:hidden mr-3', isWhite ? 'text-white' : 'text-black')} onClick={()=> setOpen(true)} />
    
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <DrawerContent className='p-0 border-none bg-white min-w-full h-full rounded-r-[30px]'>
        <VisuallyHidden>
          <DrawerTitle>Mobile Menu</DrawerTitle>
        </VisuallyHidden>
       
        <div className='flex flex-col items-center py-5 px-3 h-full'>
          <label className="flex items-center absolute top-8 left-5">
            <Suspense fallback={<div className="size-10" />}>
              {locale === 'en' ? 'ENG' : 'GER'}
              <span className='opacity-0'><Language /> </span>
            </Suspense>
          </label>
          <XIcon 
            onClick={()=> setOpen(false)}
            className='absolute top-5 size-10 right-3 ' 
          /> 
          <Link href="/">
            <Image 
              src="/images/Logo.svg" 
              alt="logo" 
              width={163} 
              height={104} 
              priority
              className="w-[163px]  mb-10" 
            />
          </Link>

          {isHomePage && (
            <div className='flex flex-col gap-5 items-center gap-6 '>
              {links.map(item =>(
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className='text-[18px]'
                  onClick={() => handleLinkClick(item.href)}
                >{item.label}</Link>
              ))}
            </div>
          )}


          <div className='flex flex-col gap-6 w-4/5 pb-6 pt-10'> 
            <Link href='/rooms' className='w-full' onClick={() => setOpen(false)}>
              <Button className='w-full h-[55px]'> {t('book_now_btn')} </Button>
            </Link>
            {!loading && !user && (<>
              <Link href='/login' className='w-full' onClick={() => setOpen(false)}>
                <Button variant='outline' className='w-full h-[55px] '> {t('sign_in_btn')} </Button>
              </Link>
            </>)}
            <MobileCheckInForm />

            {!loading && user && (
              <div className="flex gap-3 items-center justify-center font-bold">
                <ProfileInfo size="lg" onClick={() => setOpen(false)} />
                <span>{[profile?.name, profile?.last_name].filter(Boolean).join(' ') || 'Guest'}</span>
              </div>
            )}
          </div>
 

        </div>
      </DrawerContent>
    </Drawer>
  </>
  )
}

export default MobileMenu