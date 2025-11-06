'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { login, register, logout, resetPassword, updatePassword } from '../_services/authService';
import { LoginCredentials, RegisterCredentials } from '@/types/auth';

export function useAuthActions() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    const loadingToastId = toast.loading('Logging in...');

    try {
      const result = await login(credentials);

      if (result.success) {
        toast.success('Login successful!', { id: loadingToastId });
        
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 500);

        return { success: true };
      } else {
        toast.error(result.error || 'Login failed', { id: loadingToastId });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
      toast.error(errorMessage, { id: loadingToastId });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    const loadingToastId = toast.loading('Creating your account...');

    try {
      const result = await register(credentials);

      if (result.success) {
        if (result.requiresEmailConfirmation) {
          toast.dismiss(loadingToastId);
        } else {
          toast.success('Account created successfully!', { id: loadingToastId });
          
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 500);
        }

        return { success: true, requiresEmailConfirmation: result.requiresEmailConfirmation };
      } else {
        toast.error(result.error || 'Registration failed', { id: loadingToastId });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      toast.error(errorMessage, { id: loadingToastId });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    const loadingToastId = toast.loading('Logging out...');

    try {
      const result = await logout();

      if (result.success) {
        toast.success('Logged out successfully', { id: loadingToastId });
        router.push('/');
        router.refresh();
        return { success: true };
      } else {
        toast.error(result.error || 'Logout failed', { id: loadingToastId });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed. Please try again.';
      toast.error(errorMessage, { id: loadingToastId });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setIsLoading(true);
    const loadingToastId = toast.loading('Sending reset link...');

    try {
      const result = await resetPassword(email);

      if (result.success) {
        toast.dismiss(loadingToastId);
        return { success: true };
      } else {
        toast.error(result.error || 'Failed to send reset link', { id: loadingToastId });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      toast.error(errorMessage, { id: loadingToastId });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    setIsLoading(true);
    const loadingToastId = toast.loading('Updating password...');

    try {
      const result = await updatePassword(newPassword);

      if (result.success) {
        toast.success('Password updated successfully!', { id: loadingToastId });
        return { success: true };
      } else {
        toast.error(result.error || 'Failed to update password', { id: loadingToastId });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      toast.error(errorMessage, { id: loadingToastId });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleLogin,
    handleRegister,
    handleLogout,
    handleForgotPassword,
    handleUpdatePassword,
    isLoading,
  };
}

