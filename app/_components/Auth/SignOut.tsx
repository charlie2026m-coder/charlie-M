'use client';
import { useAuthActions } from '@/app/hooks/useAuthActions';

const SignOut = () => {
  const { handleLogout } = useAuthActions();

  return (
    <button onClick={handleLogout} >
      out
    </button>
  );
};

export default SignOut;