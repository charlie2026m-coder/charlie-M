'use client'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'

const Steps = () => {
  const { bookingPage } = useStore()
  const steps = [
    {
      index: 1,
      title: 'Your Selection',
    },
    {
      index: 2,
      title: 'Your Info',
    },
    {
      index: 3,
      title: 'Finish',
    },
  ]
  return (
    <div className='flex items-center mb-[56px]'>
      <Item active={steps[0].index === bookingPage} index={steps[0].index} title={steps[0].title} />
      <div className='flex-1 border-t border-gray h-7' />
      <Item active={steps[1].index === bookingPage} index={steps[1].index} title={steps[1].title} />
      <div className='flex-1 border-t border-gray h-7' />
      <Item active={steps[2].index === bookingPage} index={steps[2].index} title={steps[2].title} />
    </div>
  )
}

export default Steps;

const Item = ({ active, index, title }: { active: boolean, index: number, title: string }) => {
  return (
    <div className={cn('flex flex-col items-center gap-2 w-[120px]', active && 'font-[500]')}>
      <div className={cn('size-[51px] rounded-full flex items-center justify-center border border-brown', active && 'bg-blue border-blue')}>{index}</div>
      {title}
    </div>
  )
}