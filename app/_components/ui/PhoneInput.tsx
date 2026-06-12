'use client'

import { useEffect, useRef, useState } from 'react'
import PhoneNumberInput, { type Country } from 'react-phone-number-input/max'
import { getCountryCallingCode } from 'libphonenumber-js/max'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  DEFAULT_PHONE_COUNTRY,
  getMaxNationalDigits,
  resolveDisplayCountry,
} from '@/lib/phone'
import { PhoneCountrySelect } from '@/app/_components/ui/PhoneCountrySelect'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  title?: string
  error?: boolean
  disabled?: boolean
  className?: string
}

const phoneInputClasses = [
  // wrapper row
  'flex h-10 items-center rounded-full border border-gray bg-white px-3 text-dark',
  // phone number field
  '[&_.PhoneInputInput]:h-full [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:border-none [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:text-dark [&_.PhoneInputInput]:outline-none',
  '[&_.PhoneInputInput::placeholder]:text-muted-foreground',
]

function PhoneInput({
  value,
  onChange,
  placeholder,
  title,
  error,
  disabled,
  className,
}: PhoneInputProps) {
  const locale = useLocale() as 'en' | 'de'
  const t = useTranslations('phoneInput')
  const [country, setCountry] = useState<Country>(DEFAULT_PHONE_COUNTRY)
  // The exact text currently in the field. The displayed flag is derived from
  // this, so it tracks the calling code precisely (and clears when the code is
  // empty or incomplete). Defaults to the German code so the prefilled "+49"
  // shows its flag from the first render (no flicker).
  const [rawInput, setRawInput] = useState(
    () => value || `+${getCountryCallingCode(DEFAULT_PHONE_COUNTRY)}`
  )

  const inputRef = useRef<HTMLInputElement | null>(null)
  const countryRef = useRef<Country>(country)

  useEffect(() => {
    countryRef.current = country
  }, [country])

  // `input` fires for every edit, including code edits that don't change the
  // E.164 `value` (e.g. "+380" -> "+38"), which `value`-driven renders miss.
  // Reading on the next frame captures the formatter's final value (e.g. a bare
  // "1" becomes "+1") without interfering with the in-progress keystroke.
  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    let frame = 0
    const handleInput = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setRawInput(input.value))
    }
    input.addEventListener('input', handleInput)
    setRawInput(input.value || value || '')
    return () => {
      input.removeEventListener('input', handleInput)
      cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resync when `value` changes externally (form reset, dropdown pick, etc.).
  useEffect(() => {
    setRawInput(inputRef.current?.value ?? value ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const displayCountry = resolveDisplayCountry(rawInput, country)

  // Hard-cap the national number length to what the selected country allows.
  // Done via a native `beforeinput` listener so the extra character is blocked
  // before the phone-input's internal (uncontrolled) state can register it.
  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const handleBeforeInput = (event: Event) => {
      const inputEvent = event as InputEvent
      const inserted = inputEvent.data
      // Deletions / navigation have no inserted data — always allow them.
      if (inserted == null) return

      const currentCountry = countryRef.current
      const max = getMaxNationalDigits(currentCountry)
      if (!max) return

      let callingCode: string
      try {
        callingCode = getCountryCallingCode(currentCountry)
      } catch {
        return
      }

      const fieldValue = input.value
      const selectionStart = input.selectionStart ?? fieldValue.length
      const selectionEnd = input.selectionEnd ?? fieldValue.length

      const countDigits = (text: string) => (text.match(/\d/g) ?? []).length
      const currentDigits = countDigits(fieldValue)
      const replacedDigits = countDigits(
        fieldValue.slice(selectionStart, selectionEnd)
      )
      const insertedDigits = countDigits(inserted)

      const resultingNational =
        currentDigits - replacedDigits + insertedDigits - callingCode.length

      if (resultingNational > max) {
        event.preventDefault()
      }
    }

    input.addEventListener('beforeinput', handleBeforeInput)
    return () => input.removeEventListener('beforeinput', handleBeforeInput)
  }, [])

  return (
    <div className={cn('relative text-dark', className)}>
      {title && (
        <div
          className={cn(
            'absolute left-4 -top-3 px-1 bg-white h-4 rounded z-10',
            error && '!text-red'
          )}
        >
          {title}
        </div>
      )}
      <PhoneNumberInput
        ref={(node) => {
          // The library forwards this ref to the underlying <input/> at runtime,
          // even though its types describe the component instance.
          inputRef.current = node as unknown as HTMLInputElement | null
        }}
        // `defaultCountry` prefills the German code (+49) when the field has no
        // number yet. We deliberately do NOT set `addInternationalOption={false}`
        // (which would force a country): the calling code stays fully editable
        // and the displayed flag is driven by `displayCountry` (see
        // `resolveDisplayCountry`), so erasing/changing the code still works.
        international
        limitMaxLength
        defaultCountry={DEFAULT_PHONE_COUNTRY}
        value={value || undefined}
        onChange={(val) => onChange(val ?? '')}
        onCountryChange={(next) => setCountry(next ?? DEFAULT_PHONE_COUNTRY)}
        placeholder={placeholder}
        disabled={disabled}
        countrySelectComponent={PhoneCountrySelect}
        countrySelectProps={{
          locale,
          searchPlaceholder: t('searchPlaceholder'),
          emptyText: t('empty'),
          error,
          displayCountry,
          hasDisplayCountry: true,
        }}
        className={cn(
          phoneInputClasses,
          error && '!border-red text-red [&_.PhoneInputInput]:text-red'
        )}
      />
    </div>
  )
}

export default PhoneInput
