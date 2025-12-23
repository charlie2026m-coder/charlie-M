import { Button } from '../ui/button'
import { FaApple } from 'react-icons/fa'  
import { FcGoogle } from 'react-icons/fc'
import { useOAuthSignIn } from '@/app/hooks/useAuth'
import { contentType } from './AuthModal';

const SocialMediaButtons = ( { setFormType }: { setFormType: (type: contentType ) => void } ) => {
  const oauthMutation = useOAuthSignIn();

  return (
    <div className="space-y-4 pt-[30px]">
      <Button
        type="button"
        variant="outline"
        onClick={()=>setFormType('reservation' as contentType)}
        className={buttonStyle}
      >
        Continue with Reservation ID
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => oauthMutation.mutate('apple')}
        disabled={oauthMutation.isPending}
        className={buttonStyle}
      >
        <FaApple className="size-6" /> Continue with Apple
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => oauthMutation.mutate('google')}
        disabled={oauthMutation.isPending}
        className={buttonStyle}
      >
        <FcGoogle className="size-6" /> Continue with Google
      </Button>
    </div>
  )
}

export default SocialMediaButtons

const buttonStyle= "w-full h-12 border-black text-black hover:text-black/50"
