import { FaPlus } from "react-icons/fa6";
import Image from 'next/image'
const ExtraCard = ({ item, setExtra }: { item: { image: string, title: string, price: number }, setExtra: (extra: { image: string, title: string, price: number }) => void }) => {

  return (
    <div className='flex flex-col gap-'>
      <div className='relative mb-2'>
        <Image 
          src={item.image} 
          alt={item.title} 
          width={185} 
          height={185} 
          className='w-full h-[185px] rounded-lg object-cover'
        />
        <div className='absolute rounded-full hover:bg-green/70 transition-all duration-300 cursor-pointer size-[33px] top-2.5 right-2.5 bg-green text-white flex items-center justify-center '>
          <FaPlus className='size-5' onClick={() => setExtra(item)} />
        </div>
      </div>
      <h3 className='inter '>{item.title}</h3>
      <div className='text-green font-bold'>+ €{item.price}</div>
      <span className='text-brown underline cursor-pointer'>Learn more</span>
    </div>
  )
}

export default ExtraCard