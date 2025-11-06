'use client';
import { useAuthActions } from '@/app/_hooks/useAuthActions';

const SignOut = () => {
  const { handleLogout } = useAuthActions();

  return (
    <button onClick={handleLogout} >
      out
    </button>
  );
};

export default SignOut;