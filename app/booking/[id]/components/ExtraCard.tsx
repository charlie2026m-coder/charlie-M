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
    <div className='flex lg:flex-col gap-2 relative'>
      <div className='relative mb-2'>
        <div className='relative size-[80px] lg:w-full lg:h-[185px]'>
          <Image 
            src="/images/extra-1.png" 
            alt={item.name} 
            fill
            className='rounded-lg object-cover'
          />
        </div>
        {isSelected 
          ? <div className='absolute hidden lg:flex top-2.5 right-2.5 flex items-center justify-center  rounded transition-all duration-300 cursor-pointer size-10  shadow-lg bg-blue border-blue text-white  '>
              <LuCheckCheck className='size-6' /> 
            </div>
          : <div onClick={() => setExtra(item)} className='absolute hidden lg:flex top-2.5 right-2.5 flex items-center justify-center  rounded transition-all duration-300 cursor-pointer size-10 bg-white text-mute shadow-lg hover:bg-blue hover:border-blue hover:text-white  '>
              <FaPlus className='size-6'  />
            </div>
        }
      </div>

      <div className='flex flex-col '>
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
              {!isSelected && <div className='flex gap-4 justify-end mt-[30px]'>
                <Button 
                  className='md:w-full max-w-[190px] h-[45px]' 
                  onClick={() => {
                    setIsOpen(false);
                    setExtra(item);
                  }}
                >Add</Button> 
              </div>}
            </div>
          } 
          title={item.name} 
        /> 
      </div>
      {isSelected 
        ? <div className=' flex items-center justify-center lg:hidden ml-auto rounded transition-all duration-300 cursor-pointer size-10  shadow-lg bg-blue border-blue text-white  '>
            <LuCheckCheck className='size-6' /> 
          </div>
        : <div onClick={() => setExtra(item)} className='flex items-center justify-center  lg:hidden ml-auto rounded transition-all duration-300 cursor-pointer size-10 border border-brown text-brown hover:bg-blue hover:border-blue hover:text-white'>
          <FaPlus className='size-6'  />
        </div>
      }


    </div>
  )
}

export default ExtraCard