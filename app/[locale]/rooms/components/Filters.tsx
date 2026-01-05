'use client'
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Label } from "@/app/_components/ui/label"
import { CustomSelect } from "@/app/_components/ui/CustomSelect"
import { BedSizeFilter, MainFilter } from "@/store/useStore"
import { useStore } from "@/store/useStore"

const Filters = () => {
  const { filter, bedSizeFilter, priceFilter, setValue } = useStore()
  const setFilter = (value: MainFilter) => {
    setValue(filter === value ? undefined : value, 'filter')
  }
  const setBedSizeFilter = (value: BedSizeFilter) => {
    setValue(bedSizeFilter === value ? undefined : value, 'bedSizeFilter')
  }

  return (  
      <div className='hidden md:flex flex-col p-5 border border-gray bg-white rounded-[20px] mb-9'>
          <div className='grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-5'>
            <div className='flex gap-2 flex flex-col col-span-2 justify-center'>
              <h2 className='flex font-bold text-lg'>Balcony or terrace:</h2>
              <div className='flex gap-6'>
                {filters.map((item) => (
                  <div key={item.value} className='flex items-center gap-2.5 cursor-pointer'>
                    <Checkbox id={item.value} checked={filter === item.value} onCheckedChange={() => setFilter(item.value as MainFilter)} />
                    <Label htmlFor={item.value} className='text-[17px] font-[400]  cursor-pointer inter'>{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className='flex gap-2 flex justify-center flex-col col-span-2'>
              <h2 className='flex font-bold text-lg'>Bed Size:</h2>
              <div className='flex gap-6'>
                {bedsFilter.map((item) => (
                  <div key={item.value} className='flex items-center gap-2.5 cursor-pointer'>
                    <Checkbox id={item.value} checked={bedSizeFilter === item.value} onCheckedChange={() => setBedSizeFilter(item.value as BedSizeFilter)} />
                    <Label htmlFor={item.value} className='text-[17px] font-[400]  cursor-pointer inter'>{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          <div className='flex flex-col gap-2'>
            <h2 className='text-lg font-bold'>Sort by Price:</h2>
            <CustomSelect 
              options={['Cheapest', 'Expensive']} 
              placeholder="Select price filter" 
              value={priceFilter} 
              onChange={(value) => setValue(value, 'priceFilter')} 
            />
          </div>
          </div>
      </div>
  )
}

export default Filters

const filters = [{
  label: 'Balcony',
  value: 'balcony'
}, {
  label: 'Terrace',
  value: 'terrace'
}, {
  label: 'Shared Terrace',
  value: 'shared'
}]

const bedsFilter = [
  {
    label: '120/200',
    value: 'single'
  },

  {
    label: '140/200',
    value: 'queen'
  },
  {
    label: '160/200',
    value: 'king'
  },
]