import Image from 'next/image'
import { ExtraDetails } from '@/types/types'
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog";
import { useState } from "react";
import AddExtraButton from "./AddExtraButton";

const ExtraCard = ({ item }: { item: ExtraDetails }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='flex lg:flex-col gap-2 relative'>
      <div className='relative mb-2'>
        <div className='relative size-[80px] lg:w-full lg:h-[185px]'>
          <Image 
            src={item.imageUrl} 
            alt={item.title} 
            fill
            className='rounded-lg object-cover'
          />
        </div>
        <AddExtraButton extraId={item.id} title={item.title} />
       
      </div>

      <div className='flex flex-col '>
        <h3 className='inter '>{item.title}</h3>
        <div className='text-green font-bold'>+ €{item.price.toFixed(2)}</div>
        
        <ClientCustomDialog 
          open={isOpen}
          setOpen={setIsOpen}
          trigger={<span className='text-brown underline cursor-pointer w-full'>Learn more</span>} 
          content={
            <div className='flex flex-col '>
              <Image src={item.imageUrl} alt={item.title || 'Extra'} width={185} height={185} className='w-full h-[185px] lg:h-[230px] xl:h-[350px] rounded-lg object-cover mb-7' />
              <div className='flex  justify-between items-center mb-4'>
                <div className='font-semibold text-lg'>Price:</div>
                <div className='text-green font-bold text-xl'>+ €{item.price.toFixed(2)}<span className='text-base text-dark font-normal'> (per day)</span></div>
              </div>
              <p className='text-dark'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
               {/* <div className='flex gap-4 justify-end mt-[30px]'>
                <Button 
                  className='md:w-full max-w-[190px] h-[45px]' 
                  onClick={() => {
                    setIsOpen(false);
                  }}
                >Add</Button> 
              </div> */}
            </div>
          } 
          title={item.title} 
        /> 
      </div>
    </div>
  )
}

export default ExtraCard
