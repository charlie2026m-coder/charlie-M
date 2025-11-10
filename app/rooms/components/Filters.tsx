'use client'
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Label } from "@/app/_components/ui/label"
import { useState } from "react"
import { CustomSelect } from "@/app/_components/ui/CustomSelect"
import { RadioGroupDemo } from "@/app/_components/ui/CustomRadio"

const Filters = () => {
  const [categories, setCategories] = useState<string[]>([])
  const [balcony, setBalcony] = useState<boolean>(false)
  const [bedSize, setBedSize] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('Price')

  const handleCategoryChange = (item: string) => {
    setCategories(categories.includes(item) ? categories.filter((category) => category !== item) : [...categories, item])
  }
  return (
    <div className='flex flex-col p-5 border border-gray bg-white rounded-[20px] mb-22'>
      <div className='flex justify-between items-center w-full mb-10'>
        <div className='flex gap-5'>
          <div className='flex items-center gap-6'>
            {catagories.map((item) => (
              <div key={item} className='flex items-center gap-2.5 cursor-pointer'>
                <Checkbox id={item} checked={categories.includes(item)} onCheckedChange={() => handleCategoryChange(item)} />
                <Label htmlFor={item} className='text-[17px] font-[400]  cursor-pointer inter'>Category {item}</Label>
              </div>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-3 font-medium'>
          Sort by: 
          <CustomSelect options={['Price', 'Size']} placeholder="Price" value={sortBy} onChange={(value) => setSortBy(value)} />
        </div>
      </div>
      <div className='flex gap-10'>
        <RadioGroupDemo title="Balcony:" options={['Yes', 'No']} value={balcony ? 'Yes' : 'No'} onChange={(value) => setBalcony(value === 'Yes')} />
        <RadioGroupDemo title="Bed Size:" options={['90/200', '120/200', '140/200', '160/200']} value={bedSize} onChange={(value) => setBedSize(value as string | null)} />
      </div>
    </div>
  )
}

export default Filters

const catagories = ['A', 'B', 'C', 'D']