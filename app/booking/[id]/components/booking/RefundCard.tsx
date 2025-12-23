'use client'
import { useBookingStore } from '@/store/useBookingStore'
import { Label } from "@/app/_components/ui/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/app/_components/ui/radio-group"
import { Separator } from "@/app/_components/ui/separator"

const RefundCard = () => {
  const { booking, setBooking } = useBookingStore()
  const handleRefundChange = (value: string) => {
    const isRefunable = value === 'true'
    setBooking({ ...booking, isRefunable: isRefunable })
  }
  return (
    <div className='flex flex-col bg-white rounded-[20px] py-6 px-4 shadow-xl'>
      <RadioGroup value={booking.isRefunable.toString()} onValueChange={handleRefundChange} >
        <Label htmlFor="non-refundable" className="flex items-center gap-4 cursor-pointer pb-5"  >
          <RadioGroupItem value="false" id="non-refundable" />
          <div className="inter text-base font-semibold flex flex-col gap-1">
            Non-Refundable (Save 5%)
            <span className="!text-[15px] inter font-[400] text-dark">
              No refund in the event of cancellation
            </span>
          </div>
        </Label>
        <Separator />
        <Label htmlFor="refundable" className="flex items-center gap-4 cursor-pointer pt-5"  >
          <RadioGroupItem value="true" id="refundable" />
          <div className="inter text-base font-semibold flex flex-col gap-1">
            Refundable
            <span className="!text-[15px] inter font-[400] text-dark">
            Cancel free until 3 days prior
            </span>
          </div>
        </Label>

      </RadioGroup>
    </div>
  )
}

export default RefundCard