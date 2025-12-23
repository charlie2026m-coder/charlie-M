'use client'
import { useEffect, useState } from 'react'
import { CustomDialog as OriginalCustomDialog } from './CustomDialog'

// Wrapper для CustomDialog, который рендерится только на клиенте
// Это решает проблему hydration mismatch с Radix UI Dialog

export function ClientCustomDialog({ 
  trigger, 
  content, 
  title, 
  open, 
  setOpen 
}: { 
  trigger: React.ReactNode, 
  content: React.ReactNode, 
  title: string, 
  open: boolean, 
  setOpen: (open: boolean) => void 
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Показываем только trigger до монтирования
    return <div>{trigger}</div>
  }

  return (
    <OriginalCustomDialog
      trigger={trigger}
      content={content}
      title={title}
      open={open}
      setOpen={setOpen}
    />
  )
}

