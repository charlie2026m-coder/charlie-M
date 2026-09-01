'use client'
import Amenities from '../../components/Amenities'
import TextReadMore from '@/app/_components/ui/TextReadMore';
import RoomParamsRow from '@/app/_components/ui/RoomParamsRow';
import { Button } from '@/app/_components/ui/button'
import { RoomOffer } from '@/types/offers'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { FiCalendar } from 'react-icons/fi'
import ShareButton from '@/app/_components/ui/ShareButton'

const scrollToBooking = () =>
  document.getElementById('room-booking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

const RoomContent = ({
  room,
  isRoomInfo = false,
}: {
  room: RoomOffer,
  isRoomInfo?: boolean,
}) => {
  const t = useTranslations('roomContent')
  const tParams = useTranslations('roomParams')
  const tCommon = useTranslations()
  return (
    <>
      {/* Always a row. `flex-col-reverse` put the share control ABOVE the title
          on phones — a stray button floating over the room name. Beside the
          title it reads as an action on that title, which is what it is.
          Not over the gallery: an overlay there swallows the photo swipe.
          No url passed — sharing the page as it stands keeps the guest's dates
          in the link. */}
      <div className='flex flex-row items-start justify-between gap-3 mb-5'>
        <h2 className='text-[30px] md:text-[40px] font-semibold leading-[0.95] min-w-0'>{room.name}</h2>
        {isRoomInfo && <ShareButton title={room.name} showLabel className='shrink-0 mt-1' />}
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
      </div>

      {isRoomInfo &&
      <>
        <Amenities
          action={
            <Button
              onClick={scrollToBooking}
              variant='outline'
              className='md:hidden h-9 shrink-0 rounded-full px-6 min-w-[150px] text-sm gap-1.5'
            >
              <FiCalendar className='size-4' />
              {tCommon('book_now_btn')}
            </Button>
          }
        />
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