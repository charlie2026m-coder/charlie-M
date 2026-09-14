import type { ReactNode } from 'react'
import { AreaGate } from '@/app/_components/admin/AreaGate'

export default function BreakfastLayout({ children }: { children: ReactNode }) {
  return <AreaGate area='breakfast'>{children}</AreaGate>
}
