import Image from 'next/image'
import { FaLocationDot } from "react-icons/fa6";
import { FaBus } from "react-icons/fa";
import { BiSolidPlaneAlt } from "react-icons/bi";
import { FaWalking } from "react-icons/fa";


const VibeSection = () => {
  return (
    <div className='bg-light1 w-full flex flex-col relative'>
      <Image 
        src='/images/vide-image.webp' 
        alt='vibe' 
        width={680} 
        height={730} 
        className='hidden lg:block object-cover absolute top-0 bottom-0 left-0 w-[47%] h-full' 
      /> 
      <div className='container grid lg:grid-cols-2 gap-10'>
        <div className='col-span-1'></div>
        <div className='col-span-1 pt-11 lg:py-15  lg:pr-0 lg:pr-[100px]'>
          <h2 className='text-4xl  xl:p-0 md:text-6xl px-3 lg:px-0 font-bold jakarta  mb-6 leading-[1.2]'>Feel the vibe in the heart of Berlin</h2>
          <div className='flex w-full xl:p-0 xl:-translate-x-[50px]'>
            <Image src='/images/vibe-arrow.png' alt='vibe' width={206} height={184} className='hidden lg:block  w-[103px] xl:w-[206px] h-[92px] xl:h-[184px]' /> 

            <ul className='flex flex-col gap-4 mb-8 lg:mx-auto px-3 lg:px-0'>
                <li className='flex items-center gap-2 text-lg'>
                  <FaLocationDot className=' size-6' />
                  Friedrichstraße 33, 10969 Berlin
                </li>
                 

                <li className='flex items-center gap-2 text-lg'>
                  <FaBus className='size-6' />
                  Central Station (Hbf): 10 min                
                </li>
                <div className='flex'>
                  <div className='text-mute bg-blue flex items-center gap-1 rounded-full px-2 py-2 h-8 '>
                    <FaBus size={24} className='mr-2 text-mute' />
                    15 min
                  </div>
                  <div className='text-mute flex items-center gap-1 bg-blue rounded-full px-2 py-2 h-8 ml-2'>
                    <Image 
                    src='/images/taxi-icon.svg' 
                    alt='taxi' 
                    width={24} 
                    height={24} 
                    className='w-[24px] h-[24px]' 
                    />
                    10 min
                  </div>
                </div>
                <li className='flex flex-col '>
                  <div className='flex items-center gap-2 text-lg mb-3'>
                    <BiSolidPlaneAlt className=' size-6' />
                    Berlin Brandenburg Airport (BER):
                  </div>
                  <div className='flex'>
                    <div className='text-mute bg-blue flex items-center gap-1 rounded-full px-2 py-2 h-8 '>
                      <FaBus size={24} className='mr-2 text-mute' />
                      40 min
                    </div>
                    <div className='text-mute flex items-center gap-1 bg-blue rounded-full px-2 py-2 h-8 ml-2'>
                      <Image 
                      src='/images/taxi-icon.svg' 
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
          <Image 
            src='/images/vide-image.webp' 
            alt='vibe' 
            width={375} 
            height={232} 
            className='lg:hidden object-cover w-full object-bottom h-[232px]' 
          /> 
          <Image src='/images/arrow-bottom-home.svg' alt='vibe' width={206} height={184} className='lg:hidden  w-10  h-20 my-2 mx-auto' /> 

          <div className='hidden lg:block'>
            <Cards />
          </div>
        </div>
      </div>

      <div className='lg:hidden px-3 w-full mb-8'>
        <Cards />
      </div>
      {/* <VibeSlider images={images} /> */}
    </div>
  )
}
export default VibeSection;

const Cards = () => {
  return (
    <div className='grid xl:grid-cols-2 gap-4 w-full  pt-2'>
      {cards.map((card) => (
        <div key={card.title} className='flex gap-2.5  items-center bg-white px-3 py-2 rounded-full'>
          <FaWalking className='text-brown size-6' />
          <h3 className='text-lg'>{card.title}</h3>
          <div className='px-2 py-1 rounded-full bg-blue text-mute ml-auto self-start min-w-[65px] text-center'>{card.time} min</div>
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