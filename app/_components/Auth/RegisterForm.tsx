import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthActions } from '@/app/hooks/useAuthActions';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import CustomInput from '../ui/customInput';
import Divider from './divider';
import SocialMediaButtons from './SocialMediaButtons';
import { registerSchema, type RegisterFormData } from '@/types/schemas';
import { contentType } from './AuthModal';


const RegisterForm = ({ setFormType }: { setFormType: (type: contentType ) => void }) => {
  const [error, setError] = useState<string | null>(null);
  const { handleRegister, isLoading } = useAuthActions();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const email = watch('email');
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

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
  }, [errors, email, password, confirmPassword]);

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    const result = await handleRegister({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (!result.success && result.error) {
      setError(result.error);
    } else if (result.success && result.requiresEmailConfirmation) {
      setFormType('confirm');
    }
  };

  return (
    <div className="w-full ">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative mb-[30px]">
        <h1 className="text-3xl font-[400] text-center mb-[30px]">Welcome to Charlie M</h1>
        <h2 className="text-xl text-center mb-6">Sign Up</h2>

        <CustomInput 
          register={register} 
          name="name" 
          type="text" 
          placeholder="Last Name" 
          icon="name" 
        />
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
          isError={!!errors.password || !!errors.confirmPassword} 
        />
        <CustomInput 
          register={register} 
          name="confirmPassword" 
          type="password" 
          placeholder="Re-Password" 
          icon="password" 
          isError={!!errors.confirmPassword} 
        />

        <Button
          type="submit"
          disabled={isLoading || !isValid}
          className="w-full h-12 rounded-full bg-brown hover:bg-brown/80 text-white font-medium !mb-0"
        >
          {isLoading ? 'Loading...' : 'Sign Up'}
        </Button>
        {error && <div className="absolute bottom-[-28px] text-center text-red text-sm px-4 w-full">{error}</div>}
      </form>

      <Divider />
      <SocialMediaButtons setFormType={setFormType} />
      <div className="mt-[30px] text-center" >
        Already have an account? 
        <button onClick={() => setFormType('signin')} className="text-gray hover:text-black underline cursor-pointer pl-1">
          Login
        </button>
      </div>
    </div>
  );
};

export default RegisterForm;
