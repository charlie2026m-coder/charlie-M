'use client'
import Dot from "@/app/_components/ui/dot";
import CustomInput from "@/app/_components/ui/customInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  GuestDetailsFormData, 
  guestDetailsSchema,
  ChangePasswordFormData,
  changePasswordSchema,
  SetPasswordFormData,
  setPasswordSchema
} from "@/types/schemas";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/app/_components/ui/button";
import { useChangePassword, useSetPassword } from "@/app/hooks/useAuth";
import { useProfile } from "@/app/hooks/useProfile";
import { useEffect } from "react";

export default function Profile() {
  const { user } = useAuth();
  const { profile, updateMutation, loading: profileLoading } = useProfile();

  // React Query mutations
  const changePasswordMutation = useChangePassword();
  const setPasswordMutation = useSetPassword();

  // Check if user signed in with email/password or OAuth (Google)
  const isEmailPasswordUser = user?.app_metadata?.provider === 'email' || user?.identities?.some(identity => identity.provider === 'email');
  const isOAuthUser = user?.app_metadata?.provider === 'google' || user?.identities?.some(identity => identity.provider === 'google');

  // Profile form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: isProfileDirty },
    reset,
  } = useForm<GuestDetailsFormData>({
    resolver: zodResolver(guestDetailsSchema),
    defaultValues: {
      name: '',
      last_name: '',
      email: '',
      phone: '',
    },
  })

  // Load profile data into form when available
  useEffect(() => {
    if (profile) {
      // Split name into first and last name
      const nameParts = (profile.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      reset({
        name: firstName,
        last_name: lastName,
        email: profile.email || '',
        phone: profile.mobile || '',
      });
    }
  }, [profile, reset]);

  // Password change form (for email/password users)
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isDirty: isPasswordDirty },
    reset: resetPasswordForm,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  // Set password form (for OAuth users)
  const {
    register: registerSetPassword,
    handleSubmit: handleSetPasswordSubmit,
    formState: { errors: setPasswordErrors, isDirty: isSetPasswordDirty },
    reset: resetSetPasswordForm,
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
  })

  // Unified handlers for all forms
  const handleSaveChanges = async () => {
    // Save all changed forms
    if (isProfileDirty) await handleSubmit(onSubmit)();
    if (isPasswordDirty)await handlePasswordSubmit(onChangePassword)();
    if (isSetPasswordDirty) await handleSetPasswordSubmit(onSetPassword)();
  }

  const handleDiscard = () => {
    if (isProfileDirty) reset();
    if (isPasswordDirty) resetPasswordForm();
    if (isSetPasswordDirty)resetSetPasswordForm();
  }

  const onSubmit = async (data: GuestDetailsFormData) => {
    // Combine first and last name
    const fullName = `${data.name} ${data.last_name}`.trim();
    
    await updateMutation.mutateAsync({
      name: fullName,
      email: data.email,
      mobile: data.phone,
    });

    // Update form with new values to mark as not dirty
    reset({
      name: data.name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
    });
  }

  // Handle password change for email/password users
  const onChangePassword = async (data: ChangePasswordFormData) => {
    await changePasswordMutation.mutateAsync({
      email: user?.email || '',
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    resetPasswordForm();
  }

  // Handle set password for OAuth users
  const onSetPassword = async (data: SetPasswordFormData) => {
    await setPasswordMutation.mutateAsync(data.newPassword);
    resetSetPasswordForm();
  }

  // Check if any form is loading
  const isLoading = changePasswordMutation.isPending || setPasswordMutation.isPending || updateMutation.isPending;
  
  // Check if any form has changes
  const hasChanges = isProfileDirty || isPasswordDirty || isSetPasswordDirty;

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <h3 className="flex gap-2 items-center font-semibold text-2xl mb-9"><Dot size={15} color='blue'/>Profile</h3>
        <div className='grid grid-cols-2 gap-8  pb-6 border-b mb-6'>
          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={register} 
              name='name' 
              type='text' 
              placeholder='Name' 
              icon='name'
              isError={!!errors.name}
            />
            {errors.name && (
              <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.name.message}</span>
            )}
          </div>
          
          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={register}
              name='last_name' 
              type='text' 
              placeholder='Last Name' 
              icon='name'
              isError={!!errors.last_name}
            />
            {errors.last_name && (
              <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.last_name.message}</span>
            )}
          </div>
          
          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={register}
              name='email' 
              type='email' 
              placeholder='Email' 
              icon='email'
              isError={!!errors.email}
            />
            {errors.email && (
              <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.email.message}</span>
            )}
          </div>
          
          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={register}
              name='phone' 
              type='phone' 
              placeholder='Phone' 
              icon='phone'
              isError={!!errors.phone}
            />
            {errors.phone && (
              <span className='absolute bottom-0 left-0 text-red text-xs pl-4'>{errors.phone.message}</span>
            )}
          </div>
        </div>
      </form>

    {/* Password Change Section */}
    {isEmailPasswordUser && (
      <form onSubmit={(e) => e.preventDefault()} className='mt-6'>
        <h4 className='text-lg font-medium mb-5'>Change Password</h4>
        
        <div className='grid grid-cols-1 w-1/2 gap-8'>
          <div className='relative flex flex-col gap-1'>
            <CustomInput 
              register={registerPassword}
              name='newPassword' 
              type='password' 
              placeholder='New Password' 
              icon='password'
              isError={!!passwordErrors.newPassword}
            />
            {passwordErrors.newPassword && (
              <span className='absolute -bottom-5 left-0 text-red text-xs pl-4'>
                {passwordErrors.newPassword?.message}
              </span>
            )}
          </div>

          <div className='relative flex flex-col gap-1'>
            <CustomInput 
              register={registerPassword}
              name='confirmPassword' 
              type='password' 
              placeholder='Confirm New Password' 
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
    )}

    {/* Set Password Section for OAuth Users */}
    {isOAuthUser && !isEmailPasswordUser && (
      <form onSubmit={(e) => e.preventDefault()} className='mt-6'>
        <h4 className='text-lg font-medium mb-5'>Set Password</h4>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          <div className='relative flex flex-col gap-1'>
            <CustomInput 
              register={registerSetPassword}
              name='newPassword' 
              type='password' 
              placeholder='New Password' 
              icon='password'
              isError={!!setPasswordErrors.newPassword}
            />
            {setPasswordErrors.newPassword && (
              <span className='absolute -bottom-5 left-0 text-red text-xs pl-4'>
                {setPasswordErrors.newPassword?.message}
              </span>
            )}
          </div>

          <div className='relative flex flex-col gap-1'>
            <CustomInput 
              register={registerSetPassword}
              name='confirmPassword' 
              type='password' 
              placeholder='Confirm Password' 
              icon='password'
              isError={!!setPasswordErrors.confirmPassword}
            />
            {setPasswordErrors.confirmPassword && (
              <span className='absolute -bottom-5 left-0 text-red text-xs pl-4'>
                {setPasswordErrors.confirmPassword?.message}
              </span>
            )}
          </div>
        </div>
      </form>
    )}
    <div className='flex gap-4 mt-auto self-end'>
      <Button 
        type='button' 
        variant='outline' 
        className='w-full md:w-auto h-[44px]'
        onClick={handleDiscard}
        disabled={!hasChanges || isLoading}
      >
        Discard
      </Button>
      <Button 
        type='button'
        className='w-full md:w-auto h-[44px]'
        onClick={handleSaveChanges}
        disabled={!hasChanges || isLoading}
      >
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
    </>
  )
}