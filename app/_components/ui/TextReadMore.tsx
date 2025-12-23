'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface TextReadMoreProps {
  text: string
  lines?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
  buttonClassName?: string
  textClassName?: string
}

export default function TextReadMore({ 
  text, 
  lines = 3, 
  className = '',
  buttonClassName = '',
  textClassName = '',
}: TextReadMoreProps) {
  const [readMore, setReadMore] = useState(false)

  // Получаем класс line-clamp (Tailwind требует статические классы)
  const getLineClampClass = () => {
    if (readMore) return ''
    switch (lines) {
      case 1: return 'line-clamp-1 xl:line-clamp-none'
      case 2: return 'line-clamp-2 xl:line-clamp-none'
      case 3: return 'line-clamp-3 xl:line-clamp-none'
      case 4: return 'line-clamp-4 xl:line-clamp-none'
      case 5: return 'line-clamp-5 xl:line-clamp-none'
      case 6: return 'line-clamp-6 xl:line-clamp-none'
      default: return 'line-clamp-3 xl:line-clamp-none'
    }
  }

  return (
    <div className={cn('mb-4', className)}>
      <p className={cn(
        'text-[15px] text-dark inter font-[400]',
        getLineClampClass(),
        textClassName
      )}>
        {text}
      </p>
      <button 
        onClick={() => setReadMore(!readMore)} 
        className={cn(
          'text-blue text-sm font-medium hover:underline mt-2 lg:hidden',
          buttonClassName
        )}
      >
        {readMore ? 'Read less' : 'Read more'}
      </button>
    </div>
  )
}

