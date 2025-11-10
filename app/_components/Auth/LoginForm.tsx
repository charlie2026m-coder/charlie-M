import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthActions } from '@/app/hooks/useAuthActions';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import CustomInput from '../ui/customInput';
import Divider from './divider';
import SocialMediaButtons from './SocialMediaButtons';
import { type LoginFormData, loginSchema } from '@/types/schemas';
import { contentType } from './AuthModal';


const LoginForm = ({ setFormType }: { setFormType: (type: contentType ) => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { handleLogin, isLoading } = useAuthActions();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });


  const email = watch('email');
  const password = watch('password');

  // Handle any errors from form validation
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.entries(errors).map(([, error]) => error?.message).filter(Boolean).join(', ');
      setError(errorMessages);
    } else {
      setError(null);
      setLoginError(null);
    }
  }, [errors, email, password]);

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setLoginError(null);
    const result = await handleLogin({ email: data.email, password: data.password });
    
    if (!result.success) {
      const errorMessage = result.error || 'Login failed. Please try again.';
      setLoginError(errorMessage);
    }
  };

  return (
    <div className="w-full ">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative mb-[30px]">
        <h1 className="text-3xl font-[400] text-center mb-[30px]">Welcome to Charlie M</h1>
        <h2 className="text-xl text-center mb-6">Login</h2>

        <CustomInput 
          register={register} 
          name="email" 
          type="email" 
          placeholder="Email" 
          icon="email" 
          isError={!!errors.email || !!loginError} 
        />
        <CustomInput 
          register={register} 
          name="password" 
          type="password" 
          placeholder="Password" 
          icon="password" 
          isError={!!errors.password || !!loginError} 
        />

        <button type="button" onClick={() => setFormType('forgot' as contentType)} className="text-sm text-gray font-light cursor-pointer hover:text-dark transition-colors">Forgot password? </button>

        <Button
          type="submit"
          disabled={isLoading || !isValid}
          className="w-full h-12 rounded-full bg-brown hover:bg-brown/80 text-white font-medium !mb-0"
        >
          {isLoading ? 'Loading...' : 'Login'}
        </Button>

        {(error || loginError) && (
          <div className="absolute bottom-[-28px] text-center text-red text-sm px-4 w-full">
            {loginError || error}
          </div>
        )}
      </form>
      <Divider />
      <SocialMediaButtons setFormType={setFormType} />
    </div>
  );
};

export default LoginForm;
