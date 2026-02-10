'use client'
import CustomCard from '@/app/_components/ui/CustomCard'
import { useProfile } from '@/app/hooks/useProfile'
import { FaUser } from "react-icons/fa6";
import { PiCalendarBlankFill } from "react-icons/pi";
import { TiArrowSortedDown } from "react-icons/ti";
import { cn } from '@/lib/utils'
import SlideMenu from './SlideMenu'
import { Link, usePathname } from '@/navigation'
import ReservationIdDialog from './ReservationIdDialog'
import Logout from './Logout'
import { useProfileStore, ReservationFilter } from '@/store/useProfile'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface ProfileMenuProps {
  hasAddedReservations: boolean
}

const ProfileMenu = ({ hasAddedReservations }: ProfileMenuProps) => {
  const t = useTranslations('profile')
  const pathname = usePathname()
  const { profile } = useProfile()
  const { reservationFilter, setReservationFilter } = useProfileStore()
  const [isGuestMode, setIsGuestMode] = useState(false)

  useEffect(() => {
    setIsGuestMode(localStorage.getItem('guestMode') === 'true')
  }, [])

  const tabs = [
    {
      label: t('profile'),
      value: '',
    },
    {
      label: t('myReservations'),
      value: '/reservations',
    },
  ]

  const filterLabels: Record<ReservationFilter, string> = {
    'All': t('all'),
    'Ongoing': t('ongoing'),
    'Upcoming': t('upcoming'),
    'Completed': t('completed'),
    'Canceled': t('canceled')
  }
  
  const filters: ReservationFilter[] = ['All', 'Ongoing', 'Upcoming', 'Completed', 'Canceled']
  
  const resTabs = filters.map(filter => filterLabels[filter])

  return (
    <CustomCard className=" col-span-1 self-start border rounded-[40px]  p-3 lg:p-[30px]">
      <h1 className='text-lg pb-5 border-b w-full text-center mb-5'>{profile?.name || t('guest')}</h1>

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
              {(tab.value === '/reservations' && !isGuestMode) && (
                <TiArrowSortedDown className={cn('size-5 ml-auto transition-all duration-300', isActive ? 'text-white rotate-180 ' : 'text-blue')} />
              )}
            </Link>
            {tab.value === '/reservations' && !isGuestMode && (
              <SlideMenu 
                isActive={(isActive && tab.value === '/reservations' && pathname === '/profile/reservations')}
                sections={resTabs}
                activeSection={filterLabels[reservationFilter]}
                onSectionClick={(title) => {
                  const reverseMap: Record<string, ReservationFilter> = {
                    [t('all')]: 'All',
                    [t('ongoing')]: 'Ongoing',
                    [t('upcoming')]: 'Upcoming',
                    [t('completed')]: 'Completed',
                    [t('canceled')]: 'Canceled'
                  }
                  const selectedFilter = reverseMap[title] || 'All'
                  setReservationFilter(selectedFilter)
                }}
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
