import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import CustomInput from '../ui/customInput';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/types/schemas';
import { contentType } from './AuthModal';
import { useAuthActions } from '@/app/_hooks/useAuthActions';

const ForgotPassword = ({ setFormType }: { setFormType: (type: contentType ) => void }) => {
  const [error, setError] = useState<string | null>(null);
  const { handleForgotPassword, isLoading } = useAuthActions();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  const email = watch('email');

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.entries(errors)
        .map(([field, error]) => error?.message)
        .filter(Boolean)
        .join(', ');
      setError(errorMessages);
    } else {
      setError(null);
    }
  }, [errors, email]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    
    const result = await handleForgotPassword(data.email);

    if (result.success) {
      setFormType('pass');
    } else {
      setError(result.error || 'Failed to send reset link. Please try again.');
    }
  };

  return (
    <div className="w-full ">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative mb-[30px]">
        <h1 className="text-3xl font-[400] text-center mb-[30px]">Forgot password?</h1>
        <h2 className="text-sm text-center mb-[30px] text-gray">Enter your email to reset password</h2>

        <CustomInput register={register} name="email" type="email" placeholder="Email" icon="email" isError={!!errors.email} />

        <Button
          type="submit"
          disabled={isLoading || !isValid}
          className="w-full h-12 rounded-full bg-brown hover:bg-brown/80 text-white font-medium !mb-0"
        >
          {isLoading ? 'Loading...' : 'Reset Password'}
        </Button>
        {error && <div className="absolute bottom-[-28px] text-center left-1/2 -translate-x-1/2 text-red text-sm  w-[120%]">{error}</div>}
      </form>

      <div className="mt-[30px] text-center" >
        Remember password? 
        <button onClick={() => setFormType('signin')} className="text-gray hover:text-black underline cursor-pointer pl-1">
          Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
