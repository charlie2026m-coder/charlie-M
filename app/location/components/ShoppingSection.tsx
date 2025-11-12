import Dot from '@/app/_components/ui/dot'
import Image from 'next/image'
import { FaWalking } from 'react-icons/fa'
const ShoppingSection = () => {
  return (
    <div className='flex container'>

      <div className='w-1/2 pt-4 relative pb-[110px] mb-[55px]'>
        <Image 
          src='/images/arrow-bottom.png' 
          alt='shopping' 
          width={75} 
          height={165} 
          className='w-[75px] h-[165px] ml-[66px] mb-[30px]' 
        />
        <div className='pl-[100px]'>
          <div className='flex items-center gap-2 font-semibold text-[40px] mb-[30px] mt-auto'>
            <Dot size={20} color='blue'/>
            Shopping      
          </div>

          <div className='flex flex-col gap-5 mb-[80px]'>
            <div className='flex bg-white items-center rounded-[40px] p-3  text-xl'>
              <FaWalking size={24} className='mr-2 text-brown' />
              Mall of Berlin
              <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
                8 min
              </div>
            </div>
            <div className='flex bg-white items-center rounded-[40px] p-3  text-xl'>
              <FaWalking size={24} className='mr-2 text-brown' />
              Boutiques & Concept Stores
              <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
                8 min
              </div>
            </div>
          </div>
          <Image 
              src='/images/shopping-1.png' 
              alt='location' 
              width={420} 
              height={461} 
              className='rounded-[30px] w-[420px] h-[461px] object-cover' 
            />
            <div className='absolute bg-light-bg p-2 rounded-[30px] size-[338px] right-[10px] bottom-0 '>
              <Image 
                src='/images/shopping-2.jpg' 
                alt='location' 
                width={330} 
                height={330} 
                className='rounded-[30px] size-[330px] object-cover' 
              />
            </div>
          
        </div>
      </div>

      <div className='w-1/2 pt-20 flex-1 flex flex-col pl-4'>
        <Image 
          src='/images/shopping-3.jpg' 
          alt='shopping' 
          width={725} 
          height={496} 
          className='w-[725px] h-[496px] object-cover rounded-[30px] translate-x-6 mb-auto' 
        />
        <div className='flex items-center gap-2 font-semibold text-[40px] mb-[30px] '>
          <Dot size={20} color='blue'/>
          Food and Drink      
        </div>

        <div className='flex flex-col gap-5 pr-[100px]'>
          <div className='flex bg-white items-center rounded-[40px] p-3  text-xl'>
            <FaWalking size={24} className='mr-2 text-brown' />
            Cafes & Bars
            <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
              10 min
            </div>
          </div>
          <div className='flex bg-white items-center rounded-[40px] p-3  text-xl'>
            <FaWalking size={24} className='mr-2 text-brown' />
            Rooftop & Terraces
            <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
              10 min
            </div>
          </div>
        </div>
        <Image 
          src='/images/arrow-top.svg' 
          alt='shopping' 
          width={75} 
          height={165} 
          className='w-[75px] h-[165px] mt-5 mb-4 ml-auto mr-[66px]' 
        />
      </div>


    </div>
  )
}

export default ShoppingSection