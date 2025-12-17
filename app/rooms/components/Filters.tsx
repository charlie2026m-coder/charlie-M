'use client'
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Label } from "@/app/_components/ui/label"
import { CustomSelect } from "@/app/_components/ui/CustomSelect"
import { RadioGroupDemo } from "@/app/_components/ui/CustomRadio"
import { MainFilter, useBookingStore } from "@/store/bookingStore"

const Filters = () => {
  const { filter, bedSizeFilter, priceFilter, setValue } = useBookingStore()
  console.log( priceFilter)
  const setFilter = (value: MainFilter) => {
    setValue(filter === value ? undefined : value, 'filter')
  }
  return (
      <div className='hidden md:flex flex-col p-5 border border-gray bg-white rounded-[20px] mb-9'>
          <div className='grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-5'>
            <div className='flex gap-2 flex flex-col col-span-2 '>
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

            <div className='col-span-2'>
              <RadioGroupDemo 
                title="Bed Size:" 
                options={['90/200', '120/200', '140/200', '160/200']} 
                value={bedSizeFilter} 
                onChange={(value) => setValue(value as string, 'bedSizeFilter')} 
              />
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
  value: 'shared_terrace'
}]