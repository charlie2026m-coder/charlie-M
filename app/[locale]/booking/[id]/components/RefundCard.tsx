'use client'
import { useBookingStore } from '@/store/useBookingStore'
import { Label } from "@/app/_components/ui/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/app/_components/ui/radio-group"
import { Separator } from "@/app/_components/ui/separator"
import { RoomOffer } from '@/types/offers'
import { getType } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const RefundCard = ({ rooms, nights }: { rooms: RoomOffer[], nights: number }) => {
  const t = useTranslations('bookingForm')
  const { isRefundable, setIsRefundable, setRoomDetails } = useBookingStore()
  const handleRefundChange = (value: string) => {
    const isRefunable = value === 'true'
    const planType = getType(nights, isRefunable)
    
    const mainRoom = rooms.find(room => room.ratePlan.code === planType) || rooms[0]
    setIsRefundable(isRefunable)
    setRoomDetails(mainRoom)
  }
  return (
    <div className='flex flex-col bg-white rounded-[20px] py-6 px-4 border'>
      <RadioGroup value={isRefundable ? 'true' : 'false'} onValueChange={handleRefundChange} >
        <Label htmlFor="non-refundable" className="flex items-center gap-4 cursor-pointer pb-5"  >
          <RadioGroupItem value="false" id="non-refundable" />
          <div className="inter text-base font-semibold flex flex-col gap-1">
            {t('nonRefundable')}
            <span className="!text-[15px] inter font-[400] text-dark">
              {t('noRefundDescription')}
            </span>
          </div>
        </Label>
        <Separator />
        <Label htmlFor="refundable" className="flex items-center gap-4 cursor-pointer pt-5"  >
          <RadioGroupItem value="true" id="refundable" />
          <div className="inter text-base font-semibold flex flex-col gap-1">
            {t('refundable')}
            <span className="!text-[15px] inter font-[400] text-dark">
            {t('refundableDescription')}
            </span>
          </div>
        </Label>

      </RadioGroup>
    </div>
  )
}

export default RefundCard