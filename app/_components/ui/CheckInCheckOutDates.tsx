import { MdOutlineWatchLater } from 'react-icons/md'
import dayjs from 'dayjs'
import { Separator } from './separator'

const CheckInCheckOutDates = ({ from, to }: { from: string, to: string }) => {
  return (  
    <div className='flex w-full'>
      <div className='flex flex-col gap-2 items-center w-1/2'>
        <span>Check in</span>
        <span className='text-lg font-bold'>{dayjs(from).format('DD MMM YYYY')}</span>
        <div className='flex items-center gap-1'>
          <MdOutlineWatchLater className='size-5 text-blue' />
          <span>11:30 - 14:30</span>
        </div>
      </div>
      <Separator orientation="vertical" />
      <div className='flex flex-col gap-2 items-center w-1/2'>
        <span>Check out</span>
        <span className='text-lg font-bold'>{dayjs(to).format('DD MMM YYYY')}</span>
        <div className='flex items-center gap-1'>
          <MdOutlineWatchLater className='size-5 text-blue' />
          <span>11:30 - 14:30</span>
        </div>
      </div>
    </div>
  )
}

export default CheckInCheckOutDates