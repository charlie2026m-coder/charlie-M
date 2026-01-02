'use client'
import { Button } from "@/app/_components/ui/button";
import CustomInput from "@/app/_components/ui/customInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SetPasswordFormData, setPasswordSchema } from "@/types/schemas";
import { useAuth } from "@/lib/auth-provider";
import { useSetPassword } from "@/app/hooks/useAuth";

const PasswordForm = () => {
  const { user } = useAuth();
  
  // Check if user has password (for display purposes)
  const hasPassword = user?.identities?.some(identity => identity.provider === 'email');

  const setPasswordMutation = useSetPassword();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isDirty: isPasswordDirty },
    reset: resetPasswordForm,
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmitPassword = async (data: SetPasswordFormData) => {
    await setPasswordMutation.mutateAsync(data.newPassword);
    resetPasswordForm();
  }

  const handleSaveChanges = async () => {
    if (isPasswordDirty) {
      await handlePasswordSubmit(onSubmitPassword)();
    }
  }

  const handleDiscard = () => {
    if (isPasswordDirty) {
      resetPasswordForm();
    }
  }

  const isLoading = setPasswordMutation.isPending;
  const hasChanges = isPasswordDirty;
  
  return (
    <>
      <form onSubmit={(e) => e.preventDefault()} className='border-t pt-6'>
        <h4 className='text-lg font-medium mb-5'>{hasPassword ? 'Change Password' : 'Create Password'}</h4>
        
        <div className='grid grid-cols-1 w-full lg:w-1/2 gap-8'>
          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={registerPassword}
              name='newPassword' 
              type='password' 
              placeholder={hasPassword ? 'Change Password' : 'New Password'} 
              icon='password'
              isError={!!passwordErrors.newPassword}
            />
            {passwordErrors.newPassword && (
              <span className='absolute -bottom-5 left-0 text-red text-xs pl-4'>
                {passwordErrors.newPassword?.message}
              </span>
            )}
          </div>

          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={registerPassword}
              name='confirmPassword' 
              type='password' 
              placeholder='Confirm Password' 
              icon='password'
              isError={!!passwordErrors.confirmPassword}
            />
            {passwordErrors.confirmPassword && (
              <span className='absolute -bottom-5 left-0 text-red text-xs pl-4'>
                {passwordErrors.confirmPassword?.message}
              </span>
            )}
          </div>
        </div>
      </form>


    {hasChanges && <div className='flex gap-4 self-end pt-10'>
      <Button 
        type='button' 
        variant='outline' 
        className='flex-1 md:flex-0 h-[44px]'
        onClick={handleDiscard}
        disabled={!hasChanges || isLoading}
      >
        Discard
      </Button>
      <Button 
        type='button'
        className='flex-1 md:flex-0 h-[44px]'
        onClick={handleSaveChanges}
        disabled={!hasChanges || isLoading}
      >
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>}
    </>
  )
}

export default PasswordForm