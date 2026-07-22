'use client'
import Price from '@/app/_components/ui/price'
import { useTranslations, useLocale } from 'next-intl'
import { useAddExtrasStore } from '@/store/useAddExtras'
import type { ExtrasPriceLine } from '@/lib/extrasPrice'
import { isBreakfastBeverage, isBreakfastFood, breakfastBundleLabel } from '@/lib/breakfastBundle'

// Order summary next to the card form. Renders EXCLUSIVELY from the
// computeServicesTotalCents breakdown the page already computed for the
// charged amount — this table used to re-derive prices with its own copy of
// the rules and could drift from the actual charge. Breakfast keeps its
// special treatment: the beverage half's line is folded into the food line so
// the guest sees ONE bundle row.
const ServicesTable = ({ lines, totalAmount }: { lines: ExtrasPriceLine[]; totalAmount: number }) => {
  const t = useTranslations('payment')
  const locale = useLocale()
  const availableExtras = useAddExtrasStore(state => state.availableExtras)

  if (lines.length === 0) return null

  // Fold the beverage half into the food line ONLY when a food line exists —
  // a lone beverage half (stale store state) must keep its own visible row,
  // otherwise its cents sit inside Total with no line item (a charged amount
  // must never be invisible on a payment page).
  const hasFoodLine = lines.some(l => isBreakfastFood(l.serviceId) && l.units > 0)
  const beverageCents = hasFoodLine
    ? lines.filter(l => isBreakfastBeverage(l.serviceId)).reduce((sum, l) => sum + l.subtotalCents, 0)
    : 0

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-5 px-3 border self-start'>
      <h2 className='text-2xl font-bold mb-3 text-center'>{t('summary')}</h2>

      <div className='flex flex-col mb-5'>
        <span className='font-semibold mb-4 text-[15px]'>{t('services')}</span>

        {lines.map((line, index) => {
          if (line.units === 0) return null
          // Beverage half is merged into the Breakfast line — but ONLY when a
          // food line exists to carry it; a lone half keeps its own row.
          if (isBreakfastBeverage(line.serviceId) && hasFoodLine) return null
          const isFood = isBreakfastFood(line.serviceId)
          const subtotalCents = line.subtotalCents + (isFood ? beverageCents : 0)
          const name = isFood
            ? breakfastBundleLabel(locale)
            : availableExtras.find(e => e.id === line.serviceId)?.name ?? line.serviceId
          return (
            <div key={`service-${line.serviceId}-${index}`} className='flex items-center gap-2 inter text-sm text-dark mb-2'>
              <div className='truncate overflow-hidden whitespace-nowrap flex items-center'>
                {name} (x{line.units})
              </div>
              <span className='text-bale font-semibold ml-auto'>€ {(subtotalCents / 100).toFixed(2)}</span>
            </div>
          )
        })}
      </div>

      <div className='flex items-center justify-between mb-3'>
        <span className='font-semibold text-lg'>{t('total')}</span>
        <Price price={totalAmount} />
      </div>
    </div>
  )
}

export default ServicesTable
