import type { ReactNode } from 'react'
import { AreaGate } from '@/app/_components/admin/AreaGate'

// Rooms, extras and QR codes: the website's own content.
export default function HotelLayout({ children }: { children: ReactNode }) {
  return <AreaGate area='hotel'>{children}</AreaGate>
}
