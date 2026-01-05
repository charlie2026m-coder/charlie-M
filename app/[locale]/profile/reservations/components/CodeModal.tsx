'use client'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/ClientDialog"
interface CodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CodeModal = ({ open, onOpenChange }: CodeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[900px] w-[95%] px-3 md:px-10 xl:px-25'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-semibold text-center'>Access Info</DialogTitle>
        </DialogHeader>
        
        <div className='flex flex-col gap-4'>
          <Image 
            src='/images/pin-info.webp' 
            alt='Pin instruction' 
            width={550} 
            height={300}
            className='w-full h-auto rounded-lg max-h-[300px] mb-6'
          />
          <p className='text-mute'>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CodeModal