import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground flex min-h-28 w-full rounded-[20px] border border-gray bg-white px-4 py-3 text-base shadow-none outline-none transition-[color,box-shadow] resize-y",
        "focus-visible:border-blue focus-visible:ring-blue/20 focus-visible:ring-[3px]",
        "aria-invalid:border-red aria-invalid:ring-red/20",
        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
