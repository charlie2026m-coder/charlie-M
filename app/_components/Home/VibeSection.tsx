import Image from 'next/image'
import { FaLocationDot } from "react-icons/fa6";
import { FaBus } from "react-icons/fa";
import { BiSolidPlaneAlt } from "react-icons/bi";
import { FaWalking } from "react-icons/fa";
import VibeSlider from './VibeSlider';


const VibeSection = () => {
  return (
    <div className='bg-blue w-full flex flex-col items-center py-8 '>
      <div className='container flex mb-10'> 
        <div className='w-1/2 relative h-[560px] -translate-x-[50px]'>
          <Image src='/images/vibe-poster-1.jpg' alt='vibe' width={681} height={484} className='rounded-[40px] w-[681px] h-[484px]' />  
          <Image src='/images/vibe-poster-2.png' alt='vibe' width={345} height={350} className=' absolute -right-[71px] bottom-0 rounded-[40px] w-[345px] h-[350px]' />  
        </div>
        
        <div className='w-1/2 relative'>
          <h2 className='text-6xl font-bold jakarta w-4/5 mb-6 leading-[1.2]'>Feel the vibe in the heart of Berlin</h2>
          <div className='flex -translate-x-[70px]'>
            <Image src='/images/vibe-arrow.png' alt='vibe' width={206} height={184} className='  w-[206px] h-[184px]' /> 

            <ul className='flex flex-col gap-4'>
                <li className='flex items-center gap-2 text-lg'>
                  <FaLocationDot className=' size-6' />
                  Friedrichstraße 33, 10969 Berlin
                </li>
                <li className='flex items-center gap-2 text-lg'>
                  <FaBus className=' size-6' />
                  Central Station (Hbf): 10 min by S-Bahn                
                </li>
                <li className='flex flex-col '>
                  <div className='flex items-center gap-2 text-lg mb-1'>
                    <BiSolidPlaneAlt className=' size-6' />
                    Berlin Brandenburg Airport (BER):
                  </div>
                  <div className='flex flex-col  ml-8'>
                      <div className='flex items-center gap-2'>
                        <div className='size-2.5 rounded-full bg-white' />
                        <span  className=''>40 min by public transport</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='size-2.5 rounded-full bg-white' />
                        <span  className=''>35 min by taxi</span>
                      </div>
                    </div>
                </li>
            </ul>
          </div>

          <div className='grid grid-cols-2 gap-4 w-4/5 ml-10 pt-2'>
            {cards.map((card) => (
              <div key={card.title} className='flex gap-2.5 items-center bg-white px-3 py-2 rounded-full'>
                <FaWalking className='text-brown size-6' />
                <h3 className='text-lg '>{card.title}</h3>
                <div className='px-2 py-1 rounded-full bg-brown text-white ml-auto'>{card.time} min</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <VibeSlider images={images} />
    </div>
  )
}
export default VibeSection;

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