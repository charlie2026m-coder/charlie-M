'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  login, 
  register, 
  logout, 
  resetPassword, 
  updatePassword,
  signInWithOAuth,
  changePassword,
  setPassword
} from '@/services/authService';
import { LoginCredentials, RegisterCredentials } from '@/types/auth';

// Login mutation
export const useLogin = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const result = await login(credentials);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: () => {
      toast.loading('Logging in...', { id: 'login' });
    },
    onSuccess: () => {
      toast.success('Login successful!', { id: 'login' });
      setTimeout(() => {
        router.push('/profile');
        router.refresh();
      }, 500);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed', { id: 'login' });
    },
  });
};

// Register mutation
export const useRegister = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const result = await register(credentials);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: () => {
      toast.loading('Creating your account...', { id: 'register' });
    },
    onSuccess: (result) => {
      if (result.requiresEmailConfirmation) {
        toast.dismiss('register');
      } else {
        toast.success('Account created successfully!', { id: 'register' });
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 500);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed', { id: 'register' });
    },
  });
};

// Logout mutation
export const useLogout = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const result = await logout();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: () => {
      toast.loading('Logging out...', { id: 'logout' });
    },
    onSuccess: () => {
      toast.success('Logged out successfully', { id: 'logout' });
      router.push('/');
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Logout failed', { id: 'logout' });
    },
  });
};

// Forgot password mutation
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const result = await resetPassword(email);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: () => {
      toast.loading('Sending reset link...', { id: 'forgot-password' });
    },
    onSuccess: () => {
      toast.dismiss('forgot-password');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send reset link', { id: 'forgot-password' });
    },
  });
};

// Update password mutation (for reset password flow)
export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const result = await updatePassword(newPassword);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: () => {
      toast.loading('Updating password...', { id: 'update-password' });
    },
    onSuccess: () => {
      toast.success('Password updated successfully!', { id: 'update-password' });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update password', { id: 'update-password' });
    },
  });
};

// OAuth sign in mutation
export const useOAuthSignIn = () => {
  return useMutation({
    mutationFn: async (provider: 'google' | 'apple') => {
      const result = await signInWithOAuth(provider);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'OAuth sign in failed');
    },
  });
};

// Change password mutation (for email/password users)
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async ({ 
      email, 
      currentPassword, 
      newPassword 
    }: { 
      email: string; 
      currentPassword: string; 
      newPassword: string 
    }) => {
      const result = await changePassword(email, currentPassword, newPassword);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to change password');
    },
  });
};

// Set password mutation (for OAuth users)
export const useSetPassword = () => {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const result = await setPassword(newPassword);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Password set successfully. You can now login with email and password.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set password');
    },
  });
};

