"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { size?: 'default' | 'sm' | 'lg' }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer  cursor-pointer border-black dark:bg-input/30 data-[state=checked]:bg-blue data-[state=checked]:text-black dark:data-[state=checked]:bg-primary data-[state=checked]:border-blue focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive  shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        size === 'sm' ? 'size-5' : size === 'lg' ? 'size-7' : 'size-7',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className={cn("size-5", size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5')} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
