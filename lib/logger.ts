import { createConsola } from 'consola'

// Isomorphic logger — works on server (Vercel logs) and client (DevTools).
// Tagged loggers let us grep by domain: [price-trace], [booking], [adyen], etc.
//
// Never pass PII (email, name, phone, address). Trace prices, IDs, and flow markers only.
const base = createConsola({
  level: process.env.NODE_ENV === 'production' ? 3 : 4,
  formatOptions: {
    date: true,
    colors: true,
  },
})

export const logger = base

export const priceLog = base.withTag('price-trace')
export const bookingLog = base.withTag('booking')
export const adyenLog = base.withTag('adyen')
export const apaleoLog = base.withTag('apaleo')
export const folioLog = base.withTag('folio')
export const paymentAccountLog = base.withTag('payment-account')
export const authorizationLog = base.withTag('authorization')
