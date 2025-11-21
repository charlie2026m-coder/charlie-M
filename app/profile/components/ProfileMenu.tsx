'use client'
import CustomCard from '@/app/_components/ui/CustomCard'
import AvatarComponent from './AvatarComponent'
import { useProfile } from '@/app/hooks/useProfile'
import { FaUser } from "react-icons/fa6";
import { PiCalendarBlankFill } from "react-icons/pi";
import { TiArrowSortedDown } from "react-icons/ti";
import { cn } from '@/lib/utils'
import SlideMenu from './SlideMenu'
import { IoLogOut } from "react-icons/io5";
import { useLogout } from '@/app/hooks/useAuth';
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'


const ProfileMenu = () => {
  const pathname = usePathname()
  const logoutMutation = useLogout();
  const { profile, loading, error } = useProfile()
  const [activeResTab, setActiveResTab] = useState('All')

  // if (loading) return <div>Loading...</div>
  // if (error) return <div>Error: {error}</div>

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

  const resTabs = ['All', 'Ongoing', 'Upcoming', 'Completed', 'Cancelled' ] as const

  return (
    <CustomCard className=" col-span-1 self-start">
      <AvatarComponent />
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
          <Link
            href={href}
            key={tab.value} 
            className={cn(
              'flex items-center p-2.5 rounded-[16px] gap-2 w-full cursor-pointer transition-all duration-300',
              isActive 
                ? 'bg-black text-white hover:bg-black/80' 
                : 'hover:bg-light-bg'
            )} 
          >
            {icon} {tab.label}
            {(tab.value === '/reservations') && (
              <TiArrowSortedDown className={cn('size-5 ml-auto', isActive ? 'text-white' : 'text-brown')} />
            )}
          </Link>
        )
      })}

      <SlideMenu 
        sections={resTabs.map(tab => tab.toString())}
        activeSection={activeResTab}
        onSectionClick={(title) => setActiveResTab(title)}
      />

      <div className='text-brown cursor-pointer hover:text-brown/80 transition-all duration-300'>
      + Add via Reservation ID
      </div>

      <div 
          className={cn('flex items-center p-2.5 rounded-[16px] gap-2 w-full cursor-pointer hover:bg-light-bg transition-all duration-300')} 
          onClick={() => logoutMutation.mutate()}
      >
        <IoLogOut className='size-5 text-blue' /> Logout
      </div>

    </CustomCard>
  )
}

export default ProfileMenu