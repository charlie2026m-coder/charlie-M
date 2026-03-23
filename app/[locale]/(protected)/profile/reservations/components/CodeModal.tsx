'use client'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/ClientDialog"
import { Floor } from '@/app/[locale]/(protected)/profile/reservations/[id]/components/Floor'
import Dot from '@/app/_components/ui/dot'
interface CodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unitId: string | null | undefined
}

const CodeModal = ({ open, onOpenChange, unitId }: CodeModalProps) => {
  const t = useTranslations('profile')
  const instructions = [
    t('codeModalInstruction1'),
    t('codeModalInstruction2'),
    t('codeModalInstruction3'),
    t('codeModalInstruction4'),
    t('codeModalInstruction5'),
  ]
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
            className='w-full h-auto rounded-lg max-h-[300px] mb-2'
          />
          <ul className='flex flex-col gap-3'>
            {instructions.map((instruction, index) => (
              <li key={index} className='flex items-start gap-2 text-dark'>
                <Dot size={8} color='black' className='mt-1.5 shrink-0' />
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
          <Floor unitId={unitId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CodeModal