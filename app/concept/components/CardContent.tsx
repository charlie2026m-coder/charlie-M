import { useState } from 'react'
import Image from 'next/image'
import YellowCard from './YellowCard'
export default function CardContent({ images, description, card1, card2 }: { images: string[], description: string[], card1: string[] | undefined, card2: string[] | undefined }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  return (
    <div className='flex flex-col pt-5'>

      <div className='flex flex-col gap-7 mb-7'>
        <div className='relative w-full h-[250px] md:h-[400px] rounded-lg'>
          {images.map((image, index) => (
            <div key={index} className={`absolute inset-0 ${index === currentIndex ? 'block' : 'hidden'}`}>
              <Image
                width={600}
                height={300}
                src={image}
                alt={`Slide ${index + 1}`}
                className='object-contain h-full mx-auto'
              /> 
            </div>
          ))}
        </div>

        
        <div className='flex justify-center gap-2'>
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`size-3 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue' : 'bg-gray-300'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
      <div className='flex flex-col gap-5 mb-6'>
        {description.map((item) => (
          <p key={item} className={text}>{item}</p>
        ))}
      </div>
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