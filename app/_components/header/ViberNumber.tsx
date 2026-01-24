import { TbBrandWhatsappFilled } from 'react-icons/tb'
import { cn } from '@/lib/utils'
const ViberNumber = ({ isWhite = false, className = '' }: { isWhite?: boolean, className?: string }) => {
  return (
    <a 
      href="https://wa.me/507767648570" 
      target="_blank" 
      rel="noopener noreferrer"
      className={cn('flex items-center ', isWhite && 'text-white', className )}
    >
      <TbBrandWhatsappFilled className={cn('size-6 text-[#4FA65F]', isWhite ? 'text-white' : 'text-[#4FA65F]')} />
      <span className='inter'>+5 077 6764 8570 </span>
    </a>
  )
}

export default ViberNumber