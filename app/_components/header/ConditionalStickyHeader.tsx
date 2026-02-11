'use client'

import { usePathname } from '@/navigation'
import StickyHeader from './StickyHeader'

interface ConditionalStickyHeaderProps {
  locale: string
}

const ConditionalStickyHeader = ({ locale }: ConditionalStickyHeaderProps) => {
  const pathname = usePathname()
  
  const hideOnPaths = ['/login', '/signup']
  const shouldHide = hideOnPaths.some(path => pathname === path || pathname.endsWith(path))
  
  if (shouldHide) return null
  
  return <StickyHeader locale={locale} />
}

export default ConditionalStickyHeader
