'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/app/_components/ui/button'
import { MdDownload } from 'react-icons/md'
import { cn } from '@/lib/utils'
import { useDownloadInvoicePdf } from '@/app/hooks/useInvoice'
import { BillingDataDialog } from './BillingDataDialog'
import type { FolioDebitor } from '@/types/apaleo'

interface InvoiceButtonProps {
  reservationId: string
  className?: string
}

interface FolioDataResponse {
  folio: { debitor?: FolioDebitor }
  state: { invoiceId: string; languageCode: string; lockedAt: string } | null
}

export const InvoiceButton = ({ reservationId, className }: InvoiceButtonProps) => {
  const t = useTranslations('profile')
  const folioId = `${reservationId}-1`

  const [dialogOpen, setDialogOpen] = useState(false)
  const [openSeq, setOpenSeq] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [debitor, setDebitor] = useState<FolioDebitor | null>(null)

  const downloadPdf = useDownloadInvoicePdf()

  const handleButtonClick = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoice/folio?folioId=${encodeURIComponent(folioId)}`)
      if (!response.ok) throw new Error('Failed to fetch folio data')
      const data = (await response.json()) as FolioDataResponse

      if (data.state?.lockedAt) {
        await downloadPdf.mutateAsync({
          invoiceId: data.state.invoiceId,
          filename: `invoice-${folioId}.pdf`,
        })
      } else {
        setDebitor(data.folio.debitor ?? null)
        setOpenSeq((s) => s + 1)
        setDialogOpen(true)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      toast.error(message === 'invoiceNotReady' ? t('invoiceNotReady') : t('invoiceDownloadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        variant='outline'
        className={cn('text-sm flex items-center gap-2 px-3', className)}
        disabled={isLoading || downloadPdf.isPending}
        onClick={handleButtonClick}
      >
        <MdDownload className='size-5' />
        {isLoading || downloadPdf.isPending ? t('downloading') : t('viewInvoice')}
      </Button>

      <BillingDataDialog
        key={openSeq}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        folioId={folioId}
        debitor={debitor}
      />
    </>
  )
}
