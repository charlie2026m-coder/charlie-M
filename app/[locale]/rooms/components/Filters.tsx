'use client'
import { useStore } from "@/store/useStore"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_components/ui/popover"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Label } from "@/app/_components/ui/label"

const Filters = () => {
  const { filter, bedSizeFilter, priceFilter, roomTypeFilter, childBedFilter, setValue } = useStore()
  const [roomTypeOpen, setRoomTypeOpen] = useState(false)
  const [bedSizeOpen, setBedSizeOpen] = useState(false)
  const [balconyOpen, setBalconyOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)

  const getRoomTypeLabel = () => {
    const selected = typeFilters.find(f => f.value === roomTypeFilter)?.label
    return selected || 'All'
  }

  const getBedSizeLabel = () => {
    const selected = bedsFilter.find(f => f.value === bedSizeFilter)?.label
    return selected || 'All'
  }

  const getBalconyLabel = () => {
    const selected = filters.find(f => f.value === filter)?.label
    return selected || 'Any'
  }

  const getPriceLabel = () => {
    const priceValue = priceFilter === true ? 'true' : priceFilter === false ? 'false' : undefined
    const selected = priceFilters.find(f => f.value === priceValue)?.label
    return selected || 'All'
  }

  return (  
      <div className='flex gap-3 mb-9 flex-wrap'>
        <FilterDropdown
          label="Room Type"
          value={getRoomTypeLabel()}
          isOpen={roomTypeOpen}
          onOpenChange={setRoomTypeOpen}
          options={typeFilters}
          selectedValue={roomTypeFilter}
          onSelect={(value) => setValue(value === 'all' ? undefined : value, 'roomTypeFilter')}
        />

        <FilterDropdown
          label="Bed Size"
          value={getBedSizeLabel()}
          isOpen={bedSizeOpen}
          onOpenChange={setBedSizeOpen}
          options={bedsFilter}
          selectedValue={bedSizeFilter}
          onSelect={(value) => setValue(value === 'all' ? undefined : value, 'bedSizeFilter')}
        />

        <FilterDropdown
          label="Balcony"
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
            Child Bed
          </Label>
        </div>
        <FilterDropdown
          className='md:ml-auto'
          label="Price"
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
            Baby Bed
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

const filters = [
  {
    label: 'Any',
    value: 'all'
  },
  {
    label: 'Balcony',
    value: 'balcony'
  }, {
    label: 'Terrace',
    value: 'terrace'
  }, {
    label: 'Shared Terrace',
    value: 'shared'
  }
]
const typeFilters = [
  {
    label: 'All',
    value: 'all'
  },
  {
    label: 'Single',
    value: 'single'
  }, {
    label: 'Standard',
    value: 'standard'
  }, {
    label: 'Business',
    value: 'business'
  }, {
    label: 'Superior',
    value: 'superior'
  }
]

const bedsFilter = [
  {
    label: 'All',
    value: 'all'
  },
  {
    label: 'Single',
    value: 'single'
  },
  {
    label: 'Queen',
    value: 'queen'
  },
  {
    label: 'King',
    value: 'king'
  },
]

const priceFilters = [

  {
    label: 'Low to High',
    value: 'true'
  },
  {
    label: 'High to Low',
    value: 'false'
  }
]