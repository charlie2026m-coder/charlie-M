import Image from 'next/image'
import { cn } from '@/lib/utils'

const Header = ({ title, size = "lg", isThin = false }: { title: string, size?: "sm" | "md" | "lg", isThin?: boolean }) => {
  return (
    <div className='flex items-center gap-2 md:gap-4 lg:gap-7 mb-3 md:mb-4 mx-auto'>
      <Image 
        src='/images/left.svg' 
        alt='rooms icon' 
        width={135} 
        height={16} 
        className='w-[50px] h-[6px] md:w-[90px] md:h-[12px] lg:w-[135px] lg:h-[16px]' 
      />
      <h2 className={cn('font-bold jakarta text-center', 
        size === 'sm' 
          ? 'text-sm md:text-lg' 
          : size === 'md' 
            ? 'text-lg md:text-[40px]' 
            : 'text-2xl md:text-2xl lg:text-[50px]', 
        isThin && 'font-normal'
      )}>{title}</h2>
      <Image 
        src='/images/right.svg' 
        alt='rooms icon' 
        width={135} 
        height={16} 
        className='w-[50px] h-[6px] md:w-[90px] md:h-[12px] lg:w-[135px] lg:h-[16px]' 
      />
    </div>
  )
}

export default Header