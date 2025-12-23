import { cn } from '@/lib/utils'
import { bookingStatuses } from '@/types/types';

const StatusBadge = ({ status, className}: { status?: bookingStatuses, className?: string }) => {
  if (!status) return null;

  const style = {
    [bookingStatuses.Confirmed]: 'bg-[#E08A3F1A] text-yellow-500',
    [bookingStatuses.CheckedOut]: 'bg-green/10 text-green',
    [bookingStatuses.InHouse]: 'bg-[#2A94211A] text-[#5F839E]',
    [bookingStatuses.Cancelled]: 'bg-red-100 text-red-600',
    [bookingStatuses.NoShow]: 'bg-gray/10 text-gray',
  }
  const textOfStatus = {
    [bookingStatuses.Confirmed]: 'upcoming',
    [bookingStatuses.CheckedOut]: 'completed',
    [bookingStatuses.InHouse]: 'ongoing',
    [bookingStatuses.Cancelled]: 'cancelled',
    [bookingStatuses.NoShow]: 'no show',
  }

  return (
    <div className={cn('flex items-center px-2.5 h-6 text-[14px] gap-2 rounded-full', style[status], className)}>
      {textOfStatus[status]}
    </div>
  )
}

export default StatusBadge