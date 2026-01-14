'use client';
import { Link, usePathname } from "@/navigation"
import { Button } from "../ui/button"
import Language from "./Language"
import { useAuth } from "@/lib/auth-provider"
import Image from "next/image"
import { TbMenu2 } from "react-icons/tb";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "../ui/drawer"
import { useProfile } from "@/app/hooks/useProfile";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import ViberNumber from "./ViberNumber";

const MobileMenu = ({ isWhite = false }: { isWhite?: boolean }) => {
  const { profile } = useProfile(); 
  const t = useTranslations();
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
      <DrawerTitle className='hidden' suppressHydrationWarning>Mobile Menu</DrawerTitle>
      <DrawerContent className='p-0 border-none bg-white min-w-full h-full rounded-r-[30px]'>
        <div className='flex flex-col items-center py-5 px-3 h-full'>
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
              className="w-[163px] h-[104px] mb-10" 
            />
          </Link>
            <ViberNumber className='mb-10' />

          {isHomePage && (
            <div className='flex flex-col gap-5 items-center pb-10 gap-6'>
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
          <div className='flex flex-col gap-6 w-4/5 pb-6'> 
            <Link href='/rooms' className='w-full' onClick={() => setOpen(false)}>
              <Button className='w-full h-[55px]'> {t('book_now_btn')} </Button>
            </Link>
            {!loading && !user && (<>
              <Link href='/login' className='w-full' onClick={() => setOpen(false)}>
                <Button variant='outline' className='w-full h-[55px] '> {t('sign_in_btn')} </Button>
              </Link>
              <Link href='/rooms' className='w-full' onClick={() => setOpen(false)}>
                <Button variant='outline' className='w-full h-[55px] border-none'> {t('check_in_btn')} </Button>
              </Link>
            </>)}

            {!loading && user &&
              <Link href="/profile" className="flex flex-col items-center mt-auto" onClick={() => setOpen(false)}>
                <h3 className="text-[18px] text-white"> {t('header.my_account_link')} </h3>
                <span className=" text-blue">{profile?.name || 'Dear guest'}</span>
              </Link>
            }
          </div>
 
          <Suspense fallback={<div className="size-10" />}>
            <Language /> 
          </Suspense>
        </div>
      </DrawerContent>
    </Drawer>
  </>
  )
}

export default MobileMenu