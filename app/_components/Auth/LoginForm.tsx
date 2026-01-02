import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLogin } from '@/app/hooks/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import CustomInput from '../ui/customInput';
import Divider from './divider';
import SocialMediaButtons from './SocialMediaButtons';
import { type LoginFormData, loginSchema } from '@/types/schemas';
import { contentType } from './AuthModal';


const LoginForm = ({ setFormType }: { setFormType: (type: contentType ) => void }) => {
  const [loginError, setLoginError] = useState<string | null>(null);
  const loginMutation = useLogin();
  
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
      setLoginError(errorMessages);
    } else {
      setLoginError(null);
    }
  }, [errors, email, password]);

  // Clear login error when user types
  useEffect(() => {
    if (loginError) {
      setLoginError(null);
    }
  }, [email, password]);

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null);
    try {
      await loginMutation.mutateAsync({ email: data.email, password: data.password });
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || err?.message || 'Login failed. Please check your credentials and try again.');
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
          isError={!!errors.email} 
        />
        <CustomInput 
          register={register} 
          name="password" 
          type="password" 
          placeholder="Password" 
          icon="password" 
          isError={!!errors.password} 
        />

        <button type="button" onClick={() => setFormType('forgot' as contentType)} className="text-sm text-mute font-light cursor-pointer hover:text-mute/50 transition-colors">Forgot password? </button>

        <Button
          type="submit"
          disabled={loginMutation.isPending || !isValid}
          className="w-full h-12 rounded-full bg-blue hover:bg-blue/80 text-white font-medium mb-1"
        >
          {loginMutation.isPending ? 'Loading...' : 'Login'}
        </Button>

        {loginError && (
          <div className="text-center text-red-400 text-sm px-4 w-full font-light">
            {loginError}
          </div>
        )}
      </form>
      <Divider />
      <SocialMediaButtons setFormType={setFormType} />
      <div className="mt-4 text-center text-sm text-mute " >
        Don't have an account? 
        <button onClick={() => setFormType('signup')} className="text-blue hover:text-black underline cursor-pointer pl-1">
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
