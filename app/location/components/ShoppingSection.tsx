import Dot from '@/app/_components/ui/dot'
import Image from 'next/image'
import { FaWalking } from 'react-icons/fa'
const ShoppingSection = () => {
  return (
    <div className='container'>

      <div className='flex flex-col lg:flex-row  pt-4 relative px-4 md:px-10 xl:px-0'>
        <div className='w-full lg:w-1/2 '>

          <Image 
            src='/images/arrow-bottom.png' 
            alt='shopping' 
            width={75} 
            height={165} 
            className='w-[75px] h-[165px] ml-[66px] mb-[30px]' 
          />

          <div className=' xl:pl-[100px]'>
            <div className='flex items-center gap-2 font-semibold text-[40px] mb-6 lg:mb-[30px] mt-auto'>
              <Dot size={20} color='blue'/>
              Shopping      
            </div>

            <div className=' flex-col gap-5 hidden lg:flex'>
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
            
          </div>
        </div>
        <Image 
          src='/images/shopping-1.png' 
          alt='shopping' 
          width={725} 
          height={496} 
          className='w-full lg:w-1/2  lg:mt-16 h-[496px] object-cover rounded-[30px] lg:translate-x-6 mb-auto mx-auto md:mx-0' 
        />
        <div className=' flex-col gap-5 flex lg:hidden mt-6'>
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
      </div>
      <div className="flex flex-col lg:flex-row ">
        <div className='flex flex-col lg:hidden '>
          <Image 
            src='/images/arrow-bottom-left-brown.svg' 
            alt='shopping' 
            width={75} 
            height={165} 
            className='w-[75px] h-[165px] mr-[66px]  self-end' 
          />
          <div className='px-4 flex items-center gap-2 font-semibold text-[40px] mb-[30px] '>
            <Dot size={20} color='blue'/>
            Food and Drink      
          </div>


        </div>
        <div className='flex flex-col lg:flex-row w-full relative px-4 md:px-10 xl:px-0 lg:w-1/2 mb-[60px]'>
        
          <Image 
            src='/images/shopping-2.jpg' 
            alt='location' 
            width={420} 
            height={461} 
            className='rounded-[30px] lg:h-[461px] w-3/4 object-cover lg:-translate-y-[60px] mb-20 lg:mb-10' 
          />
          <Image 
            src='/images/shopping-3.jpg' 
            alt='location' 
            width={330} 
            height={330} 
            className='rounded-[30px] right-0 bottom-0 border-[8px] border-light-bg absolute w-1/2 lg:h-[330px] object-cover' 
          />
        </div>
        <div className=' flex-1 flex flex-col pl-4 mb-8 lg:mb-0 mt-auto'>
          
          <div className='hidden lg:flex items-center gap-2 font-semibold text-[40px] mb-[30px] '>
            <Dot size={20} color='blue'/>
            Food and Drink      
          </div>

          <div className='flex flex-col gap-5 lg:pr-[100px]'>
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
            className='w-[75px] hidden lg:block h-[165px] mt-5 mb-4 ml-auto mr-[66px]' 
          />
        </div>
      </div>

    </div>
  )
}

export default ShoppingSection