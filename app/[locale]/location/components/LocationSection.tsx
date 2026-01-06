import { FaLocationDot } from "react-icons/fa6";
import { FaBus } from "react-icons/fa";
import { BiSolidPlaneAlt } from "react-icons/bi";
import Image from "next/image";
import MapComponent from "./MapComponent";
const LocationSection = () => {
  return (
    <section className='px-4 md:px-10 xl:px-[100px] py-10 xl:py-20 grid grid-cols-1 md:grid-cols-2 container'>
      <div className='flex flex-col mb-[50px] md:mb-0'>
        <h1 className='flex items-center text-mute font-semibold text-[30px] md:text-[40px] mb-8'>
          Hotel Location
        </h1>
        <div className='flex flex-col gap-5 '>
          <address className='flex bg-white items-center rounded-4xl p-3  text-xl not-italic'>
            <FaLocationDot size={24} className='mr-2 text-black' /> Friedrichstraße 33, 10969 Berlin
          </address>
          <div className='flex bg-white gap-3 flex-col xl:flex-row xl:items-center rounded-4xl p-3 py-2.5  md:text-xl'>
            <div className='flex items-center'>
              <FaBus size={24} className='mr-2 text-black' /> Central Station (Hbf):
            </div>
            <div className='flex lg:ml-auto gap-2 lg:self-start'>
              <div className='text-black min-w-[115px] w-1/2 flex justify-center  md:w-full bg-blue flex items-center gap-1 rounded-full px-2 py-2 h-8 '>
                <FaBus className='size-6 text-black' /> 40 min
              </div>
              <div className='text-black flex min-w-[115px] w-1/2 flex justify-center  md:w-full items-center gap-1 bg-blue rounded-full px-2 py-2 h-8 '>
                <Image src='/images/taxi-icon.svg' alt='Taxi transportation' width={24} height={24} className='size-[24px]' />
                35 min
              </div>
            </div>
          </div>
          <div className='flex bg-white gap-3 flex-col xl:flex-row xl:items-center rounded-4xl p-3 py-2.5  md:text-xl'>
            <div className='flex items-center'>
              <BiSolidPlaneAlt size={24} className='mr-2 text-black' /> Berlin Brandenburg Airport (BER):
            </div>
            <div className='flex lg:ml-auto gap-2 lg:self-start'>
              <div className='text-black min-w-[115px] w-1/2 flex justify-center  md:w-full bg-blue flex items-center gap-1 rounded-full px-2 py-2 h-8 '>
                <FaBus  className='size-6 text-black' /> 40 min
              </div>
              <div className='text-black flex min-w-[115px] w-1/2 flex justify-center  md:w-full items-center gap-1 bg-blue rounded-full px-2 py-2 h-8 '>
                <Image src='/images/taxi-icon.svg' alt='Taxi transportation' width={24} height={24} className='size-[24px]' />
                35 min
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className=' md:pl-[50px] h-[210px] lg:h-auto'>
        <h2 className='sr-only'>Hotel location on map</h2>
        <MapComponent 
          width="100%" 
          height="100%" 
          image='/images/logo-map.svg'
          markerSize={80}
        />
      </div>
    </section>
  )
}

export default LocationSection

