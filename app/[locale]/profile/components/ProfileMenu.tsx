'use client'
import CustomCard from '@/app/_components/ui/CustomCard'
import { useProfile } from '@/app/hooks/useProfile'
import { FaUser } from "react-icons/fa6";
import { PiCalendarBlankFill } from "react-icons/pi";
import { TiArrowSortedDown } from "react-icons/ti";
import { cn } from '@/lib/utils'
import SlideMenu from './SlideMenu'
import { Link } from '@/navigation'
import { usePathname } from 'next/navigation'
import ReservationIdDialog from './ReservationIdDialog'
import Logout from './Logout'
import { useProfileStore, ReservationFilter } from '@/store/useProfile'


const ProfileMenu = () => {
  const pathname = usePathname()
  const { profile } = useProfile()
  const { reservationFilter, setReservationFilter } = useProfileStore()


  const tabs = [
    {
      label: 'Profile',
      value: '',
    },
    {
      label: 'My Reservations',
      value: '/reservations',
    },
  ]

  const resTabs = ['All', 'Ongoing', 'Upcoming', 'Completed', 'Canceled' ] as const

  return (
    <CustomCard className=" col-span-1 self-start shadow-lg">
      <h1 className='text-lg pb-5 border-b w-full text-center mb-5'>{profile?.name || ' Jnohn Dou'}</h1>

      {tabs.map((tab) => {
        const href = `/profile${tab.value}`
        const isActive = tab.value === '' 
          ? pathname === '/profile' 
          : pathname.startsWith(`/profile${tab.value}`)
        
        const icon = tab.value === '' 
          ? <FaUser className={cn('size-5', isActive ? 'text-white' : 'text-blue')} />
          : <PiCalendarBlankFill className={cn('size-5', isActive ? 'text-white' : 'text-blue')} />
        
        return (
          <div key={tab.label} className='flex flex-col gap-2'>
            <Link
              href={href}
              className={cn(
                'flex items-center p-2.5 rounded-[16px] gap-2 w-full cursor-pointer transition-all duration-300',
                isActive 
                  ? 'bg-black text-white hover:bg-black/80' 
                  : 'hover:bg-light-bg'
              )} 
            >
              {icon} {tab.label}
              {(tab.value === '/reservations') && (
                <TiArrowSortedDown className={cn('size-5 ml-auto transition-all duration-300', isActive ? 'text-white rotate-180 ' : 'text-blue')} />
              )}
            </Link>
            {tab.value === '/reservations' && (
              <SlideMenu 
                isActive={(isActive && tab.value === '/reservations' && pathname === '/profile/reservations')}
                sections={resTabs.map(tab => tab.toString())}
                activeSection={reservationFilter}
                onSectionClick={(title) => setReservationFilter(title as ReservationFilter)}
              />
            )}
          </div>
        )
      })}


      <ReservationIdDialog />

      <Logout />

    </CustomCard>
  )
}

export default ProfileMenu
