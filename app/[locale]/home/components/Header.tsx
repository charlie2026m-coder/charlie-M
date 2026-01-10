import Image from 'next/image'
import { cn } from '@/lib/utils'

const Header = ({ title, size = "lg" }: { title: string, size?: "sm" | "md" | "lg" }) => {
  return (
    <div className='flex items-center gap-7 mb-4 mx-auto'>
      <Image src='/images/left.svg' alt='rooms icon' width={135} height={16} />
      <h2 className={cn('font-bold jakarta', size === 'sm' ? 'text-[30px]' : size === 'md' ? 'text-[40px]' : 'text-[50px]')}>{title}</h2>
      <Image src='/images/right.svg' alt='rooms icon' width={135} height={16} />
    </div>
  )
}

export default Header