import { FaPlus } from "react-icons/fa6";
import { LuCheckCheck } from "react-icons/lu";

import Image from 'next/image'
import type { ExtrasItem } from '@/types/beds24'
const ExtraCard = ({ item, setExtra, isSelected }: { item: ExtrasItem, setExtra: (extra: ExtrasItem) => void, isSelected: boolean }) => {

  return (
    <div className='flex flex-col gap-'>
      <div className='relative mb-2'>
        <div className='relative w-full h-[185px]'>
        {isSelected && <div className='absolute top-0 left-0 w-full h-full bg-white/50 flex items-center justify-center '>
            <LuCheckCheck className='size-10 text-brown' />
        </div>}
          <Image 
            src="/images/extra-1.png" 
            alt={item.name || 'Extra'} 
            width={185} 
            height={185} 
            className='w-full h-[185px] rounded-lg object-cover'
          />
        </div>
        {!isSelected && <div className='absolute rounded-full hover:bg-green/70 transition-all duration-300 cursor-pointer size-[33px] top-2.5 right-2.5 bg-green text-white flex items-center justify-center '>
          <FaPlus className='size-5' onClick={() => setExtra(item)} />
        </div>}
      </div>
      <h3 className='inter '>{item.name}</h3>
      <div className='text-green font-bold'>+ €{item.amount.toFixed(2)}</div>
      <span className='text-brown underline cursor-pointer'>Learn more</span>
    </div>
  )
}

export default ExtraCard