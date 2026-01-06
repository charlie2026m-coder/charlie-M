'use client'
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Label } from "@/app/_components/ui/label"
import { BedSizeFilter, MainFilter, RoomTypeFilter } from "@/store/useStore"
import { useStore } from "@/store/useStore"
import { FaSortAmountDown, FaSortAmountUp } from "react-icons/fa";

const Filters = () => {
  const { filter, bedSizeFilter, priceFilter, roomTypeFilter, setValue } = useStore()

  const setFilter = (value: MainFilter) => {
    setValue(filter === value ? undefined : value, 'filter')
  }
  const setBedSizeFilter = (value: BedSizeFilter) => {
    setValue(bedSizeFilter === value ? undefined : value, 'bedSizeFilter')
  }
  const setRoomTypeFilter = (value: RoomTypeFilter) => {
    setValue(roomTypeFilter === value ? undefined : value, 'roomTypeFilter')
  }

  return (  
      <div className='hidden md:flex flex-col  mb-9'>
          <div className='flex gap-5'>
            <div className='flex gap-2 flex justify-center flex-col'>
              <h2 className='flex font-bold text-lg'>Room Type:</h2>
              <div className='flex gap-6'>
                {typeFilters.map((item) => (
                  <div key={item.value} className='flex items-center gap-2.5 cursor-pointer'>
                    <Checkbox size="sm" id={item.value} checked={roomTypeFilter === item.value} onCheckedChange={() => setRoomTypeFilter(item.value as RoomTypeFilter)} />
                    <Label htmlFor={item.value} className='text-[17px] font-[400]  cursor-pointer inter'>{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className='flex gap-2 flex justify-center flex-col '>
              <h2 className='flex font-bold text-lg'>Bed Size:</h2>
              <div className='flex gap-6'>
                {bedsFilter.map((item) => (
                  <div key={item.value} className='flex items-center gap-2.5 cursor-pointer'>
                    <Checkbox size="sm" id={item.value} checked={bedSizeFilter === item.value} onCheckedChange={() => setBedSizeFilter(item.value as BedSizeFilter)} />
                    <Label htmlFor={item.value} className='text-[17px] font-[400]  cursor-pointer inter'>{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className='flex gap-2 cursor-pointer items-center border rounded-full p-2 px-4 self-end ml-auto' onClick={() => setValue(!priceFilter, 'priceFilter')}>
              <h2 className='text-lg '>Price</h2>
              {priceFilter ? <FaSortAmountDown className='size-5' /> : <FaSortAmountUp className='size-5' />}
            </div>

            </div>
            <div className='flex gap-2 flex flex-col  justify-center'>
              <h2 className='flex font-bold text-lg'>Balcony or terrace:</h2>
              <div className='flex gap-6'>
                {filters.map((item) => (
                  <div key={item.value} className='flex items-center gap-2.5 cursor-pointer'>
                    <Checkbox size="sm" id={item.value} checked={filter === item.value} onCheckedChange={() => setFilter(item.value as MainFilter)} />
                    <Label htmlFor={item.value} className='text-[17px] font-[400]  cursor-pointer inter'>{item.label}</Label>
                  </div>
                ))}
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
const typeFilters = [{
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
}]

const bedsFilter = [
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