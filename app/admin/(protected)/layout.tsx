import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getAdminSession } from '@/lib/requireAdmin';
import { canUsePanel } from '@/lib/adminAccess';
import { AdminShell } from '@/app/_components/admin/AdminShell';

/**
 * The gate in front of every panel screen. Server-side, before anything
 * renders: a signed-in staff member who has passed their second factor if
 * they have one. What they may do (their areas) travels into the shell, which
 * shows only the screens they can open; the sections' own layouts refuse the
 * rest by URL.
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();

  // The login page knows what to do with each of these: nothing for a
  // stranger, a code prompt for somebody halfway through two-factor, a plain
  // "no access" for an account that is not on the team.
  if (session.status !== 'ok') redirect('/admin/login');

  // The restaurant's login has its own screens. Landing here by URL sends it
  // there rather than showing a panel of things it cannot use.
  if (!canUsePanel(session.areas)) {
    redirect(session.areas.includes('kitchen') ? '/kitchen' : '/admin/login');
  }

  return (
    <AdminShell areas={session.areas} who={session.name || session.email}>
      {children}
    </AdminShell>
  );
}
