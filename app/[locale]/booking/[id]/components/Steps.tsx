'use client'
import { cn } from '@/lib/utils'
import { useRouter, useParams } from 'next/navigation'

const Steps = ({ currentStep }: { currentStep: number }) => {
  const router = useRouter()
  const urlParams = useParams()
  
  const steps = [
    {
      index: 1,
      title: 'Your Selection',
      path: `/${urlParams.locale}/booking/${urlParams.id}`,
    },
    {
      index: 2,
      title: 'Your Info',
      path: `/${urlParams.locale}/booking/${urlParams.id}/payment`,
    },
    {
      index: 3,
      title: 'Finish',
      path: `/${urlParams.locale}/booking/${urlParams.id}/success`,
    },
  ]
  
  return (
    <div className='relative flex items-center justify-between mb-6 lg:mb-[56px]'>
      <Item 
        active={steps[0].index === currentStep} 
        index={steps[0].index} 
        title={steps[0].title} 
        onClick={() => router.push(steps[0].path)} 
      />
      <div className='absolute top-6  left-22 right-22  h-7 border-t border-gray' />
      <Item 
        active={steps[1].index === currentStep} 
        index={steps[1].index} 
        title={steps[1].title} 
        onClick={() => router.push(steps[1].path)} 
      />
      <Item 
        active={steps[2].index === currentStep} 
        index={steps[2].index} 
        title={steps[2].title} 
        onClick={() => router.push(steps[2].path)} 
      />
    </div>
  )
}

export default Steps;

const Item = ({ active, index, title, onClick }: { active: boolean, index: number, title: string, onClick: () => void }) => {
  return (
    <div 
      className={cn('flex flex-col items-center gap-2 w-[120px] z-10 sm:bg-white cursor-pointer', active && 'font-[500]')}
      onClick={onClick}
    >
      <div className={cn('size-[51px] z-20 bg-white rounded-full flex items-center justify-center border border-brown', active && 'bg-blue border-blue')}>{index}</div>
      {title}
    </div>
  )
}