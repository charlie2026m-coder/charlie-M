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

export const InvoiceButton = ({ reservationId, className }: InvoiceButtonProps) => {
  const t = useTranslations('profile')
  const folioId = `${reservationId}-1`

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [debitor, setDebitor] = useState<FolioDebitor | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)

  const downloadPdf = useDownloadInvoicePdf()

  const fetchFolioData = async () => {
    const response = await fetch(`/api/invoice/folio?folioId=${encodeURIComponent(folioId)}`)
    if (!response.ok) throw new Error('Failed to fetch folio data')
    return response.json()
  }

  const handleButtonClick = async () => {
    setIsLoading(true)
    try {
      const data = await fetchFolioData()
      const invoices = data.invoices ?? []

      if (invoices.length > 0) {
        setInvoiceId(invoices[0].id)
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

  const handleDownloadExisting = async () => {
    setPopoverOpen(false)

    if (!invoiceId) {
      toast.error(t('invoiceDownloadFailed'))
      return
    }

    try {
      await downloadPdf.mutateAsync({
        invoiceId,
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
            <Button
              variant='ghost'
              className='justify-start h-9 rounded px-4'
              onClick={handleDownloadExisting}
              disabled={downloadPdf.isPending}
            >
              EN English
            </Button>
            <Button
              variant='ghost'
              className='justify-start h-9 rounded px-4'
              onClick={handleDownloadExisting}
              disabled={downloadPdf.isPending}
            >
              DE Deutsch
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
