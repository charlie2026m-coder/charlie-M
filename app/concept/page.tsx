import Image from 'next/image'
import { LuCircleCheckBig } from 'react-icons/lu'
import { IoCalendarOutline } from 'react-icons/io5'
import { BsChatDots } from 'react-icons/bs'
import InfoCard from './components/infoCard'
import CheckInForm from '../_components/Home/CheckInForm'
const icon = 'size-6'
export default function Concept() {
  return (
    <div className='flex flex-1 bg-light-bg flex-col pb-10'>
      <div className='flex flex-col container gap-10 lg:gap-[70px] pb-10 lg:pb-21'>
        <div className='grid grid-cols-5 gap-6 lg:gap-12 py-10 lg:py-[70px] px-4 md:px-10 xl:px-25 '>
          <div className='col-span-5 lg:col-span-3 flex flex-col justify-center'>
            <h1 className='jakarta font-bold text-mute text-[40px] md:text-[50px] lg:text-6xl mb-5'>The Charlie M Concept</h1>
            <p className='text-mute text-[25px] font-semibold w-4/5 mb-5 lg:mb-[50px]'>Your time matters, so we designed a stay that respects it.</p>
            <div className='flex flex-col gap-5 rounded-[20px] px-8 py-10 bg-blue/20'>
              <p className='text-dark text-md mb-2 inter'>
              <b>Charlie</b> is built around an idea: travel should feel easy — from digital check-in to keyless access and a reception-free setup. With thoughtfully designed rooms and responsive 24/7 digital support, your stay becomes smooth, modern, and refreshingly uncomplicated.           </p>
            </div>
          </div>
          <div className='col-span-5 lg:col-span-2 relative'>
            <div className='absolute top-0 right-0 w-full h-full max-h-[405px] bg-blue rounded-[20px] z-10 translate-y-2 translate-x-2'></div>
            <Image 
              className='rounded-[20px]  object-cover w-full h-full max-h-[240px] lg:max-h-[405px] relative z-20'
              src='/images/concept-image.webp' 
              alt='concept' 
              width={465} 
              height={405} 
            />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-x-4 gap-y-6 px-4 md:px-10 xl:px-25'>
          {cards.map((card) => (
            <div key={card.title} className='group flex flex-col items-center md:flex-row px-5 py-6 items-center  rounded-lg border border-[#EBEBEB] gap-2.5 hover:border-blue hover:bg-blue transition-all duration-300 '>
              <div className='size-[50px] min-w-[50px] group-hover:bg-white rounded-full bg-blue flex items-center self-center justify-center transition-all duration-300'>
                {card.icon}
              </div>
              <div className='flex flex-col items-center md:items-start'>
                <h3 className='font-medium text-center md:text-start'>{card.title}</h3>
                <p className='text-sm text-center md:text-start'>{card.text}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
      <div className='flex flex-col bg-blue/20'>
          <div className='flex flex-col container py-12 px-4 md:px-10 xl:px-25'>
            <h2 className='font-semibold text-mute text-[30px] md:text-[40px] mb-8 lg:mb-13'>The Charlie M experience </h2>
            <div className='grid grid-cols-2 gap-x-4 gap-y-6'>
              {infoCards.map((card) => (
                <InfoCard key={card.id} card={card} />
              ))}
            </div>
          </div>
      </div>
      <div className='flex flex-col container pt-8 lg:pt-18 px-4 md:px-10 xl:px-25'>
        <h2 className='font-semibold text-mute text-[40px] mb-5'>Charlie M Extras</h2>
        <div className='text-mute text-[24px] flex items-center gap-2 mb-10'>
          <Image src='/images/money-icon.svg' alt='extra' width={24} height={24} className="size-6"/>
          Extra paid services
        </div>
        <div className='grid grid-cols-2  lg:grid-cols-3 xl:grid-cols-5 gap-5'>
          {extras.map((extra, item) => (
            <div key={extra.title} className={`flex flex-col items-center py-10 px-1 bg-blue rounded-[20px] ${item === 4 && 'col-span-2 md:col-span-1' }`}>
              <div className='size-25 bg-white rounded-full flex items-center self-center justify-center mb-3'>
                {extra.icon}
              </div>
              <h3 className='font-bold text-center mb-3 text-[24px]'>{extra.title}</h3>
              <p className='text-center '>{extra.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className='w-full h-[250px] md:h-[65px] '>
        <div className='container px-4 lg:px-[100px] py-10'>
          <CheckInForm isBrown={true} />
        </div>
      </div>

    </div>
  )
}

const cards = [
  {
    title: "Online check-in",
    text: "no reception, no waiting.",
    icon: <LuCircleCheckBig className={icon} />

  },
  {
    title: "Room access via smart code ",
    text: "simple, secure, and always at hand.",
    icon: <Image src='/images/lock-icon.svg' className='object-cover size-6' width={24} alt='lock-image' height={24}/>
  },
  {
    title: "Privacy & independence",
    text: "a calm stay without unnecessary interruptions.",
    icon: <IoCalendarOutline className={icon} />

  },

  {
    title: "Instant support",
    text: "quick help via chat whenever you need it.",
    icon: <BsChatDots className={icon} />

  },
]

const infoCards = [
  {
    id: 1,
    title: "Co-Working Space",
    subTitle: "A quiet spot to focus, complete with a coffee station.",
    icon: <Image src='/images/co-working-icon.svg' className='object-cover size-9' width={35} alt='concept-image' height={35}/>
  },
  {
    id: 2,
    title: "Luggage Lockers",
    subTitle: "Secure storage before check-in or after check-out.",
    icon: <Image src='/images/luggage-icon.svg' className='object-cover size-9' width={35} alt='concept-image' height={35}/>
  },
  {
    id: 3,
    title: "Self-Service Closet",
    subTitle: "Fresh towels, toiletries & room essentials available anytime.",
    icon: <Image src='/images/closet-icon.svg' className='object-cover size-9' width={35} alt='concept-image' height={35}/>
  },
  {
    id: 4,
    title: "Laundry Room",
    subTitle: "Wash & dry whenever you need.",
    icon: <Image src='/images/laundry-icon.svg' className='object-cover size-9' width={35} alt='concept-image' height={35}/>
  },
  {
    id: 5,
    title: "In-Room Coffee Machine",
    subTitle: "Coffee capsules included for your stay.",
    icon: <Image src='/images/coffee-m-icon.svg' className='object-cover size-9' width={35} alt='concept-image' height={35}/>
  },
  {
    id: 6,
    title: "Fast WiFi",
    subTitle: "Reliable high-speed connection throughout the building.",
    icon: <Image src='/images/wifi-icon.svg' className='object-cover size-9' width={35} alt='concept-image' height={35}/>
  },

]

const extras = [
  {
    title: "Parking",
    description: "Private on-site parking (maximum 10 parking places)",
    icon: <Image src='/images/car-icon.svg' className='object-cover size-12' width={45} alt='concept-image' height={45}/>
  },
  {
    title: "Breakfast",
    description: "Fresh breakfast options  from our partners next to co-working space",
    icon: <Image src='/images/food-icon.svg' className='object-cover size-12' width={45} alt='concept-image' height={45}/>
  },
  {
    title: "Additional Cleaning",
    description: "Extra room cleaning during your stay",
    icon: <Image src='/images/clean-icon.svg' className='object-cover size-12' width={45} alt='concept-image' height={45}/>
  },
  {
    title: "Early Check-In and Late Check-Out",
    description: "Arrive earlier and settle in stress-free or extend your departure and relax longer ",
    icon: <Image src='/images/checkin-icon.svg' className='object-cover size-12' width={45} alt='concept-image' height={45}/>
  },
  {
    title: "Pets",
    description: "Bring your furry friend along — we’re happy to host them too!",
    icon: <Image src='/images/pets-icon.svg' className='object-cover size-12' width={45} alt='concept-image' height={45}/>
  },

]