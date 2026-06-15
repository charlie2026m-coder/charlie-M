'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { DateRange } from 'react-day-picker'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import {
  FiUser,
  FiMail,
  FiBriefcase,
  FiUsers,
  FiHome,
  FiMessageSquare,
  FiSend,
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

import { Button } from '@/app/_components/ui/button'
import { Input } from '@/app/_components/ui/input'
import { Textarea } from '@/app/_components/ui/textarea'
import { DateInput } from '@/app/_components/ui/DateInput'
import { Calendar } from '@/app/_components/ui/calendar'
import PhoneInput from '@/app/_components/ui/PhoneInput'
import { cn, getMinArrivalDate } from '@/lib/utils'
import { EMAIL, PHONE_NUMBER } from '@/lib/Constants'

type Mode = 'group' | 'corporate'

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const GroupBookingForm = ({ locale }: { locale: string }) => {
  const t = useTranslations('groupBookings')

  const [mode, setMode] = useState<Mode>('group')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [guests, setGuests] = useState('')
  const [rooms, setRooms] = useState('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [message, setMessage] = useState('')
  const [openCal, setOpenCal] = useState(false)
  const [errors, setErrors] = useState<{ name?: boolean; email?: boolean; guests?: boolean }>({})

  const minDate = getMinArrivalDate()

  // Localized date for the email/summary, e.g. "20 Jul 2026".
  const fmtDate = (d?: Date) =>
    d ? new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d) : ''

  const periodText = dateRange?.from
    ? `${fmtDate(dateRange.from)}${dateRange.to ? ` – ${fmtDate(dateRange.to)}` : ''}`
    : ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = {
      name: name.trim().length === 0,
      email: !isValidEmail(email.trim()),
      guests: guests.trim().length === 0 || Number(guests) <= 0,
    }
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.email || nextErrors.guests) return

    const subject = mode === 'corporate' ? t('emailSubjectCorporate') : t('emailSubjectGroup')
    const lines = [
      `${t('emailLabelType')}: ${mode === 'corporate' ? t('emailTypeCorporate') : t('emailTypeGroup')}`,
      `${t('name')}: ${name.trim()}`,
      `${t('email')}: ${email.trim()}`,
      phone ? `${t('phone')}: ${phone}` : null,
      mode === 'corporate' && company.trim() ? `${t('company')}: ${company.trim()}` : null,
      `${t('guests')}: ${guests.trim()}`,
      rooms.trim() ? `${t('rooms')}: ${rooms.trim()}` : null,
      periodText ? `${t('period')}: ${periodText}` : null,
      message.trim() ? `\n${t('message')}:\n${message.trim()}` : null,
    ].filter(Boolean)

    const href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
    toast.success(t('successToast'))
    window.location.href = href
  }

  const whatsappHref = `https://wa.me/${PHONE_NUMBER.replace(/[\s+]/g, '')}?text=${encodeURIComponent(t('whatsappPrefill'))}`

  const tabs: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: 'group', label: t('tabGroup'), icon: <FiUsers className="size-5" /> },
    { key: 'corporate', label: t('tabCorporate'), icon: <FiBriefcase className="size-5" /> },
  ]

  const fieldIcon = 'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-5 text-blue'
  const inputBase = 'h-12 rounded-full border-gray bg-white pl-12 pr-4 shadow-none text-base'

  return (
    <section className="bg-light-bg">
      <div className="container px-4 md:px-10 xl:px-[100px] py-[50px] md:py-[70px]">
        {/* Hero header */}
        <div className="flex items-center gap-4 md:gap-5 mb-4">
          <div className="size-12 md:size-[76px] bg-blue rounded-full flex items-center justify-center text-mute shrink-0">
            <FiUsers className="size-6 md:size-10" />
          </div>
          <h1 className="text-2xl text-mute md:text-5xl font-bold jakarta">{t('title')}</h1>
        </div>
        <p className="text-dark text-base md:text-lg max-w-3xl mb-8 md:mb-10">{t('subtitle')}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Form card */}
          <div className="lg:col-span-2 bg-white rounded-[30px] shadow-lg p-5 md:p-8">
            {/* Segmented toggle */}
            <div className="inline-flex w-full sm:w-auto rounded-full bg-light-bg border border-gray p-1 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMode(tab.key)}
                  aria-pressed={mode === tab.key}
                  className={cn(
                    'flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-full px-4 md:px-6 py-2.5 text-sm md:text-base font-medium transition-all cursor-pointer',
                    mode === tab.key
                      ? 'bg-blue text-mute shadow-sm'
                      : 'text-mute/60 hover:text-mute',
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <p className="text-dark text-sm md:text-base mb-6">
              {mode === 'corporate' ? t('introCorporate') : t('introGroup')}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <FiUser className={fieldIcon} />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`${t('name')} *`}
                      aria-invalid={errors.name}
                      className={cn(inputBase, errors.name && '!border-red text-red')}
                    />
                  </div>
                  {errors.name && <span className="text-red text-xs pl-4">{t('errorName')}</span>}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <FiMail className={fieldIcon} />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={`${t('email')} *`}
                      aria-invalid={errors.email}
                      className={cn(inputBase, errors.email && '!border-red text-red')}
                    />
                  </div>
                  {errors.email && <span className="text-red text-xs pl-4">{t('errorEmail')}</span>}
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1">
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    placeholder={t('phone')}
                  />
                </div>

                {/* Company — corporate only */}
                {mode === 'corporate' && (
                  <div className="flex flex-col gap-1">
                    <div className="relative">
                      <FiBriefcase className={fieldIcon} />
                      <Input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder={t('companyPlaceholder')}
                        className={inputBase}
                      />
                    </div>
                  </div>
                )}

                {/* Guests */}
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <FiUsers className={fieldIcon} />
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      placeholder={`${t('guests')} *`}
                      aria-invalid={errors.guests}
                      className={cn(inputBase, errors.guests && '!border-red text-red')}
                    />
                  </div>
                  {errors.guests && <span className="text-red text-xs pl-4">{t('errorGuests')}</span>}
                </div>

                {/* Rooms (optional) */}
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <FiHome className={fieldIcon} />
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={rooms}
                      onChange={(e) => setRooms(e.target.value)}
                      placeholder={t('rooms')}
                      className={inputBase}
                    />
                  </div>
                </div>

                {/* Period — full width */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <DateInput
                    value={dateRange}
                    open={openCal}
                    onOpenChange={setOpenCal}
                    side="bottom"
                    inputStyle={cn(inputBase, 'pl-12')}
                  >
                    <Calendar
                      mode="range"
                      numberOfMonths={1}
                      captionLayout="label"
                      selected={dateRange}
                      defaultMonth={dateRange?.from ?? minDate}
                      onSelect={(range) => {
                        setDateRange(range)
                        if (range?.from && range?.to) setOpenCal(false)
                      }}
                      disabled={{ before: minDate }}
                    />
                  </DateInput>
                </div>

                {/* Message — full width */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <div className="relative">
                    <FiMessageSquare className="pointer-events-none absolute left-4 top-4 size-5 text-blue" />
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('messagePlaceholder')}
                      className="pl-12"
                      rows={5}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 mt-2">
                <span className="text-mute/50 text-xs">{t('requiredHint')}</span>
                <Button type="submit" className="gap-2">
                  <FiSend className="size-5" />
                  {t('submit')}
                </Button>
              </div>
            </form>
          </div>

          {/* WhatsApp card */}
          <aside className="lg:col-span-1 bg-white rounded-[30px] shadow-lg p-6 md:p-7 flex flex-col items-center text-center lg:sticky lg:top-28">
            <div className="size-16 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-4">
              <FaWhatsapp className="size-9 text-[#25D366]" />
            </div>
            <h2 className="text-xl font-semibold jakarta text-mute mb-2">{t('whatsappTitle')}</h2>
            <p className="text-dark text-sm mb-5">{t('whatsappText')}</p>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button
                type="button"
                className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#1da851] hover:text-white"
              >
                <FaWhatsapp className="size-5" />
                {t('whatsappButton')}
              </Button>
            </a>
            <a
              href={`mailto:${EMAIL}`}
              className="mt-4 text-sm text-dark hover:text-blue transition-colors break-all"
            >
              {EMAIL}
            </a>
          </aside>
        </div>
      </div>
    </section>
  )
}

export default GroupBookingForm
