'use client'
import Amenities from '../../components/Amenities'
import TextReadMore from '@/app/_components/ui/TextReadMore';
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow';
import { RoomOffer } from '@/types/offers'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const RoomContent = ({ 
  room, 
  isRoomInfo = false,
}: { 
  room: RoomOffer, 
  isRoomInfo?: boolean,
}) => {
  const t = useTranslations('roomContent')
  const tParams = useTranslations('roomParams')
  return (
    <>
      <div className='flex flex-col-reverse md:flex-row justify-between mb-5 items-start gap-2'>
        <h2 className='text-[30px] md:text-[40px] font-semibold w-4/5 leading-[0.95]'>{room.name}</h2>
      </div>
      <div className={cn('pb-3 mb-5 w-full  flex flex-col md:flex-row  justify-between', isRoomInfo && 'border-b')}>
        <RoomParamsRow 
          attributes={room.attributes} 
          maxPersons={room.maxPersons} 
          size={room.size} 
          translations={{
            max: tParams('max'),
            kingSize: tParams('kingSize'),
            queenSize: tParams('queenSize'),
            single: tParams('single'),
            balcony: tParams('balcony'),
            terrace: tParams('terrace'),
          }}
        />
        <div className='flex items-center gap-3 ml-auto'>
        </div>
      </div>
     
      {isRoomInfo &&
      <> 
        <Amenities/>
        <TextReadMore 
          className='mb-5'
          textClassName='text-dark text-base'
          text={room.description} 
          lines={3}
        />
        <div className='flex flex-col gap-5 rounded-[20px] px-5 py-4 bg-blue/20 mb-9'>
          <h3 className='font-semibold'>{t('pleaseNote')}</h3>
          <p className='text-dark text-md mb-2 '>
          {t('roomVariationNote')}
          </p>
        </div>
      </>}

    </>
  )
}

export default RoomContent