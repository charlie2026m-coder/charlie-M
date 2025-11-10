import { Button } from '../ui/button'
import Image from 'next/image'
import { FaApple } from 'react-icons/fa'  
import { FcGoogle } from 'react-icons/fc'
import { signInWithOAuth } from '@/app/auth/authService'
import { toast } from 'sonner'
import { contentType } from './AuthModal';

const SocialMediaButtons = ( { setFormType }: { setFormType: (type: contentType ) => void } ) => {
  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      const loadingToastId = toast.loading(`Signing in with ${provider}...`);
      const result = await signInWithOAuth(provider);
      
      if (result.success) {
        toast.dismiss(loadingToastId);
      } else {
        toast.error(result.error || `Failed to sign in with ${provider}`, { id: loadingToastId });
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      toast.error(`Failed to sign in with ${provider}. Please try again.`);
    }
  };


  return (
    <div className="space-y-4 pt-[30px]">
      <Button
        type="button"
        variant="outline"
        onClick={()=>setFormType('reservation' as contentType)}
        className={buttonStyle}
      >
        <Image src="/images/bookingIcon.png" alt="reservation" width={20} height={20} />
        <span>Continue with Reservation ID</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => handleOAuthLogin('apple')}
        className={buttonStyle}
      >
        <FaApple className="size-6" /> Continue with Apple
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => handleOAuthLogin('google')}
        className={buttonStyle}
      >
        <FcGoogle className="size-6" /> Continue with Google
      </Button>
    </div>
  )
}

export default SocialMediaButtons

const buttonStyle= "w-full h-12 border-black text-black hover:text-black/50"
