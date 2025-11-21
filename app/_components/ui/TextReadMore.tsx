'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface TextReadMoreProps {
  text: string
  lines?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
  buttonClassName?: string
}

export default function TextReadMore({ 
  text, 
  lines = 3, 
  className = '',
  buttonClassName = '',
}: TextReadMoreProps) {
  const [readMore, setReadMore] = useState(false)

  const lineClampClass = "line-clamp-"+lines

  return (
    <div className={cn('mb-4', className)}>
      <p className={cn(
        'text-[13px] inter font-[400]',
        !readMore ? `${lineClampClass} xl:line-clamp-none` : '',
      )}>
        {text}
      </p>
      <button 
        onClick={() => setReadMore(!readMore)} 
        className={cn(
          'text-brown text-sm font-medium hover:underline mt-2 lg:hidden',
          buttonClassName
        )}
      >
        {readMore ? 'Read less' : 'Read more'}
      </button>
    </div>
  )
}

