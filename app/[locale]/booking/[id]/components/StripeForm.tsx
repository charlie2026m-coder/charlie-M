import { cn } from '@/lib/utils'


const StripeForm = ({children, isChecked, onCheckedChange }: {children: React.ReactNode, isChecked: boolean, onCheckedChange: (checked: boolean) => void}) => {
  return (
    <div className={cn('w-full p-6 rounded-[20px] shadow-xl', isChecked ? 'bg-blue/10' : 'bg-white')}>
        {children}
        {
          isChecked && (
            <div className='flex h-[400px]'>
              
            </div>
          )
        }
    </div>
  )
}

export default StripeForm