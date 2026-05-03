'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/_components/ui/dialog'
import { Button } from '@/app/_components/ui/button'
import { CountrySelect } from '@/app/_components/ui/CountrySelect'
import { FiEdit2 } from 'react-icons/fi'
import { useUpdateDebitor, useCreateInvoice, useDownloadInvoicePdf } from '@/app/hooks/useInvoice'
import type { FolioDebitor } from '@/types/apaleo'

interface BillingDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folioId: string
  debitor: FolioDebitor | null
}

interface BillingForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName: string
  companyTaxId: string
  addressLine1: string
  addressLine2: string
  postalCode: string
  city: string
  countryCode: string
}

function toForm(debitor: FolioDebitor | null): BillingForm {
  return {
    firstName: debitor?.firstName ?? '',
    lastName: debitor?.name ?? '',
    email: debitor?.email ?? '',
    phone: debitor?.phone ?? '',
    companyName: debitor?.company?.name ?? '',
    companyTaxId: debitor?.company?.taxId ?? '',
    addressLine1: debitor?.address?.addressLine1 ?? '',
    addressLine2: debitor?.address?.addressLine2 ?? '',
    postalCode: debitor?.address?.postalCode ?? '',
    city: debitor?.address?.city ?? '',
    countryCode: debitor?.address?.countryCode ?? '',
  }
}

function toDebitor(form: BillingForm): FolioDebitor {
  return {
    firstName: form.firstName || undefined,
    name: form.lastName || undefined,
    email: form.email || undefined,
    phone: form.phone || undefined,
    ...(form.companyName ? { company: { name: form.companyName, taxId: form.companyTaxId || undefined } } : {}),
    address: {
      addressLine1: form.addressLine1 || undefined,
      addressLine2: form.addressLine2 || undefined,
      postalCode: form.postalCode || undefined,
      city: form.city || undefined,
      countryCode: form.countryCode || undefined,
    },
  }
}

const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green'
const labelClass = 'absolute left-3 -top-2.5 px-1 bg-white text-xs text-gray-600'

