'use client'
import ExtraCard from './ExtraCard'
import { ExtraDetails } from '@/types/types'
const ExtrasSection = ({ extras }: { extras: ExtraDetails[] | undefined }) => {
  if(!extras || extras.length === 0) return null;

  return (  
    <div className='flex flex-col gap-[26px] mb-10'>
      <h2 className='inter  font-semibold w-full pb-2.5 border-b'>Add Extras:</h2>
      <div className='grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-10'>
        {extras.map((extra) => (
          <ExtraCard key={extra.id} item={extra} />
        ))}
      </div>
    </div>
  )
}

export default ExtrasSection;
