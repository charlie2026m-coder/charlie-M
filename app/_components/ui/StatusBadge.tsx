import { cn } from '@/lib/utils'
import Dot from './dot';


const StatusBadge = ({ status, className, isDot = false }: { status?: string, className?: string, isDot?: boolean }) => {
  if (!status) return null;

  const statusColors = {
    'checked in': 'green',
    'completed': 'green',
    'pending check-in': 'yellow',
    'upcoming': 'orange',
    'ongoing': 'blue',
    'cancelled': 'red',
    'checked out': 'black',
  }
  const color = statusColors[status.toLowerCase() as keyof typeof statusColors];
  const style = {
    'green': 'bg-green/10 text-green',
    'yellow': 'bg-yellow-50 text-yellow-500',
    'orange': 'bg-orange-50 text-orange-700',
    'blue': 'bg-blue-50 text-blue-500',
    'red': 'bg-red-100 text-red-600',
    'black': 'bg-black/20 text-black',
  }
  
  const colors = {
    'green': 'green',
    'yellow': 'yellow',
    'orange': 'orange',
    'blue': 'blue',
    'red': 'red',
    'black': 'black',
  }


  return (
    <div className={cn('flex items-center  px-2.5 h-6 text-[14px] gap-2 rounded-full', style[color as keyof typeof style], className)}>
      {isDot && <Dot size={10} color={colors[color as keyof typeof colors]} /> }
      {status}
    </div>
  )
}

export default StatusBadge