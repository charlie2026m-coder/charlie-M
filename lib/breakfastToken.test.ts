import { describe, expect, it } from 'vitest'
import { tokenFromScan } from './breakfastToken'

describe('tokenFromScan', () => {
  it('takes a bare token, whitespace and all', () => {
    expect(tokenFromScan('  CMlzxq-c-ndF \n')).toBe('CMlzxq-c-ndF')
  })
  it('takes our guest-page URL, with or without a language', () => {
    expect(tokenFromScan('https://www.charlie-m.de/breakfast/CMlzxq-c-ndF')).toBe('CMlzxq-c-ndF')
    expect(tokenFromScan('https://www.charlie-m.de/breakfast/CMlzxq-c-ndF/?lang=de')).toBe('CMlzxq-c-ndF')
    expect(tokenFromScan('http://localhost:3000/breakfast/CMlzxq-c-ndF')).toBe('CMlzxq-c-ndF')
  })
  it('takes the path from any host — dev, preview and live all serve this page', () => {
    expect(tokenFromScan('https://example.com/breakfast/CMlzxq-c-ndF')).toBe('CMlzxq-c-ndF')
  })
  it('refuses everything else', () => {
    expect(tokenFromScan('https://www.charlie-m.de/r/ABC12345')).toBeNull()
    expect(tokenFromScan('mailto:x@y.de')).toBeNull()
    expect(tokenFromScan('short')).toBeNull()
    expect(tokenFromScan('')).toBeNull()
    expect(tokenFromScan(null)).toBeNull()
  })
})