export function BillingDataDialog({
  open,
  onOpenChange,
  folioId,
  debitor,
}: BillingDataDialogProps) {
  const t = useTranslations('profile')
  const [form, setForm] = useState<BillingForm>(() => toForm(debitor))
  const [savedForm, setSavedForm] = useState<BillingForm>(() => toForm(debitor))
  const [isEditing, setIsEditing] = useState(false)
  const [language, setLanguage] = useState<'en' | 'de'>('en')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const updateDebitor = useUpdateDebitor()
  const createInvoice = useCreateInvoice()
  const downloadPdf = useDownloadInvoicePdf()

  const isGenerating = createInvoice.isPending || downloadPdf.isPending

  useEffect(() => {
    if (open) {
      const initial = toForm(debitor)
      setForm(initial)
      setSavedForm(initial)
      setIsEditing(false)
      setLanguage('en')
      setErrorMessage(null)
    }
  }, [open, debitor])

  const set = (field: keyof BillingForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    setErrorMessage(null)
    try {
      await updateDebitor.mutateAsync({ folioId, debitor: toDebitor(form) })
      setSavedForm(form)
      setIsEditing(false)
    } catch {
      setErrorMessage(t('saveBillingDataFailed'))
    }
  }

  const handleCancel = () => {
    setForm(savedForm)
    setIsEditing(false)
  }

  const handleGenerate = async () => {
    setErrorMessage(null)
    try {
      const { invoiceId } = await createInvoice.mutateAsync({
        folioId,
        languageCode: language,
        debitor: toDebitor(savedForm),
      })
      await downloadPdf.mutateAsync({ invoiceId, filename: `invoice-${folioId}.pdf` })
      toast.success(t('invoiceGenerated'))
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('folioBalanceError') || message.includes('outstanding balance')) {
        setErrorMessage(t('folioBalanceError'))
      } else if (message.includes('emptyFolioError') || message.includes('empty folio')) {
        setErrorMessage(t('emptyFolioError'))
      } else if (message.includes('invoiceNotReady')) {
        setErrorMessage(t('invoiceNotReady'))
      } else {
        setErrorMessage(t('invoiceGenerationFailed'))
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[90%] max-w-[450px] px-4 rounded-3xl max-h-[90vh] overflow-y-auto gap-0 bg-white'>
        <DialogHeader className='mb-5'>
          <DialogTitle>{t('billingData')}</DialogTitle>
          <DialogDescription>{t('billingDataDescription')}</DialogDescription>
        </DialogHeader>

        {!isEditing ? (
          /* View mode */
          <div className='flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-semibold text-gray-700'>{t('billingData')}</span>
              <button
                onClick={() => setIsEditing(true)}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
                aria-label={t('editAddress')}
              >
                <FiEdit2 className='size-4 text-gray-600' />
              </button>
            </div>

            <div className='border border-gray-200 rounded-lg p-4 bg-gray-50/50 flex flex-col gap-1 text-sm'>
              {(savedForm.firstName || savedForm.lastName) && (
                <span className='font-medium'>{savedForm.firstName} {savedForm.lastName}</span>
              )}
              {savedForm.email && <span>{savedForm.email}</span>}
              {savedForm.phone && <span>{savedForm.phone}</span>}
              {savedForm.companyName && (
                <span>{savedForm.companyName}{savedForm.companyTaxId ? ` (${savedForm.companyTaxId})` : ''}</span>
              )}
              {savedForm.addressLine1 && <span>{savedForm.addressLine1} {savedForm.addressLine2}</span>}
              {(savedForm.postalCode || savedForm.city) && (
                <span>{savedForm.postalCode} {savedForm.city}</span>
              )}
              {savedForm.countryCode && <span>{savedForm.countryCode}</span>}
            </div>

            <div className='flex flex-col gap-2'>
              <span className='text-sm text-gray-600'>{t('invoiceLanguage')}</span>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
                    language === 'en'
                      ? 'bg-green text-white border-green'
                      : 'border-gray-300 hover:border-green'
                  }`}
                >
                  EN English
                </button>
                <button
                  type='button'
                  onClick={() => setLanguage('de')}
                  className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
                    language === 'de'
                      ? 'bg-green text-white border-green'
                      : 'border-gray-300 hover:border-green'
                  }`}
                >
                  DE Deutsch
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                {errorMessage}
              </div>
            )}

            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
              {t('invoiceFinalActionWarning')}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className='w-full mt-2'
            >
              {isGenerating ? t('generatingInvoice') : t('generateInvoice')}
            </Button>
          </div>
        ) : (
          /* Edit mode */
          <div className='flex flex-col gap-4'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='relative'>
                <label className={labelClass}>{t('firstName')}</label>
                <input type='text' value={form.firstName} onChange={set('firstName')} className={inputClass} />
              </div>
              <div className='relative'>
                <label className={labelClass}>{t('lastName')} *</label>
                <input type='text' value={form.lastName} onChange={set('lastName')} className={inputClass} />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='relative'>
                <label className={labelClass}>{t('email')}</label>
                <input type='email' value={form.email} onChange={set('email')} className={inputClass} />
              </div>
              <div className='relative'>
                <label className={labelClass}>{t('phone')}</label>
                <input type='tel' value={form.phone} onChange={set('phone')} className={inputClass} />
              </div>
            </div>

            <div className='relative'>
              <label className={labelClass}>{t('companyName')}</label>
              <input type='text' value={form.companyName} onChange={set('companyName')} className={inputClass} />
            </div>

            {form.companyName && (
              <div className='relative'>
                <label className={labelClass}>{t('taxId')}</label>
                <input type='text' value={form.companyTaxId} onChange={set('companyTaxId')} className={inputClass} />
              </div>
            )}

            <div className='relative'>
              <label className={labelClass}>{t('streetAddress')}</label>
              <input type='text' value={form.addressLine1} onChange={set('addressLine1')} className={inputClass} />
            </div>
            <div className='relative'>
              <label className={labelClass}>{t('houseNumber')}</label>
              <input type='text' value={form.addressLine2} onChange={set('addressLine2')} className={inputClass} />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='relative'>
                <label className={labelClass}>{t('postalCode')} *</label>
                <input type='text' value={form.postalCode} onChange={set('postalCode')} className={inputClass} />
              </div>
              <div className='relative'>
                <label className={labelClass}>{t('city')} *</label>
                <input type='text' value={form.city} onChange={set('city')} className={inputClass} />
              </div>
            </div>
            <div className='relative'>
              <label className='absolute left-3 -top-2.5 px-1 bg-white text-xs text-gray-600 z-10'>
                {t('country')} *
              </label>
              <CountrySelect
                value={form.countryCode}
                onValueChange={(value) => setForm((prev) => ({ ...prev, countryCode: value }))}
              />
            </div>

            {errorMessage && (
              <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                {errorMessage}
              </div>
            )}

            <div className='flex gap-2 mt-2'>
              <button
                onClick={handleCancel}
                disabled={updateDebitor.isPending}
                className='flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={updateDebitor.isPending}
                className='flex-1 px-4 py-2 text-sm bg-green text-white rounded-md hover:bg-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {updateDebitor.isPending ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
