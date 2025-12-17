import { FaPlus } from "react-icons/fa6";
import { LuCheckCheck } from "react-icons/lu";

import Image from 'next/image'
import type { ExtrasItem } from '@/types/beds24'
import { CustomDialog } from "@/app/_components/ui/CustomDialog";
import { Button } from "@/app/_components/ui/button";
import { useState } from "react";
const ExtraCard = ({ item, setExtra, isSelected }: { item: ExtrasItem, setExtra: (extra: ExtrasItem) => void, isSelected: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
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
      
      <CustomDialog 
        open={isOpen}
        setOpen={setIsOpen}
        trigger={<span className='text-brown underline cursor-pointer w-full'>Learn more</span>} 
        content={
          <div className='flex flex-col '>
            <Image src="/images/extra-1.png" alt={item.name || 'Extra'} width={185} height={185} className='w-full h-[185px] lg:h-[230px] xl:h-[350px] rounded-lg object-cover mb-7' />
            <div className='flex  justify-between items-center mb-4'>
              <div className='font-semibold text-lg'>Price:</div>
              <div className='text-green font-bold text-xl'>+ €{item.amount.toFixed(2)}<span className='text-base text-dark font-normal'> (per day)</span></div>
            </div>
            <p className='text-dark'>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <div className='flex gap-4 items-center justify-center mt-[30px]'>
              <Button variant='outline' className='w-full max-w-[190px] h-[45px]' onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button className='w-full max-w-[190px] h-[45px]' onClick={() => setIsOpen(false)}>Add</Button>
            </div>
          </div>
        } 
        title={item.name} 
      /> 
    </div>
  )
}

export default ExtraCard