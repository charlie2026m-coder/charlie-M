'use client'
import { useStore } from "@/store/useStore"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_components/ui/popover"
import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Label } from "@/app/_components/ui/label"
import { useTranslations } from 'next-intl'
import { IoBedOutline } from "react-icons/io5"
import { BsHouseDoor, BsDoorOpen } from "react-icons/bs"
import { TbSortAscending, TbSortDescending } from "react-icons/tb"

const Filters = ({ showBabyBed = true }: { showBabyBed?: boolean }) => {
  const { filter, bedSizeFilter, priceFilter, roomTypeFilter, childBedFilter, setValue } = useStore()
  const t = useTranslations('filters')
  const [roomTypeOpen, setRoomTypeOpen] = useState(false)
  const [bedSizeOpen, setBedSizeOpen] = useState(false)
  const [balconyOpen, setBalconyOpen] = useState(false)

  const typeFilters = useMemo(() => [
    { label: t('all'), value: 'all' },
    { label: t('single'), value: 'single' },
    { label: t('standard'), value: 'standard' },
    { label: t('business'), value: 'business' },
    { label: t('superior'), value: 'superior' }
  ], [t])

  const bedsFilter = useMemo(() => [
    { label: t('all'), value: 'all' },
    { label: t('single'), value: 'single' },
    { label: t('queen'), value: 'queen' },
    { label: t('king'), value: 'king' }
  ], [t])

  const filters = useMemo(() => [
    { label: t('any'), value: 'all' },
    { label: t('balcony'), value: 'balcony' },
    { label: t('terrace'), value: 'terrace' },
    { label: t('sharedTerrace'), value: 'shared' }
  ], [t])

  const getRoomTypeLabel = () => typeFilters.find(f => f.value === roomTypeFilter)?.label || t('all')
  const getBedSizeLabel = () => bedsFilter.find(f => f.value === bedSizeFilter)?.label || t('all')
  const getBalconyLabel = () => filters.find(f => f.value === filter)?.label || t('any')

  const BabyBed = ({ id, className }: { id: string, className?: string }) => (
    <div className={cn('items-center gap-1', className)}>
      <Checkbox
        id={id}
        checked={childBedFilter}
        onCheckedChange={(checked) => setValue(checked as boolean, 'childBedFilter')}
        size="sm"
      />
      <Label htmlFor={id} className='text-[15px] inter font-[400] cursor-pointer'>
        {t('babyBed')}
      </Label>
    </div>
  )

  return (
    <div className='flex gap-3 mb-9 flex-wrap items-center'>
      <FilterDropdown
        icon={<BsHouseDoor className='size-4 text-blue' />}
        label={t('roomType')}
        value={getRoomTypeLabel()}
        isOpen={roomTypeOpen}
        onOpenChange={setRoomTypeOpen}
        options={typeFilters}
        selectedValue={roomTypeFilter}
        onSelect={(value) => setValue(value === 'all' ? undefined : value, 'roomTypeFilter')}
      />

      <FilterDropdown
        icon={<IoBedOutline className='size-4 text-blue' />}
        label={t('bedSize')}
        value={getBedSizeLabel()}
        isOpen={bedSizeOpen}
        onOpenChange={setBedSizeOpen}
        options={bedsFilter}
        selectedValue={bedSizeFilter}
        onSelect={(value) => setValue(value === 'all' ? undefined : value, 'bedSizeFilter')}
      />

      <FilterDropdown
        icon={<BsDoorOpen className='size-4 text-blue' />}
        label={t('balcony')}
        value={getBalconyLabel()}
        isOpen={balconyOpen}
        onOpenChange={setBalconyOpen}
        options={filters}
        selectedValue={filter}
        onSelect={(value) => setValue(value === 'all' ? undefined : value, 'filter')}
      />

      {showBabyBed && <BabyBed id="child-bed" className='md:flex hidden' />}

      {/* Price sort toggle — clearer than a dropdown; low↔high. */}
      <button
        type='button'
        aria-label={t('price')}
        aria-pressed={priceFilter}
        onClick={() => setValue(!priceFilter, 'priceFilter')}
        className='md:ml-auto flex gap-2 cursor-pointer items-center border rounded-lg px-3 py-1 transition-all hover:border-blue'
      >
        {priceFilter
          ? <TbSortAscending className='size-4 text-blue shrink-0' />
          : <TbSortDescending className='size-4 text-blue shrink-0' />}
        <span className='text-[15px] inter'>
          <span className='text-gray-500'>{t('price')}:</span>{' '}
          <span className='font-[500]'>{priceFilter ? t('lowToHigh') : t('highToLow')}</span>
        </span>
      </button>

      {showBabyBed && <BabyBed id="child-bed-mobile" className='flex md:hidden' />}
    </div>
  )
}

interface FilterDropdownProps {
  className?: string
  icon?: React.ReactNode
  label: string
  value: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  options: { label: string; value: string }[]
  selectedValue: string | undefined
  onSelect: (value: string) => void
}

const FilterDropdown = ({
  className,
  icon,
  label,
  value,
  isOpen,
  onOpenChange,
  options,
  selectedValue,
  onSelect
}: FilterDropdownProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const triggerInner = (
    <span className='flex items-center gap-1.5'>
      {icon}
      <span className='text-[15px] inter'>
        <span className='text-gray-500'>{label}:</span> <span className='font-[500]'>{value}</span>
      </span>
    </span>
  )

  // Server-side and initial client render: show button only (no popover)
  if (!mounted) {
    return (
      <button className={cn('px-3 py-1 rounded-lg border transition-all', className)} suppressHydrationWarning>
        {triggerInner}
      </button>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button className={cn('px-3 py-1 rounded-lg border transition-all hover:border-blue', className)}>
          {triggerInner}
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-[200px] p-1 overflow-hidden' align='start'>
        <div className='flex flex-col'>
          {options.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                onSelect(item.value)
                onOpenChange(false)
              }}
              className={cn('px-2 py-1 text-left hover:bg-gray-100 transition-colors text-[15px] rounded inter flex items-center justify-between')}
            >
              <span>{item.label}</span>
              {selectedValue === item.value && item.value !== 'all' && <Check className='size-5' />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default Filters
