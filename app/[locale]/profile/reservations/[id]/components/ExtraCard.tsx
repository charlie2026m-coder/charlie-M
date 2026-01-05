import Image from 'next/image'
import { ClientCustomDialog } from "@/app/_components/ui/ClientCustomDialog";
import { useState } from "react";
import { Service } from '@/types/apaleo';
import { FaPlus } from 'react-icons/fa6';


const ExtraCard = ({ item }: { item: Service }) => {
  const [isOpen, setIsOpen] = useState(false);

  const image = '/images/extra.webp'
  return (
    <div className='flex sm:flex-col gap-2 relative'>
      <div className='relative '>
        <div className=' size-[80px] sm:w-full sm:h-[185px]'>
          <Image 
            src={image} 
            alt={item.name} 
            fill
            className='rounded-lg object-cover'
          />
        </div>
      </div>
      <div className='absolute flex top-2.5 right-2.5 items-center justify-center  rounded transition-all duration-300 cursor-pointer size-10  shadow-lg bg-blue border-blue text-white  '>
        <FaPlus className='size-6'  />
      </div>
      <div className='flex flex-col '>
        <h3 className='inter font-semibold'>{item.name}</h3>
        <div className='text-green font-bold'>+ €{item.price.toFixed(2)}</div>
        
        <ClientCustomDialog 
          open={isOpen}
          setOpen={setIsOpen}
          trigger={<span className='text-brown underline cursor-pointer w-full'>Learn more</span>} 
          content={
            <div className='flex flex-col '>
              <Image src={image} alt={item.name || 'Extra'} width={185} height={185} className='w-full h-[185px] lg:h-[230px] xl:h-[350px] rounded-lg object-cover mb-7' />
              <div className='flex  justify-between items-center mb-4'>
                <div className='font-semibold text-lg'>Price:</div>
                <div className='text-green font-bold text-xl'>+ €{item.price.toFixed(2)}<span className='text-base text-dark font-normal'> (per day)</span></div>
              </div>
              <p className='text-dark'>
                {item.description}
              </p>
            </div>
          } 
          title={item.name} 
        /> 
      </div>
    </div>
  )
}

export default ExtraCard
