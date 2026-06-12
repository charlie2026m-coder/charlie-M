'use client'
import { useState } from 'react'
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
import PhoneInput from '@/app/_components/ui/PhoneInput'
import { isValidPhoneNumber, toE164 } from '@/lib/phone'
import { useUpdateDebitor, useCreateInvoice, useDownloadInvoicePdf, InvoiceCreateError } from '@/app/hooks/useInvoice'
import { EMAIL } from '@/lib/Constants'
import type { FolioDebitor, InvoiceWarningType } from '@/types/apaleo'

const warningKeyMap: Record<InvoiceWarningType | 'Unknown', string> = {
  DebitorDetailsMissing: 'invoiceErrDebitorMissing',
  NotAllChargesPosted: 'invoiceErrChargesNotPosted',
  InvoiceAlreadyExists: 'invoiceErrAlreadyExists',
  InvoiceHasPendingPayments: 'invoiceErrPendingPayments',
  IsEmptyFolio: 'emptyFolioError',
  FolioState: 'invoiceErrFolioState',
  CashPaymentLimitExceeded: 'invoiceErrCashLimit',
  NoCompanyFound: 'invoiceGenerationFailed',
  CompanyCannotCheckOutOnAr: 'invoiceGenerationFailed',
  IsHouseFolio: 'invoiceGenerationFailed',
  CannotCreateCompanyInvoiceForExternal: 'invoiceGenerationFailed',
  CheckOutOnArIsNotAllowed: 'invoiceGenerationFailed',
  Unknown: 'invoiceGenerationFailed',
}

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
    phone: toE164(debitor?.phone),
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
  const [language, setLanguage] = useState<'en' | 'de'>('en')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const updateDebitor = useUpdateDebitor()
  const createInvoice = useCreateInvoice()
  const downloadPdf = useDownloadInvoicePdf()

  const isBusy = updateDebitor.isPending || createInvoice.isPending || downloadPdf.isPending
  const phoneInvalid = !!form.phone && !isValidPhoneNumber(form.phone)
  const requiredMissing =
    !form.lastName.trim() ||
    !form.city.trim() ||
    !form.postalCode.trim() ||
    !form.countryCode.trim()

  // No useEffect reset: the parent passes a fresh `key` prop on every open,
  // remounting this component so the useState initializers above always pick
  // up the current `debitor` and start with a clean error/language state.

  const set = (field: keyof BillingForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleGenerate = async () => {
    if (requiredMissing || phoneInvalid) return
    setErrorMessage(null)
    const debitorPayload = toDebitor(form)
    try {
      await updateDebitor.mutateAsync({ folioId, debitor: debitorPayload })
    } catch {
      setErrorMessage(t('saveBillingDataFailed'))
      return
    }
    try {
      const { invoiceId } = await createInvoice.mutateAsync({
        folioId,
        languageCode: language,
        debitor: debitorPayload,
      })
      await downloadPdf.mutateAsync({ invoiceId, filename: `invoice-${folioId}.pdf` })
      toast.success(t('invoiceGenerated'))
      onOpenChange(false)
    } catch (error) {
      if (error instanceof InvoiceCreateError && error.warning) {
        const key = warningKeyMap[error.warning] ?? 'invoiceGenerationFailed'
        setErrorMessage(t(key as 'invoiceGenerationFailed'))
        return
      }
      const message = error instanceof Error ? error.message : ''
      if (message === 'invoiceNotReady') {
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
              <PhoneInput
                value={form.phone}
                onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                error={phoneInvalid}
              />
              {phoneInvalid && (
                <span className='absolute -bottom-4 left-1 text-red text-xs'>{t('invalidPhone')}</span>
              )}
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
                🇬🇧 English
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
                🇩🇪 Deutsch
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
              {errorMessage}
            </div>
          )}

          {requiredMissing ? (
            <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
              <p className='font-medium mb-1'>{t('invoiceRequiredFieldsTitle')}</p>
              <ul className='list-disc list-inside space-y-0.5'>
                {!form.lastName.trim() && <li>{t('lastName')}</li>}
                {!form.postalCode.trim() && <li>{t('postalCode')}</li>}
                {!form.city.trim() && <li>{t('city')}</li>}
                {!form.countryCode.trim() && <li>{t('country')}</li>}
              </ul>
            </div>
          ) : (
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
              {t('invoiceFinalActionWarning')}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isBusy || requiredMissing || phoneInvalid}
            className='w-full mt-2'
          >
            {isBusy ? t('generatingInvoice') : t('generateInvoice')}
          </Button>

          <p className='text-xs text-gray-500 text-center'>
            {t('invoiceContactNote')}{' '}
            <a href={`mailto:${EMAIL}`} className='underline text-gray-600'>{EMAIL}</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
