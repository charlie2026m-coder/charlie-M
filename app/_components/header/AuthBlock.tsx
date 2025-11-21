'use client';
import Link from "next/link"
import { Button } from "../ui/button"
import Language from "./Language"
import ProfileInfo from "./ProfileInfo"
import AuthModal from "../Auth/AuthModal"
import { useAuth } from "@/lib/auth-provider"
// import SignOut from "../Auth/SignOut"

const AuthBlock = () => {
  const { user, loading } = useAuth();
  return (
    <div className="hidden md:flex items-center justify-between gap-1 lg:gap-3 ml-auto">
      {!loading && !user && (<>
        <AuthModal  type="signup" />
        <AuthModal  type="signin" />
      </>)}
      <Link href='/rooms'>
        <Button variant='outline' className='h-[44px]'>Check In</Button>
      </Link>
      <Link href='/rooms' className='hidden lg:block'>
        <Button className='h-[44px]'> Book Now </Button>
      </Link>
      {!loading && user &&<ProfileInfo />}
      {/* {!loading && user &&<SignOut />} */}
      <Language />
    </div>
  )
}

export default AuthBlock