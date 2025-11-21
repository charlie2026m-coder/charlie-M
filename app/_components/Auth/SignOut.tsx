'use client';
import { useLogout } from '@/app/hooks/useAuth';

const SignOut = () => {
  const logoutMutation = useLogout();

  return (
    <button 
      onClick={() => logoutMutation.mutate()} 
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? 'Logging out...' : 'out'}
    </button>
  );
};

export default SignOut;