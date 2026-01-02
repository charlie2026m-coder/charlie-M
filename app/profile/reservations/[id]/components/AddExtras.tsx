'use client'
import ExtraCard from "./ExtraCard"
import { Service } from "@/types/apaleo"

const UpgradeRoom = ({ extras }: { extras: Service[] }) => {
  if (!extras || extras.length === 0) {
    return null;
  }

  return (
    <div className='px-3 lg:px-[30px]'>
      <div className='flex items-center gap-2 border-b pb-2 mb-5 text-lg font-semibold w-full'>
        Add Extras:
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6 gap-y-3 lg:gap-y-10 mb-5'>
        {extras.map((extra) => (
          <ExtraCard 
            key={extra.id} 
            item={extra} 
          />
        ))}
      </div>
    </div>
  )
}

export default UpgradeRoom
