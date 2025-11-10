import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../ui/customInput"
import { zodResolver } from "@hookform/resolvers/zod";
import { ResetPasswordFormData, resetPasswordSchema } from "@/types/schemas";
import { Button } from "../ui/button";
import { contentType } from "./AuthModal";
import { useAuthActions } from "@/app/hooks/useAuthActions";

const ResetPasswordForm = ({ setFormType }: { setFormType: (type: contentType ) => void }) => {
  const [error, setError] = useState<string | null>(null);
  const { handleUpdatePassword, isLoading } = useAuthActions();

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
    const result = await handleUpdatePassword(data.password);

    if (result.success) {
      setFormType('success');
    } else {
      setError(result.error || 'Failed to save password. Please try again.');
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative mb-[30px]">
      <h1 className="text-3xl font-[400] text-center mb-[30px]">Reset Password</h1>
      <h2 className="text-sm text-center mb-[30px] text-gray">Enter your new password</h2>
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
        disabled={isLoading || !isValid}
        className="w-full h-12 rounded-full bg-brown hover:bg-brown/80 text-white font-medium !mb-0"
      >
        {isLoading ? 'Updating...' : 'Save'}
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