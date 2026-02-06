import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import CustomInput from '../ui/customInput';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/types/schemas';
import { useForgotPassword } from '@/app/hooks/useAuth';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';

const ForgotPassword = () => {
  const t = useTranslations('forgotPassword');
  const [error, setError] = useState<string | null>(null);
  const forgotPasswordMutation = useForgotPassword();
  
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
    try {
      await forgotPasswordMutation.mutateAsync(data.email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('failedToSend');
      setError(errorMessage);
    }
  };

  return (
    <div className="w-full ">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative mb-[30px]">
        <h1 className="text-3xl font-[400] text-center mb-[30px]">{t('title')}</h1>
        <h2 className="text-sm text-center mb-[30px] text-dark">{t('subtitle')}</h2>

        <CustomInput register={register} name="email" type="email" placeholder={t('email')} icon="email" isError={!!errors.email} />

        <Button
          type="submit"
          disabled={forgotPasswordMutation.isPending || !isValid}
          className="w-full h-12 rounded-full bg-blue hover:bg-blue/80 text-white font-medium !mb-0"
        >
          {forgotPasswordMutation.isPending ? t('loading') : t('resetPassword')}
        </Button>
        {error && <div className="absolute bottom-[-28px] text-center left-1/2 -translate-x-1/2 text-red text-sm  w-[120%]">{error}</div>}
      </form>

      <div className="mt-[30px] text-center" >
        {t('rememberPassword')} 
        <Link href="/login" className="text-blue hover:text-black underline cursor-pointer pl-1">
          {t('login')}
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
