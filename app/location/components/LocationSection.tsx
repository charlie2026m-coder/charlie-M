import Dot from "@/app/_components/ui/dot"
import { FaLocationDot } from "react-icons/fa6";
import { FaBus } from "react-icons/fa";
import { BiSolidPlaneAlt } from "react-icons/bi";
import { FaWalking } from "react-icons/fa";
import Image from "next/image";
import MapWindow from "@/app/_components/footer/MapWindow";



const LocationSection = () => {
  return (
    <div className='bg-blue'>
      <div className='flex flex-col container  px-4 md:px-10 xl:px-[100px] py-[60px] '>
        
        <div className='grid grid-cols-1 md:grid-cols-2 '>
          <div className='flex flex-col mb-[50px] md:mb-0'>
            <div className='flex items-center gap-2 font-semibold text-[30px] md:text-[40px] mb-[30px]'>
              <Dot size={20} color='brown'/>
              Location      
            </div>
            <div className='flex flex-col gap-5 '>
              <div className='flex bg-white items-center rounded-[40px] p-3  text-xl'>
                <FaLocationDot size={24} className='mr-2 text-brown' />
                Friedrichstraße 33, 10969 Berlin
              </div>
              <div className='flex bg-white items-center rounded-[40px] p-3  text-xl'>
                <FaBus size={24} className='mr-2 text-brown' />
                Central Station (Hbf):
                <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
                  13 min
                </div>
              </div>
              <div className='flex bg-white gap-3 flex-col xl:flex-row xl:items-center rounded-[40px] p-3 py-2.5  text-xl'>
                <div className='flex items-center'>
                  <BiSolidPlaneAlt size={24} className='mr-2 text-brown min-w-[24px] self-start mt-1' />
                  Berlin Brandenburg Airport (BER):
                </div>
                <div className='flex lg:ml-auto gap-2 lg:self-start'>
                  <div className='text-white min-w-[115px] w-1/2 flex justify-center  md:w-full bg-brown flex items-center gap-1 rounded-full px-2 py-2 h-8 '>
                    <FaBus size={24} className='mr-2 text-white' />
                    40 min
                  </div>

                  <div className='text-white flex min-w-[115px] w-1/2 flex justify-center  md:w-full items-center gap-1 bg-brown rounded-full px-2 py-2 h-8 '>
                    <Image 
                    src='/images/taxi-icon.png' 
                    alt='taxi' 
                    width={24} 
                    height={24} 
                    className='w-[24px] h-[24px]' 
                    />
                    35 min
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className=' md:pl-[50px]'>
            <MapWindow width="100%" height="420px" />
          </div>
          <Image src='/images/arrow-bottom-home.svg' alt='location' width={45} height={100} className='md:hidden w-[45px] h-[100px] object-cover my-[30px] mx-auto' />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2'>
          <div className='relative pb-[60px] mx-auto md:mx-0 xl:pb-[92px] w-full '>
              <Image 
                src='/images/location-2.jpg' 
                alt='location' 
                width={420} 
                height={461} 
                className='rounded-[30px] h-[232px] w-4/5 md:h-[350px] xl:h-[440px] object-cover' 
              />
                <Image 
                  src='/images/location-1.png' 
                  alt='location' 
                  width={330} 
                  height={330} 
                  className='rounded-[30px] absolute border-[8px] border-blue size-[172px] md:size-[280px] right-[10px] bottom-0 xl:size-[330px] object-cover' 
                />
              <Image 
                src='/images/arrow-bottom-left.png' 
                alt='arrow' 
                width={547} 
                height={880} 
                className='absolute hidden lg:block -top-10 -right-[30px] w-[100px] xl:w-[140px]' 
              />
          </div>

          <div className='flex-1 flex flex-col xl:pb-10'>
            <div className='flex items-center gap-2 font-semibold text-[30px] md:text-[40px] mb-[30px] mt-auto'>
              <Dot size={20} color='brown'/>
              Culture      
            </div>

            <div className='flex flex-col gap-5 '>
              <div className='flex bg-white items-center rounded-[40px] p-3  text-xl'>
                <FaWalking size={24} className='mr-2 text-brown' />
                Checkpoint Charlie
                <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
                  2 min
                </div>
              </div>
              <div className='flex bg-white items-center rounded-[40px] p-3  text-xl'>
                <FaWalking size={24} className='mr-2 text-brown' />
                Gendarmenmarkt
                <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
                  7 min
                </div>
              </div>
              <div className='flex bg-white items-center rounded-[40px] p-3 py-2.5  text-xl'>
                <FaWalking size={24} className='mr-2 text-brown' />
                Museum Island
                <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
                  15 min
                </div>
              </div>
            </div>
          
          </div>
        </div>

      </div>
    </div>
  )
}

export default LocationSection