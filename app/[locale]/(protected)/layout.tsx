import { ReactNode } from 'react';
import { redirect } from '@/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
