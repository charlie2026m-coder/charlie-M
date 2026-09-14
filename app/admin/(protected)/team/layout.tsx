import type { ReactNode } from 'react'
import { AreaGate } from '@/app/_components/admin/AreaGate'

export default function TeamLayout({ children }: { children: ReactNode }) {
  return <AreaGate area='team'>{children}</AreaGate>
}
