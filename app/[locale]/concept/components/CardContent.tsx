//Modal window for dynamic content depends of info items

import Image from 'next/image'
import YellowCard from './YellowCard'
import CustomImageSlider from '@/app/_components/ui/CustomImageSlider'
import { TbBrandWhatsappFilled } from 'react-icons/tb'
import { IoMail } from 'react-icons/io5'
export default function CardContent({ 
  images, 
  description,
  card1, 
  card2, 
  id
}: { 
  images: string[], 
  description: string[], 
  card1: string[] | undefined, 
  card2: string[] | undefined, 
  id: number
}) {

  return (
    <div className='flex flex-col pt-5'>
      {images.length > 1 && (<CustomImageSlider images={images} />)}
      {images.length === 1 && (
        <Image src={images[0]} alt='image' width={600} height={300} className='w-full h-[250px] md:h-[400px] rounded-lg mb-5' />
      )}
      <div className='flex flex-col gap-5 mb-6'>
        {description.map((item) => (
          <p key={item} className={text}>{item}</p>
        ))}
      </div>
      
      {/* Only for Lost and Found and Garbage disposal cards */}
      {id === 7 && <LostCards />}

      {/* Only for Garbage disposal cards */}
      {id === 9 && <GarbageCards />}

      
        {card1 && (
          <>
            {(!card2) ? (
              <YellowCard isFirst={true} items={card1} />
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <YellowCard isFirst={true} items={card1} />
                <YellowCard isFirst={false} items={card2} />
              </div>
            )}

          </>
        )}
    </div>
  )
}

const text = 'text-dark inter text-start'


//Different cards content for Lost and Found card content 
const LostCards = () => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <div className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2 w-full'>
        <h4 className='font-semibold mb-2 w-full'>Lost something during your stay?</h4>
        <p className='text-dark inter '>Don’t worry — we’re here to help. If you've misplaced an item in your room or anywhere in the building, contact us and we’ll check if it has been found.</p>
      </div>
      <div className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2 w-full'>
        <h4 className='font-semibold mb-2  w-full'>How to reach us:</h4>
        <a
          href='https://wa.me/49XXXXXXXXX' 
          target='_blank' 
          rel='noopener noreferrer'
          className='flex items-center gap-2  rounded-3xl w-full cursor-pointer mb-3 hover:underline'
        >
          <TbBrandWhatsappFilled className='size-6' /> <span>WhatsApp:</span> +49 XXX XXXX XXX
        </a>
        <a 
          href='mailto:hello@charliem.stay'
          className='flex items-center gap-2 rounded-3xl w-full cursor-pointer hover:underline'
        >
          <IoMail className='size-6' /> <span>Email:</span> hello@charliem.stay
        </a>
      </div>
    </div>
  )
}

//Different cards content for Garbage disposal card content
const GarbageCards = () => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <div className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2 w-full'>
        <h4 className='font-semibold mb-2 w-full'>You can dispose of your trash on the –</h4>
        <p className='text-dark inter '>1 floor, where you’ll find clearly marked bins for general waste and recycling. Fresh bags and small disposal bins are also available in the Self-Service Closet if you need them.</p>
      </div>
      <YellowCard isFirst={false} items={['Located on the –1 floor']} />
    </div>
  )
}