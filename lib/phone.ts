import {
  isValidPhoneNumber,
  parsePhoneNumber,
  type Country,
} from 'react-phone-number-input/max'
import {
  AsYouType,
  Metadata,
  getCountryCallingCode,
  getExampleNumber,
} from 'libphonenumber-js/max'
import examplesMobile from 'libphonenumber-js/examples.mobile.json'

export { isValidPhoneNumber }

export const DEFAULT_PHONE_COUNTRY: Country = 'DE'

// `getCountryCodeForCallingCode` exists at runtime but isn't in the public
// type definitions, so we access it through a narrow cast.
const callingCodeMetadata = new Metadata() as unknown as {
  getCountryCodeForCallingCode(callingCode: string): string | undefined
}

function safeCallingCode(country: Country): string | undefined {
  try {
    return getCountryCallingCode(country)
  } catch {
    return undefined
  }
}

/**
 * Resolves which country flag to show based on what is currently typed in the
 * input. The flag strictly tracks the calling code:
 *  - empty input (or just a "+") -> `undefined` (no flag)
 *  - a complete calling code that maps to a country -> that country
 *  - a partial or unknown calling code (e.g. "+4", "+38") -> `undefined` (no flag)
 *
 * `selectedCountry` is the country currently chosen in the widget; it's kept
 * only while it still matches the typed calling code so codes shared by several
 * countries (e.g. +1) don't snap back to the main country after a manual pick.
 */
export function resolveDisplayCountry(
  input: string | undefined,
  selectedCountry?: Country
): Country | undefined {
  const digits = (input ?? '').replace(/\D/g, '')
  // Nothing meaningful entered yet -> no flag.
  if (!digits) return undefined

  const formatter = new AsYouType()
  formatter.input(input ?? '')
  const callingCode = formatter.getCallingCode()
  // Digits typed but not (yet) a complete/valid calling code -> no country.
  if (!callingCode) return undefined

  // Prefer the country derived from the number itself (unique codes resolve
  // immediately, e.g. "+49" -> DE, "+44" -> GB).
  const derived = formatter.getCountry()
  if (derived && safeCallingCode(derived) === callingCode) {
    return derived
  }

  // Keep an explicitly selected country if it still matches the typed code.
  if (selectedCountry && safeCallingCode(selectedCountry) === callingCode) {
    return selectedCountry
  }

  // Otherwise fall back to the main country for this calling code.
  const main = callingCodeMetadata.getCountryCodeForCallingCode(callingCode)
  return (main as Country | undefined) ?? undefined
}

const maxNationalDigitsCache = new Map<Country, number | null>()

/**
 * Maximum number of national (significant) digits expected for a country,
 * derived dynamically from libphonenumber's example mobile number. Returns
 * `null` when the length is unknown (caller should then apply no limit).
 */
export function getMaxNationalDigits(country?: Country): number | null {
  if (!country) return null
  const cached = maxNationalDigitsCache.get(country)
  if (cached !== undefined) return cached

  let result: number | null = null
  try {
    const example = getExampleNumber(country, examplesMobile)
    if (example?.nationalNumber) {
      result = example.nationalNumber.length
    }
  } catch {
    result = null
  }

  maxNationalDigitsCache.set(country, result)
  return result
}

/**
 * Normalizes a phone number to E.164 (e.g. "0176..." -> "+4917...").
 * Values already in E.164 pass through unchanged. Returns the original
 * input when it cannot be parsed, so callers can still surface it for editing.
 */
export function toE164(
  value: string | undefined | null,
  defaultCountry: Country = DEFAULT_PHONE_COUNTRY
): string {
  if (!value) return ''

  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const parsed = parsePhoneNumber(
      trimmed,
      trimmed.startsWith('+') ? undefined : defaultCountry
    )
    if (parsed?.number) {
      return parsed.number
    }
  } catch {
    // fall through to returning the original value
  }

  return trimmed
}
