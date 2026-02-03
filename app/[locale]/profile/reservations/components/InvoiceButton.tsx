'use client'
import { useTranslations } from 'next-intl'
import { Button } from '@/app/_components/ui/button'
import { MdDownload } from 'react-icons/md'
import { useDownloadInvoice } from '@/app/hooks/useDownloadInvoice'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover'
import { useState } from 'react'

export const InvoiceButton = ({ 
  reservationId, 
  className 
}: { 
  reservationId: string, 
  className?: string 
}) => {
  const t = useTranslations('profile')
  const { mutate: downloadInvoice, isPending } = useDownloadInvoice()
  const [open, setOpen] = useState(false)

  const handleDownloadInvoice = (languageCode: 'en' | 'de') => {
    const folioId = `${reservationId}-1`
    
    downloadInvoice({
      folioId,
      languageCode,
      lineItemGrouping: 'NoGrouping',
      filename: `invoice-${folioId}.pdf`
    })
    
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant='outline' 
          className={cn('text-sm flex items-center gap-2 px-5', className)} 
          disabled={isPending}
        > 
          <MdDownload className='size-5' /> 
          {isPending ? t('downloading') || 'Downloading...' : t('viewInvoice')} 
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-2'>
        <div className='flex flex-col gap-2'>
          
          <Button 
            variant='ghost' 
            className='justify-start h-9 rounded px-4'
            onClick={() => handleDownloadInvoice('en')}
            disabled={isPending}
          >
            🇬🇧 English
          </Button>
          <Button 
            variant='ghost' 
            className='justify-start h-9 rounded px-4 '
            onClick={() => handleDownloadInvoice('de')}
            disabled={isPending}
          >
            🇩🇪 Deutsch
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}