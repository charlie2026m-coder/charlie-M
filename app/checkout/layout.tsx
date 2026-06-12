import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Guest-facing QR self-checkout. Lives outside [locale] on purpose: the
// printed QR URL must stay short and locale-free; the page brings its own
// DE/EN toggle. middleware.ts bypasses /checkout accordingly.
export const metadata: Metadata = {
  title: 'Check-out',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
