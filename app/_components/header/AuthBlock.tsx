'use client';
import { Link, useRouter, usePathname } from "@/navigation"
import { Button } from "../ui/button"
import ProfileInfo from "./ProfileInfo"
import { useAuth } from "@/lib/auth-provider"
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import CheckInDialog from "./CheckInDialog";

const AuthBlock = ({ isWhite = false }: { isWhite?: boolean }) => {
  const { user, loading } = useAuth();
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);
  
  const handleBookNow = () => {
    if (pathname.startsWith('/rooms')) return;
    setIsNavigating(true);
    router.push('/rooms');
  };


  return (
    <div className="hidden md:flex items-center justify-between gap-1 lg:gap-3">
      <CheckInDialog
        trigger={
          <Button 
            variant='outline' 
            className={cn('h-[44px] border-none underline p-4 active:bg-transparent', isWhite && 'text-white hover:text-white/50')}
          >
            {t('check_in_btn')}
          </Button>
        }
      />
      <Button 
        onClick={handleBookNow}
        disabled={isNavigating}
        className={cn('h-[44px]', isWhite && ' bg-white hover:bg-white/90 hover:text-black')}
      >
        {isNavigating ? t('loading') : t('book_now_btn')}
      </Button>

      {!loading && !user && (
        <Link href='/login'>
          <Button variant="outline" className={cn('h-[44px]', isWhite && 'text-white hover:text-white/50 border-white hover:border-white/50')}>{t('sign_in_btn')}</Button>
        </Link>
      )}
      {!loading && user && <ProfileInfo isWhite={isWhite} />}
    </div>
  )
}

export default AuthBlock