'use client'
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog'

// Wrapper компоненты, которые рендерятся только на клиенте
// Это решает проблему hydration mismatch с Radix UI Dialog

function ClientDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <Dialog {...props}>{children}</Dialog>
}

// Экспортируем все компоненты Dialog с клиентским рендерингом
export {
  ClientDialog as Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

