'use client';
import { Link } from "@/navigation"
import { Button } from "../ui/button"
import ProfileInfo from "./ProfileInfo"
import { useAuth } from "@/lib/auth-provider"
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
const AuthBlock = ({ isWhite = false }: { isWhite?: boolean }) => {
  const { user, loading } = useAuth();
  const t = useTranslations();
  
  return (
    <div className="hidden md:flex items-center justify-between gap-1 lg:gap-3">
      <Button variant='outline' className={cn('h-[44px] border-none underline p-4', isWhite && 'text-white hover:text-white/50')} >{t('check_in_btn')}</Button>
      <Link href='/rooms' >
        <Button className={cn('h-[44px]', isWhite && ' bg-white hover:bg-white/90 hover:text-black')}>{t('book_now_btn')}</Button>
      </Link>

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