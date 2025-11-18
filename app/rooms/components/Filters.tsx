'use client'
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Label } from "@/app/_components/ui/label"
import { CustomSelect } from "@/app/_components/ui/CustomSelect"
import { RadioGroupDemo } from "@/app/_components/ui/CustomRadio"
import { useBookingStore } from "@/store/bookingStore"

const Filters = () => {
  const { categoryFilter, balconyFilter, bedSizeFilter, sortByFilter, setValue } = useBookingStore()

  const handleCategoryChange = (item: string) => {
    setValue(categoryFilter.includes(item) ? categoryFilter.filter((categoryFilter) => categoryFilter !== item) : [...categoryFilter, item], 'categoryFilter')
  }
  return (
    <div className='flex flex-col p-5 border border-gray bg-white rounded-[20px] mb-22'>
      <div className='flex justify-between items-center w-full mb-10'>
        <div className='flex gap-5'>
          <div className='flex items-center gap-6'>
            {catagories.map((item) => (
              <div key={item} className='flex items-center gap-2.5 cursor-pointer'>
                <Checkbox id={item} checked={categoryFilter.includes(item)} onCheckedChange={() => handleCategoryChange(item)} />
                <Label htmlFor={item} className='text-[17px] font-[400]  cursor-pointer inter'>{item}</Label>
              </div>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-3 font-medium'>
          Sort by: 
          <CustomSelect options={['Price', 'Size']} placeholder="Price" value={sortByFilter} onChange={(value) => setValue(value as 'Price' | 'Size', 'sortByFilter')} />
        </div>
      </div>
      <div className='flex gap-10'>
        <RadioGroupDemo title="Balcony:" options={['Yes', 'No']} value={balconyFilter ? 'Yes' : 'No'} onChange={(value) => setValue(value === 'Yes', 'balconyFilter')} />
        <RadioGroupDemo title="Bed Size:" options={['90/200', '120/200', '140/200', '160/200']} value={bedSizeFilter} onChange={(value) => setValue(value as string, 'bedSizeFilter')} />
      </div>
    </div>
  )
}

export default Filters

const catagories = ['Double', 'Single', 'Triple', 'Quad']