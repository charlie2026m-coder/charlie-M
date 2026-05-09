'use client'
import { useEffect, useState } from 'react'
import { CustomDialog as OriginalCustomDialog } from './CustomDialog'
export function ClientCustomDialog({
  trigger,
  content,
  title,
  titleAction,
  open,
  setOpen,
  className
}: {
  trigger: React.ReactNode,
  content: React.ReactNode,
  title: string,
  titleAction?: React.ReactNode,
  open: boolean,
  setOpen: (open: boolean) => void
  className?: string
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>{trigger}</div>
  }

  return (
    <OriginalCustomDialog
      trigger={trigger}
      content={content}
      title={title}
      titleAction={titleAction}
      open={open}
      setOpen={setOpen}
      className={className}
    />
  )
}

