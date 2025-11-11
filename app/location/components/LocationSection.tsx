import Dot from "@/app/_components/ui/dot"
import { FaLocationDot } from "react-icons/fa6";
import { FaBus } from "react-icons/fa";
import { BiSolidPlaneAlt } from "react-icons/bi";
import { FaWalking } from "react-icons/fa";
import Image from "next/image";



const LocationSection = () => {
  return (
    <div className='bg-blue'>
      <div className='container px-[100px] py-[60px] flex flex-col'>
        
        <div className='flex flex-col  w-1/2'>
          <div className='flex items-center gap-2 font-semibold text-[40px] mb-[30px]'>
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
              Central Station (Hbf): 10 min
              <div className='text-white bg-brown rounded-full px-2 py-1 ml-auto'>
                13 min
              </div>
            </div>
            <div className='flex bg-white items-center rounded-[40px] p-3 py-2.5  text-xl'>
              <BiSolidPlaneAlt size={24} className='mr-2 text-brown' />
              Berlin Brandenburg Airport (BER):
              <div className='text-white bg-brown flex items-center gap-1 rounded-full px-2 py-2 h-8 ml-auto'>
                <FaBus size={24} className='mr-2 text-white' />
                40 min
              </div>
              <div className='text-white flex items-center gap-1 bg-brown rounded-full px-2 py-2 h-8 ml-2'>
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

          <div className='relative pt-[115px] pb-[92px]'>
            <Image 
              src='/images/location-1.png' 
              alt='location' 
              width={420} 
              height={461} 
              className='rounded-[30px] w-[420px] h-[461px] object-cover' 
            />
            <div className='absolute bg-blue p-2 rounded-[30px] size-[338px] right-[10px] bottom-0 '>
              <Image 
                src='/images/location-2.jpg' 
                alt='location' 
                width={330} 
                height={330} 
                className='rounded-[30px] size-[330px] object-cover' 
              />
            </div>
            <Image 
              src='/images/arrow-bottom-left.png' 
              alt='arrow' 
              width={547} 
              height={880} 
              className='absolute top-[85px] -right-[50px] w-[150px]' 
            />
          </div>
        </div>
        <div className='w-1/2'>
        
        
        </div>


      </div>
    </div>
  )
}

export default LocationSection