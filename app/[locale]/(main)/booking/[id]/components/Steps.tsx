'use client'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const Steps = ({ currentStep }: { currentStep: number }) => {
  const t = useTranslations('bookingForm')
  const steps = [
    {
      index: 1,
      title: t('yourSelection'),
    },
    {
      index: 2,
      title: t('yourInfo'),
    },
    {
      index: 3,
      title: t('finish'),
    },
  ]
  
  return (
    <div className='relative flex items-center justify-between mb-6 lg:mb-[56px]'>
      <Item 
        active={steps[0].index === currentStep} 
        index={steps[0].index} 
        title={steps[0].title} 
      />
      <div className='absolute top-6  left-22 right-22  h-7 border-t border-gray' />
      <Item 
        active={steps[1].index === currentStep} 
        index={steps[1].index} 
        title={steps[1].title} 
      />
      <Item 
        active={steps[2].index === currentStep} 
        index={steps[2].index} 
        title={steps[2].title} 
      />
    </div>
  )
}

export default Steps;

const Item = ({ active, index, title }: { active: boolean, index: number, title: string }) => {
  return (
    <div 
      className={cn('flex flex-col items-center gap-2 w-[120px] z-10 sm:bg-white', active && 'font-[500]')}
    >
      <div className={cn('size-[51px] z-20 bg-white rounded-full flex items-center justify-center border border-brown', active && 'bg-blue border-blue')}>{index}</div>
      {title}
    </div>
  )
}