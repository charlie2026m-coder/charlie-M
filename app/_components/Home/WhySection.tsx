import Image from 'next/image'
import { PiCityLight, PiArmchairLight } from "react-icons/pi";
import { IoSettingsOutline } from "react-icons/io5";
import { AiOutlineLike } from "react-icons/ai";

const WhySection = () => {

  return (
    <div className='w-full flex flex-col pb-[85px]'>
      <div className='flex items-center gap-2 mb-12'>
        <div className='size-5 rounded-full bg-blue'/>
        <h2 className='font-medium text-[40px]'>Why Charlie M</h2>
      </div>

      <div className='flex gap-10 '>
        <div className='flex relative w-2/5 '>
          <Image 
            src='/images/why-image.jpg' 
            alt='why1' 
            width={475} 
            height={450} 
            className='rounded-[20px] object-cover w-[475px] h-[450px] z-10'
          />
          <div className='absolute top-2 left-2 w-[475px] h-[450px] bg-blue rounded-[20px] ' />
        </div>
        <div className='flex flex-col w-3/5'>
          <p className='text-dark mb-5 text-[15px] inter'>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          <p className='text-dark mb-5 text-[15px] inter'>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          <div className='grid grid-cols-2 gap-6'>
            {cards.map((card) => (
              <div key={card.title} className='flex px-6 items-center h-[100px] rounded-lg border border-brown gap-2.5 hover:border-blue hover:bg-blue transition-all duration-300 '>
                <div className='size-[50px] min-w-[50px]  rounded-full bg-brown flex items-center self-center justify-center'>
                  {card.icon}
                </div>
                <div className='flex flex-col'>
                  <h3 className='font-medium '>{card.title}</h3>
                  <p className='text-sm'>{card.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
  </div>
  )
}

export default WhySection;

const icon = 'text-white size-6'
const cards = [
  {
    title: "Central Berlin",
    text: "Friedrichstraße 33, only steps from Checkpoint Charlie.",
    icon: <PiCityLight className={icon} />

  },
  {
    title: "Self Check-in",
    text: "Fully automated in 60 seconds",
    icon: <IoSettingsOutline className={icon} />

  },
  {
    title: "Modern Comfort",
    text: "Historic charm meets smart design",
    icon: <PiArmchairLight className={icon} />

  },

  {
    title: "Flexible Stay",
    text: "One night or six months — always home",
    icon: <AiOutlineLike className={icon} />

  },
]