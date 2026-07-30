import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Guest-facing in-room QR ("open my booking"). Lives outside [locale] on
// purpose: the printed QR URL must stay short and locale-free; the page brings
// its own DE/EN toggle. middleware.ts bypasses /room/ accordingly.
//
// noindex: the URL IS the credential printed on the sticker — it must never
// turn up in a search result.
export const metadata: Metadata = {
  title: 'Your booking',
  robots: { index: false, follow: false },
};

export default function RoomLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
