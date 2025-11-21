'use client'

import { cn } from "@/lib/utils"; 
import { useState } from "react";

export default function ReadSection({children}: {children: React.ReactNode}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className={cn('overflow-hidden h-[200px] md:h-auto', open && 'h-full')}>
        {children}
      </div>
      <div className='text-brown font-semibold mb-5 md:hidden' onClick={()=> setOpen(prev => !prev)}>
        {open ? "Hide" :"Read more"}
      </div>
    </>
  );
}
