'use client'

import { GoCopy } from "react-icons/go";
import { toast } from "sonner";
import { useState } from "react";

const BookingCode = ({code, type}: {code: number | undefined, type: 'room' | 'code'}) => {
  const [isCopied, setIsCopied] = useState(false)
  if(!code) return null;

  const codeToString = (code: number) => {
    return code.toString().split('')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.toString())
      setIsCopied(true)
      toast.success('Code copied to clipboard!')
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (error) {
      toast.error('Failed to copy code')
      console.error('Copy failed:', error)
    }
  }

  const title = {
    room: "Room number:",
    code: true ? "This is your door code:" : "Please, check in for have access to the code",
  }
  
  const bg = type === 'room' ? "bg-brown/50" : "bg-blue/50";

  return (
    <div className={`flex items-center gap-2.5 justify-between text-sm py-1 px-3 rounded-xl ${bg} font-semibold`}>
      {title[type]}
      <div className='flex items-center gap-1'>
        {
          codeToString(code).map((digit, index) => (
            <div key={index} className='flex items-center justify-center h-[33px] w-6 border border-gray-400 rounded bg-white'>
              {digit}
            </div>
          ))
        }
        <button
          onClick={handleCopy}
          className='flex items-center justify-center size-6 rounded bg-white hover:scale-105 cursor-pointer transition-colors'
          title='Copy code'
        >
          <GoCopy className={`size-4 transition-colors ${isCopied ? 'text-gray-300' : ''}`} />
        </button>
      </div>
    </div>
  )
}

export default BookingCode