'use client'
import CustomInput from "@/app/_components/ui/customInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileDetailsFormData, profileDetailsSchema } from "@/types/schemas";
import { Button } from "@/app/_components/ui/button";
import { useProfile } from "@/app/hooks/useProfile";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import PasswordForm from "./components/PasswordForm";
import DeleteAccountModal from "./components/DeleteAccountModal";
import { useRouter } from "@/navigation";
import { supabase } from "@/lib/supabase";
import { useProfileStore } from "@/store/useProfile";
import { useTranslations } from 'next-intl';

export default function Profile() {
  const t = useTranslations('profile');
  const { profile, updateMutation } = useProfile();
  const searchParams = useSearchParams();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const router = useRouter();
  const { clearGuestMode } = useProfileStore();

  useEffect(() => {
    const checkGuestMode = () => {
      const guestMode = sessionStorage.getItem('guestMode') === 'true';
      setIsGuestMode(guestMode);
    };
    
    checkGuestMode();
    
    // Also check on storage events (in case guestMode changes in another tab)
    window.addEventListener('storage', checkGuestMode);
    return () => window.removeEventListener('storage', checkGuestMode);
  }, []);

  // Profile form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: isProfileDirty },
    reset,
  } = useForm<ProfileDetailsFormData>({
    resolver: zodResolver(profileDetailsSchema),
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
      toast.success(t('emailConfirmed'));
      // Remove the query parameter from URL without page reload
      window.history.replaceState({}, '', '/profile');
    }
  }, [searchParams, t]);

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

  const onSubmit = async (data: ProfileDetailsFormData) => {
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

  // Guest mode view
  if (isGuestMode) {
    const handleCreateAccount = async () => {
      clearGuestMode();
      await supabase.auth.signOut();
      router.push('/signup');
    };

    return (
      <div className='flex flex-col flex-1 px-3 lg:px-[30px] items-center justify-center min-h-[500px]'>
        <div className='max-w-md text-center'>
          <h2 className='text-2xl font-semibold mb-4'>{t('createAnAccount')}</h2>
          <p className='text-gray-600 mb-6'>
            {t('signUpDescription')}
          </p>

          <Button 
            variant="outline"
            onClick={handleCreateAccount}
            className='w-full h-12 mt-3'
          >
            {t('createAccountButton')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='px-[30px] flex flex-col pt-10'>
      <form onSubmit={(e) => e.preventDefault()}>
        <h3 className="flex gap-2 items-center font-semibold text-2xl mb-9">{t('profile')}</h3>
        <div className='grid  lg:grid-cols-2 gap-8 mb-5'>
          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={register} 
              name='name' 
              type='text' 
              placeholder={t('name')} 
              icon='name'
              isError={!!errors.name}
            />
            {errors.name && (
              <span className='absolute -bottom-5 left-0 text-red text-xs pl-4'>{errors.name.message}</span>
            )}
          </div>
          
          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={register}
              name='last_name' 
              type='text' 
              placeholder={t('lastName')} 
              icon='name'
              isError={!!errors.last_name}
            />
            {errors.last_name && (
              <span className='absolute -bottom-5 left-0 text-red text-xs pl-4'>{errors.last_name.message}</span>
            )}
          </div>
          
          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={register}
              name='email' 
              type='email' 
              placeholder={t('email')} 
              icon='email'
              isError={!!errors.email}
            />
            {errors.email && (
              <span className='absolute -bottom-5 left-0 text-red text-xs pl-4'>{errors.email.message}</span>
            )}
          </div>
          
          <div className='relative flex flex-col gap-1 '>
            <CustomInput 
              register={register}
              name='phone' 
              type='phone' 
              placeholder={t('phone')} 
              icon='phone'
              isError={!!errors.phone}
            />
            {errors.phone && (
              <span className='absolute -bottom-5 left-0 text-red text-xs pl-4'>{errors.phone.message}</span>
            )}
          </div>
        </div>
      </form>

 
    {hasChanges && (
      <div className='flex gap-4 self-end mb-10 mt-4'>
        <Button 
          type='button' 
          variant='outline' 
          className='flex-1 md:flex-0 h-[44px]'
          onClick={handleDiscard}
          disabled={!hasChanges || isLoading}
        >
          {t('discard')}
        </Button>
        <Button 
          type='button'
          className='flex-1 md:flex-0 h-[44px]'
          onClick={handleSaveChanges}
          disabled={!hasChanges || isLoading}
        >
          {isLoading ? t('saving') : t('saveChanges')}
        </Button>
      </div>)
    }
    <PasswordForm />

    {/* Danger Zone */}
    <div className='mt-12 pt-8 border-t border-gray-200'>
      
      <div className='bg-red/5 border border-red/20 rounded-2xl p-5'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
          <div>
            <h4 className='font-semibold text-gray-900 mb-1'>{t('deleteAccount')}</h4>
            <p className='text-sm text-gray-600'>
              {t('permanentlyDelete')}
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            onClick={() => setShowDeleteModal(true)}
            className='h-11 px-6 rounded-full border-red text-red hover:bg-red hover:text-white transition-colors whitespace-nowrap'
          >
            {t('deleteAccount')}
          </Button>
        </div>
      </div>
    </div>

    {/* Delete Account Modal */}
    <DeleteAccountModal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
    />
    </div>
  )
}