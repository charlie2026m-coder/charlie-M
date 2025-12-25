import { cn } from '@/lib/utils'

const PaymentCard = ({children, isChecked }: {children: React.ReactNode, isChecked: boolean}) => {
  return (
    <div className={cn('w-full p-6 rounded-[20px] shadow-xl', isChecked ? 'bg-blue/10' : 'bg-white')}>
        <div className='flex items-center gap-3 '>{children}</div>

        <div className={cn('flex mt-[30px] bg-blue overflow-hidden transition-all duration-300 ease-in-out',isChecked ? 'h-[400px] opacity-100' : 'h-0 opacity-0 m-0')}>
          fdsfasfsafd
        </div>
    </div>
  )
}

export default PaymentCard