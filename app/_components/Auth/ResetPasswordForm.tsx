import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../ui/customInput"
import { zodResolver } from "@hookform/resolvers/zod";
import { ResetPasswordFormData, resetPasswordSchema } from "@/types/schemas";
import { Button } from "../ui/button";
import { useUpdatePassword } from "@/app/hooks/useAuth";
import Success from "./Success";
import { useRouter } from "@/navigation";

const ResetPasswordForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const updatePasswordMutation = useUpdatePassword();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.entries(errors).map(([, error]) => error?.message).filter(Boolean).join(', ');
      setError(errorMessages);
    } else {
      setError(null);
    }
  }, [errors, password, confirmPassword]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null);
    try {
      await updatePasswordMutation.mutateAsync(data.password);
      setShowSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save password';
      setError(errorMessage);
    }
  };
  
  if (showSuccess) {
    return <Success type='passSuccess' onClose={() => router.push('/login')} />;
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative mb-[30px]">
      <h1 className="text-3xl font-[400] text-center mb-6">New Password</h1>
      <h2 className="text-sm text-center mb-8 text-dark">Enter your new password</h2>
      <CustomInput 
        register={register} 
        name="password" 
        type="password" 
        placeholder="Password" 
        icon="password"
        isError={!!errors.password}
      />

      <CustomInput 
        register={register} 
        name="confirmPassword" 
        type="password" 
        placeholder="Confirm Password" 
        icon="password"
        isError={!!errors.confirmPassword}
      />

      <Button
        type="submit"
        disabled={updatePasswordMutation.isPending || !isValid}
        className="w-full h-12 rounded-full bg-blue hover:bg-blue/80 text-white font-medium !mb-0"
      >
        {updatePasswordMutation.isPending ? 'Updating...' : 'Save'}
      </Button>
      
      {error && (
        <div className="absolute bottom-[-28px] text-center left-1/2 -translate-x-1/2 text-red text-sm w-[120%]">
          {error}
        </div>
      )}
    </form>
  )
}

export default ResetPasswordForm