import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ReactNode } from 'react';

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: adminData } = await supabase
    .from('admins')
    .select('role')
    .eq('email', user.email!)
    .single();

  if (!adminData) {
    redirect('/admin/login');
  }

  return <>{children}</>;
}
