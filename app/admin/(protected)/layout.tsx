import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isKitchenRole } from '@/lib/requireAdmin';
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

  // The restaurant has its own screens. Landing here by URL sends them there
  // rather than showing a panel of things they cannot use.
  if (isKitchenRole(adminData.role)) {
    redirect('/kitchen');
  }

  return <>{children}</>;
}
