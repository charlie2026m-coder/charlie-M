'use client';
import Link from "next/link"
import { Button } from "../ui/button"
import Language from "./Language"
import ProfileInfo from "./ProfileInfo"
import AuthModal from "../Auth/AuthModal"
import { useAuth } from "@/lib/auth-provider"

const AuthBlock = () => {
  const { user, loading } = useAuth();
  return (
    <div className="hidden md:flex items-center justify-between gap-1 lg:gap-3 ml-auto">
      <Link href='/rooms' >
        <Button className='h-[44px]'> Book Now </Button>
      </Link>

      {!loading && !user && (<>
        <AuthModal  type="signin" className="h-[44px]"/>
      </>)}
      {!loading && user && <ProfileInfo />}
      <Language />
    </div>
  )
}

export default AuthBlock