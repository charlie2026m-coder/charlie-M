'use client'
import { cn } from '@/lib/utils'

const Steps = ({ bookingPage, setBookingPage }: { bookingPage: number, setBookingPage: (page: number) => void }) => {
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
    <div className='relative flex items-center justify-between mb-6 lg:mb-[56px]'>
      <Item active={steps[0].index === bookingPage} index={steps[0].index} title={steps[0].title} onClick={() => setBookingPage(steps[0].index)} />
      <div className='absolute top-6  left-22 right-22  h-7 border-t border-gray' />
      <Item active={steps[1].index === bookingPage} index={steps[1].index} title={steps[1].title} onClick={() => setBookingPage(steps[1].index)} />
      <Item active={steps[2].index === bookingPage} index={steps[2].index} title={steps[2].title} onClick={() => setBookingPage(steps[2].index)} />
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