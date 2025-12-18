import ExtraCard from "@/app/booking/[id]/components/ExtraCard"
import { useState } from "react"
import { ExtrasItem } from "@/types/beds24"

const UpgradeRoom = () => {
const [selected, setSelected] = useState<ExtrasItem[]>([])

  return (
    <div className='px-3 lg:px-[30px]'>
      <div className='flex items-center gap-2 border-b pb-2 mb-5 text-lg font-semibold w-full'>
        Add Extras:
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6 gap-y-3 lg:gap-y-10 mb-5'>
        {extras.map((extra, index) => (
          <ExtraCard 
            key={extra.title + index} 
            item={{name: extra.title, amount: extra.price, index: index, type: 'optional', per: 'room', period: 'daily', enable: true}} 
            setExtra={(extra: ExtrasItem) => setSelected([...selected, extra])} 
            isSelected={selected.some((selected) => selected.index === index)} 
          />
        ))}
      </div>
    </div>
  )
}

export default UpgradeRoom

const extras = [
  { image: '/images/extra-1.png', title: 'Extra Bed', price: 10, id: 1 },
  { image: '/images/extra-2.png', title: 'Extra Bed', price: 10, id: 2 },
  { image: '/images/extra-3.png', title: 'Extra Bed', price: 10, id: 3 },
  { image: '/images/extra-1.png', title: 'Extra Bed', price: 50, id: 4 },
  { image: '/images/extra-2.png', title: 'Extra Bed', price: 30, id: 5 },
  { image: '/images/extra-3.png', title: 'Extra Bed', price: 20, id: 6 },
]