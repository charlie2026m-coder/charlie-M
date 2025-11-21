import React from 'react'
import { cn } from '@/lib/utils'


const CustomCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={cn('flex flex-col gap-4 bg-white rounded-2xl p-[30px]', className)}>
      {children}
    </div>
  )
}

export default CustomCard