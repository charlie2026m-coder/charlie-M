'use client'
import Dot from "@/app/_components/ui/dot";
import CustomInput from "@/app/_components/ui/customInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GuestDetailsFormData,  guestDetailsSchema } from "@/types/schemas";
import { Button } from "@/app/_components/ui/button";
import { useProfile } from "@/app/hooks/useProfile";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import PasswordForm from "./components/PasswordForm";

export default function Profile() {
  const { profile, updateMutation } = useProfile();
  const searchParams = useSearchParams();
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

  // Check for email confirmation success
  useEffect(() => {
    const emailConfirmed = searchParams.get('email_confirmed');
    if (emailConfirmed === 'true') {
      toast.success('Email confirmed successfully! Your email has been updated.');
      // Remove the query parameter from URL without page reload
      window.history.replaceState({}, '', '/profile');
    }
  }, [searchParams]);

  // Load profile data into form when available
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.mobile || '',
      });
    }
  }, [profile, reset]);

  // Unified handlers for all forms
  const handleSaveChanges = async () => {
    // Save all changed forms
    if (isProfileDirty) await handleSubmit(onSubmit)();
  }

  const handleDiscard = () => {
    if (isProfileDirty) reset();
  }

  const onSubmit = async (data: GuestDetailsFormData) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    await updateMutation.mutateAsync({
      name: data.name,
      last_name: data.last_name,
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

  // Check if any form is loading
  const isLoading = updateMutation.isPending;
  // Check if any form has changes
  const hasChanges = isProfileDirty;

  return (
    <div className='px-[30px] flex flex-col'>
      <form onSubmit={(e) => e.preventDefault()}>
        <h3 className="flex gap-2 items-center font-semibold text-2xl mb-9">Profile</h3>
        <div className='grid  lg:grid-cols-2 gap-8 mb-5'>
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

 
    {hasChanges && (
      <div className='flex gap-4 self-end mb-10'>
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
      </div>)
    }
    <PasswordForm />
    </div>
  )
}