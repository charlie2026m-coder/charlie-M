'use client';
import Link from "next/link"
import { Button } from "../ui/button"
import Language from "./Language"
import ProfileInfo from "./ProfileInfo"
import AuthModal from "../Auth/AuthModal"
import { useAuth } from "@/lib/auth-provider"
import SignOut from "../Auth/SignOut"

const AuthBlock = () => {
  const { user, loading } = useAuth();
  return (
    <div className="flex items-center justify-between gap-3 ml-auto">
      {!loading && !user && (<>
        <AuthModal  type="signup" />
        <AuthModal  type="signin" />
      </>)}
      <Link href='booking'>
        <Button> Book Now </Button>
      </Link>
      {!loading && user &&<ProfileInfo />}
      {!loading && user &&<SignOut />}
      <Language />
    </div>
  )
}

export default AuthBlock