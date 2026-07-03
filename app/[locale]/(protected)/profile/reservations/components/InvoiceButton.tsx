'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  hasInvoice: boolean
  // The current valid invoice (latest non-voided document), or null when the
  // folio's invoice was fully cancelled with no re-issue.
  activeInvoiceId: string | null
  cancelled: boolean
  state: { invoiceId: string; languageCode: string; lockedAt: string } | null
}

export const InvoiceButton = ({ reservationId, className }: InvoiceButtonProps) => {
  const t = useTranslations('profile')
  const folioId = `${reservationId}-1`

  const [dialogOpen, setDialogOpen] = useState(false)
  const [openSeq, setOpenSeq] = useState(0)
  const [debitor, setDebitor] = useState<FolioDebitor | null>(null)

  const downloadPdf = useDownloadInvoicePdf()

  const { data, isLoading, refetch } = useQuery<FolioDataResponse>({
    queryKey: ['invoice-folio', folioId],
    queryFn: async () => {
      const res = await fetch(`/api/invoice/folio?folioId=${encodeURIComponent(folioId)}`)
      if (!res.ok) throw new Error('Failed to fetch folio data')
      return res.json()
    },
    staleTime: 60_000,
  })

  const activeInvoiceId = data?.activeInvoiceId ?? null
  // The old invoice was voided (a Cancellation exists) and there is no valid
  // re-issue → the button must NOT hand out the cancelled document.
  const cancelledNoActive = !!data?.cancelled && !activeInvoiceId

  const handleClick = async () => {
    try {
      if (activeInvoiceId) {
        // Always serve the CURRENT valid invoice (the correction after a
        // cancellation), never the stale invoice_states id.
        await downloadPdf.mutateAsync({ invoiceId: activeInvoiceId, filename: `invoice-${folioId}.pdf` })
        return
      }
      // No invoice yet → collect billing data and create it.
      setDebitor(data?.folio?.debitor ?? null)
      setOpenSeq((s) => s + 1)
      setDialogOpen(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      toast.error(message === 'invoiceNotReady' ? t('invoiceNotReady') : t('invoiceDownloadFailed'))
    }
  }

  // Old invoice cancelled and not re-issued → a disabled, clearly-labelled
  // button, so the guest never downloads two invoices for one stay.
  if (cancelledNoActive) {
    return (
      <Button
        variant='outline'
        disabled
        className={cn('text-sm flex items-center gap-2 px-3 opacity-60', className)}
      >
        <MdDownload className='size-5' />
        {t('invoiceCancelled')}
      </Button>
    )
  }

  const busy = isLoading || downloadPdf.isPending

  return (
    <>
      <Button
        variant='outline'
        className={cn('text-sm flex items-center gap-2 px-3', className)}
        disabled={busy}
        onClick={handleClick}
      >
        <MdDownload className='size-5' />
        {busy ? t('downloading') : t('viewInvoice')}
      </Button>

      <BillingDataDialog
        key={openSeq}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          // Refresh after the create dialog closes so the button reflects the
          // freshly issued invoice.
          if (!open) refetch()
        }}
        folioId={folioId}
        debitor={debitor}
      />
    </>
  )
}
