'use client'
import { useMemo } from 'react'
import { useBookingStore } from '@/store/useBookingStore'
import { Label } from "@/app/_components/ui/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/app/_components/ui/radio-group"
import { Separator } from "@/app/_components/ui/separator"
import { RoomOffer } from '@/types/offers'
import { resolveRatePlan, HOTEL_INFO } from '@/lib/Constants'
import { useTranslations, useLocale } from 'next-intl'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const EARLY_CHECKIN_ID = 'CMH-ECI'
const CANCELLATION_HOURS = 48

const RefundCard = ({ offers, nights, checkInDate }: { offers: RoomOffer[], nights: number, checkInDate: string }) => {
  const t = useTranslations('bookingForm')
  const locale = useLocale()
  const { isRefundable, setIsRefundable, setRoomDetails, rooms: bookedRooms } = useBookingStore()

  const hasEarlyCheckIn = bookedRooms.some(room =>
    room.extras?.some(extra => extra.id === EARLY_CHECKIN_ID)
  )

  const cancellationInfo = useMemo(() => {
    const checkInTime = hasEarlyCheckIn ? '13:00' : HOTEL_INFO.checkinTime
    const checkInMoment = dayjs.tz(`${checkInDate} ${checkInTime}`, 'Europe/Berlin')
    const deadline = checkInMoment.subtract(CANCELLATION_HOURS, 'hour')
    const now = dayjs().tz('Europe/Berlin')
    const isPastDeadline = now.isAfter(deadline)

    const formatted = deadline.format(
      locale === 'de' ? 'DD.MM.YYYY, HH:mm' : 'MMM D, YYYY [at] HH:mm'
    )

    return { isPastDeadline, formatted }
  }, [checkInDate, hasEarlyCheckIn, locale])

  const handleRefundChange = (value: string) => {
    const isRefundable = value === 'true'
    const mainRoom = resolveRatePlan(offers, nights, isRefundable)
    if (!mainRoom) return
    setIsRefundable(isRefundable)
    setRoomDetails(mainRoom)
  }

  return (
    <div className='flex flex-col bg-white rounded-[20px] py-6 px-4 border'>
      <RadioGroup value={isRefundable ? 'true' : 'false'} onValueChange={handleRefundChange} >
        <Label htmlFor="non-refundable" className="flex items-center gap-4 cursor-pointer pb-5"  >
          <RadioGroupItem value="false" id="non-refundable" />
          <div className="text-base font-[900] text-green flex flex-col gap-1">
            {t('nonRefundable')}
            <span className="!text-[15px] font-medium text-dark">
              {t('noRefundDescription')}
            </span>
          </div>
        </Label>
        <Separator />
        <Label htmlFor="refundable" className="flex items-center gap-4 cursor-pointer pt-5"  >
          <RadioGroupItem value="true" id="refundable" />
          <div className="text-base font-[900] text-green flex flex-col gap-1">
            {t('refundable')}
            <span className="!text-[15px] font-medium text-dark">
              {cancellationInfo.isPastDeadline
                ? t('freeCancellationExpired')
                : t('freeCancellationUntil', { date: cancellationInfo.formatted })
              }
            </span>
          </div>
        </Label>

      </RadioGroup>
    </div>
  )
}

export default RefundCard
