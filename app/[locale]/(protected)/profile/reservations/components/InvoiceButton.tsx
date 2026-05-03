'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/app/_components/ui/button'
import { MdDownload } from 'react-icons/md'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/_components/ui/popover'
import { useDownloadInvoicePdf } from '@/app/hooks/useInvoice'
import { BillingDataDialog } from './BillingDataDialog'
import type { FolioDebitor } from '@/types/apaleo'

interface InvoiceButtonProps {
  reservationId: string
  className?: string
}

interface InvoiceState {
  invoiceId: string
  languageCode: string
  lockedAt: string
}

export const InvoiceButton = ({ reservationId, className }: InvoiceButtonProps) => {
  const t = useTranslations('profile')
  const folioId = `${reservationId}-1`

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [debitor, setDebitor] = useState<FolioDebitor | null>(null)
  const [lockedState, setLockedState] = useState<InvoiceState | null>(null)

  const downloadPdf = useDownloadInvoicePdf()

  const fetchFolioData = async () => {
    const response = await fetch(`/api/invoice/folio?folioId=${encodeURIComponent(folioId)}`)
    if (!response.ok) throw new Error('Failed to fetch folio data')
    return response.json() as Promise<{
      folio: { debitor?: FolioDebitor }
      invoices: Array<{ id: string }>
      state: InvoiceState | null
    }>
  }

  const handleButtonClick = async () => {
    setIsLoading(true)
    try {
      const data = await fetchFolioData()

      if (data.state?.lockedAt) {
        setLockedState(data.state)
        setPopoverOpen(true)
      } else {
        setDebitor(data.folio.debitor ?? null)
        setDialogOpen(true)
      }
    } catch {
      toast.error(t('invoiceDownloadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadLocked = async () => {
    setPopoverOpen(false)

    if (!lockedState) {
      toast.error(t('invoiceDownloadFailed'))
      return
    }

    try {
      await downloadPdf.mutateAsync({
        invoiceId: lockedState.invoiceId,
        filename: `invoice-${folioId}.pdf`,
      })
      toast.success(t('invoiceDownloaded'))
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      toast.error(message === 'invoiceNotReady' ? t('invoiceNotReady') : t('invoiceDownloadFailed'))
    }
  }

  return (
    <>
      <Popover
        open={popoverOpen}
        onOpenChange={(open) => { if (!open) setPopoverOpen(false) }}
      >
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className={cn('text-sm flex items-center gap-2 px-3', className)}
            disabled={isLoading || downloadPdf.isPending}
            onClick={handleButtonClick}
          >
            <MdDownload className='size-5' />
            {isLoading || downloadPdf.isPending ? t('downloading') : t('viewInvoice')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-2'>
          <div className='flex flex-col gap-2'>
            <div className='text-xs text-gray-500 px-2 pb-1'>{t('invoiceLockedHint')}</div>
            <Button
              variant='ghost'
              className='justify-start h-9 rounded px-4'
              onClick={handleDownloadLocked}
              disabled={downloadPdf.isPending}
            >
              <MdDownload className='size-4 mr-2' />
              {t('downloadInvoice')} ({lockedState?.languageCode === 'de' ? 'DE' : 'EN'})
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <BillingDataDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        folioId={folioId}
        debitor={debitor}
      />
    </>
  )
}
