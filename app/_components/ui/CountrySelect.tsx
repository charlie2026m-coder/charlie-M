'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { RiGlobeFill } from 'react-icons/ri'
import { Button } from '@/app/_components/ui/button'
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

// Register locales
countries.registerLocale(enLocale)
countries.registerLocale(deLocale)

// Function to get flag emoji from country code
const getFlagEmoji = (countryCode: string) => {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

interface CountrySelectProps {
  value: string
  onValueChange: (value: string) => void
  locale?: 'en' | 'de'
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  error?: boolean
}

export function CountrySelect({
  value,
  onValueChange,
  locale = 'en',
  placeholder = 'Select country...',
  searchPlaceholder = 'Search country...',
  emptyText = 'No country found.',
  disabled = false,
  error = false,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)

  // Get country list based on locale
  const countryList = React.useMemo(() => {
    const countryNames = countries.getNames(locale, { select: 'official' })
    return Object.entries(countryNames)
      .map(([code, name]) => ({
        code,
        name,
        flag: getFlagEmoji(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [locale])

  const selectedCountry = countryList.find((country) => country.code === value)

  return (
    <div className="relative">
      <RiGlobeFill className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-blue z-10 pointer-events-none" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between h-10 text-left font-normal bg-white rounded-full shadow-none text-dark border-gray pl-[45px]',
              'hover:bg-white hover:text-dark focus:bg-white active:bg-white',
              !value && 'text-muted-foreground',
              error && '!border-red text-red focus:border-red'
            )}
          >
            {selectedCountry ? (
              <span className="flex items-center gap-2">
                <span className="text-base">{selectedCountry.flag}</span>
                <span className="text-sm">{selectedCountry.name}</span>
              </span>
            ) : (
              <span className="text-sm">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} className="h-9" />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {countryList.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.code}`}
                    onSelect={() => {
                      onValueChange(country.code)
                      setOpen(false)
                    }}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === country.code ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="text-base mr-2">{country.flag}</span>
                    <span>{country.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</div>
  )
}
