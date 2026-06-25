// Minimal typings for the Cookiebot (Usercentrics) consent API exposed on window.
// https://www.cookiebot.com/en/developer/

interface CookiebotConsent {
  necessary: boolean
  preferences: boolean
  statistics: boolean
  marketing: boolean
}

interface CookiebotApi {
  consent: CookiebotConsent
  consented: boolean
  declined: boolean
  hasResponse: boolean
  /** Re-open the consent banner so the visitor can change/withdraw consent. */
  renew: () => void
  show: () => void
  hide: () => void
  withdraw: () => void
}

declare global {
  interface Window {
    Cookiebot?: CookiebotApi
  }
}

export {}
