'use client'
import { useStore } from "@/store/useStore"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_components/ui/popover"
import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Label } from "@/app/_components/ui/label"
import { useTranslations } from 'next-intl'

const Filters = () => {
  const { filter, bedSizeFilter, priceFilter, roomTypeFilter, childBedFilter, setValue } = useStore()
  const t = useTranslations('filters')
  const [roomTypeOpen, setRoomTypeOpen] = useState(false)
  const [bedSizeOpen, setBedSizeOpen] = useState(false)
  const [balconyOpen, setBalconyOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)

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

  const priceFilters = useMemo(() => [
    { label: t('lowToHigh'), value: 'true' },
    { label: t('highToLow'), value: 'false' }
  ], [t])

  const getRoomTypeLabel = () => {
    const selected = typeFilters.find(f => f.value === roomTypeFilter)?.label
    return selected || t('all')
  }

  const getBedSizeLabel = () => {
    const selected = bedsFilter.find(f => f.value === bedSizeFilter)?.label
    return selected || t('all')
  }

  const getBalconyLabel = () => {
    const selected = filters.find(f => f.value === filter)?.label
    return selected || t('any')
  }

  const getPriceLabel = () => {
    const priceValue = priceFilter === true ? 'true' : priceFilter === false ? 'false' : undefined
    const selected = priceFilters.find(f => f.value === priceValue)?.label
    return selected || t('all')
  }

  return (  
      <div className='flex gap-3 mb-9 flex-wrap'>
        <FilterDropdown
          label={t('roomType')}
          value={getRoomTypeLabel()}
          isOpen={roomTypeOpen}
          onOpenChange={setRoomTypeOpen}
          options={typeFilters}
          selectedValue={roomTypeFilter}
          onSelect={(value) => setValue(value === 'all' ? undefined : value, 'roomTypeFilter')}
        />

        <FilterDropdown
          label={t('bedSize')}
          value={getBedSizeLabel()}
          isOpen={bedSizeOpen}
          onOpenChange={setBedSizeOpen}
          options={bedsFilter}
          selectedValue={bedSizeFilter}
          onSelect={(value) => setValue(value === 'all' ? undefined : value, 'bedSizeFilter')}
        />

        <FilterDropdown
          label={t('balcony')}
          value={getBalconyLabel()}
          isOpen={balconyOpen}
          onOpenChange={setBalconyOpen}
          options={filters}
          selectedValue={filter}
          onSelect={(value) => setValue(value === 'all' ? undefined : value, 'filter')}
        />


        <div className='md:flex hidden items-center gap-1'>
          <Checkbox 
            id="child-bed" 
            checked={childBedFilter} 
            onCheckedChange={(checked) => setValue(checked as boolean, 'childBedFilter')}
            size="sm"
          />
          <Label 
            htmlFor="child-bed" 
            className='text-[15px] inter font-[400] cursor-pointer'
          >
            {t('babyBed')}
          </Label>
        </div>
        <FilterDropdown
          className='md:ml-auto'
          label={t('price')}
          value={getPriceLabel()}
          isOpen={priceOpen}
          onOpenChange={setPriceOpen}
          options={priceFilters}
          selectedValue={priceFilter?.toString()}
          onSelect={(value) => setValue(value === 'all' ? false : value === 'true', 'priceFilter')}
        />
        <div className='flex md:hidden items-center gap-1'>
          <Checkbox 
            id="child-bed-mobile" 
            checked={childBedFilter} 
            onCheckedChange={(checked) => setValue(checked as boolean, 'childBedFilter')}
            size="sm"
          />
          <Label 
            htmlFor="child-bed-mobile" 
            className='text-[15px] inter font-[400] cursor-pointer'
          >
            {t('babyBed')}
          </Label>
        </div>
      </div>
  )
}

interface FilterDropdownProps {
  className?: string
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

  // Server-side and initial client render: show button only
  if (!mounted) {
    return (
      <button className={cn('px-3 py-1 rounded-lg border transition-all', className)} suppressHydrationWarning>
        <span className='text-[15px] inter'>
          <span className='text-gray-500'>{label}:</span> <span className='font-[500]'>{value}</span>
        </span>
      </button>
    )
  }

  // Client-side after mount: show full Popover
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button className={cn('px-3 py-1 rounded-lg border transition-all', className)}>
          <span className='text-[15px] inter'>
            <span className='text-gray-500'>{label}:</span> <span className='font-[500]'>{value}</span>
          </span>
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
              className={cn('px-2 py-1 text-left hover:bg-gray-100 transition-colors text-[15px] rounded inter flex items-center justify-between',)}
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