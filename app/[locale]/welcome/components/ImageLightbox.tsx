'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { IoClose } from 'react-icons/io5'

type Props = {
  src: string
  alt: string
}

export function ImageLightbox({ src, alt }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <>
      <div className="h-[400px] lg:h-[550px] overflow-hidden cursor-zoom-in" onClick={() => setOpen(true)}>
        <Image src={src} alt={alt} width={505} height={274} className="w-full h-full object-cover" />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors"
            onClick={() => setOpen(false)}
          >
            <IoClose size={36} />
          </button>
          <div
            className="relative w-full h-full max-w-[90vw] max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <Image src={src} alt={alt} fill className="object-contain" />
          </div>
        </div>
      )}
    </>
  )
}
