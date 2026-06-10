'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { getCountryCallingCode, type Country } from 'react-phone-number-input/max'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/_components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/_components/ui/popover'
import { cn } from '@/lib/utils'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import deLocale from 'i18n-iso-countries/langs/de.json'

countries.registerLocale(enLocale)
countries.registerLocale(deLocale)

const getFlagEmoji = (countryCode: string) =>
  countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))

interface CountryOption {
  value?: Country
  label: string
}

interface PhoneCountrySelectProps {
  value?: Country
  onChange: (value?: Country) => void
  options: CountryOption[]
  disabled?: boolean
  readOnly?: boolean
  locale?: 'en' | 'de'
  searchPlaceholder?: string
  emptyText?: string
  error?: boolean
  // When provided, the displayed flag tracks this country (derived from the
  // typed calling code) instead of the widget's internal selection.
  displayCountry?: Country
  hasDisplayCountry?: boolean
}

export function PhoneCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  locale = 'en',
  searchPlaceholder,
  emptyText,
  error,
  displayCountry,
  hasDisplayCountry,
}: PhoneCountrySelectProps) {
  const [open, setOpen] = React.useState(false)
  const listId = React.useId()

  const shownCountry = hasDisplayCountry ? displayCountry : value

  const items = React.useMemo(() => {
    return options
      .filter((option): option is { value: Country; label: string } =>
        Boolean(option.value)
      )
      .map((option) => ({
        code: option.value,
        name: countries.getName(option.value, locale) || option.label,
        callingCode: getCountryCallingCode(option.value),
        flag: getFlagEmoji(option.value),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [options, locale])

  const selected = items.find((item) => item.code === shownCountry)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled || readOnly) return
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type='button'
          role='combobox'
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled || readOnly}
          className={cn(
            'mr-2 flex h-full shrink-0 cursor-pointer items-center gap-1 self-stretch border-r border-gray pr-2 text-dark outline-none disabled:cursor-not-allowed disabled:opacity-60',
            error && 'text-red'
          )}
        >
          <span className='flex w-5 shrink-0 items-center justify-center'>
            {selected ? (
              <span className='text-base leading-none'>{selected.flag}</span>
            ) : (
              <span className='text-sm leading-none'>--</span>
            )}
          </span>
          <ChevronsUpDown className='h-3.5 w-3.5 shrink-0 opacity-50' />
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-[280px] p-0' align='start'>
        <Command
          filter={(commandValue, search) =>
            commandValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} className='h-9' />
          <CommandList id={listId}>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.code}
                  value={`${item.name} +${item.callingCode} ${item.code}`}
                  onSelect={() => {
                    onChange(item.code)
                    setOpen(false)
                  }}
                  className='text-sm'
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      shownCountry === item.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className='mr-2 text-base leading-none'>{item.flag}</span>
                  <span className='flex-1 truncate'>{item.name}</span>
                  <span className='ml-2 shrink-0 text-dark/60'>
                    +{item.callingCode}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
