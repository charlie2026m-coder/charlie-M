import Image from 'next/image'
import { FaLocationDot } from "react-icons/fa6";
import { FaBus } from "react-icons/fa";
import { BiSolidPlaneAlt } from "react-icons/bi";
import { FaWalking } from "react-icons/fa";
import VibeSlider from './VibeSlider';


const VibeSection = () => {
  return (
    <div className='bg-blue w-full flex flex-col items-center py-8 '>
      <div className='container flex flex-col-reverse lg:grid lg:grid-cols-2 md:mb-10'> 
        <div className='relative md:h-[560px] lg:-translate-x-[50px] px-3 lg:px-0'>
          <Image src='/images/vibe-poster-1.jpg' alt='vibe' width={681} height={484} className='rounded-[40px] w-[90%] h-full md:h-[440px]  object-cover mr-3' />  
          <Image src='/images/vibe-poster-2.png' alt='vibe' width={345} height={350} className='absolute right-3   lg:-right-[71px] md:bottom-0 bottom-20 rounded-xl lg:rounded-[40px] md:w-[345px] w-1/3 ' /> 
          <Image 
            src='/images/arrow-bottom-home.svg' 
            alt='shopping' 
            width={75} 
            height={165} 
            className='w-[60px] mx-auto lg:hidden mt-2' 
          /> 
        </div>

        <div className='relative'>
          <h2 className='text-4xl px-3 xl:p-0 md:text-6xl font-bold jakarta xl:w-4/5 mb-6 leading-[1.2]'>Feel the vibe in the heart of Berlin</h2>
          <div className='flex px-3 xl:p-0 lg:-translate-x-[70px]'>
            <Image src='/images/vibe-arrow.png' alt='vibe' width={206} height={184} className='hidden lg:block  w-[206px] h-[184px]' /> 

            <ul className='flex flex-col gap-4 mb-[50px] mx-auto'>
                <li className='flex items-center gap-2 text-lg'>
                  <FaLocationDot className=' size-6' />
                  Friedrichstraße 33, 10969 Berlin
                </li>
                <li className='flex items-center gap-2 text-lg'>
                  <FaBus className=' size-6' />
                  Central Station (Hbf): 10 min                
                </li>
                <li className='flex flex-col '>
                  <div className='flex items-center gap-2 text-lg mb-3'>
                    <BiSolidPlaneAlt className=' size-6' />
                    Berlin Brandenburg Airport (BER):
                  </div>
                  <div className='flex'>
                    <div className='text-white bg-brown flex items-center gap-1 rounded-full px-2 py-2 h-8 '>
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
                </li>
            </ul>
          </div>
          <div className='hidden lg:block'>
            <Cards />
          </div>
        </div>

      </div>
      <div className='lg:hidden block w-full mb-8'>
        <Cards />
      </div>
      <VibeSlider images={images} />
    </div>
  )
}
export default VibeSection;

const Cards = () => {
  return (
    <div className='grid xl:grid-cols-2 gap-4 w-4/5 xl:w-[90%] 2xl:w-4/5 ml-10 pt-2'>
      {cards.map((card) => (
        <div key={card.title} className='flex gap-2.5  items-center bg-white px-3 py-2 rounded-full'>
          <FaWalking className='text-brown size-6' />
          <h3 className='text-lg '>{card.title}</h3>
          <div className='px-2 py-1 rounded-full bg-brown text-white ml-auto'>{card.time} min</div>
        </div>
      ))}
    </div>
  )
}

const images = [
  '/images/street-1.png',
  '/images/street-2.png',
  '/images/street-3.png',
  '/images/street-2.png',
  '/images/street-1.png',
]


const cards = [
  {
    title: 'Checkpoint Charlie',
    time: 2,
  },
  {
    title: 'Potsdamer Platz',
    time: 10,
  },
  {
    title: 'Museum Island',
    time: 15,
  },
  {
    title: 'Gendarmenmarkt',
    time: 7,
  },
  {
    title: 'Brandenburg Gate',
    time: 15,
  },
  {
    title: 'Alexanderplatz',
    time: 15,
  },
]