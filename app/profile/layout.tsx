'use client'
import CustomCard from '@/app/_components/ui/CustomCard'
import ProfileMenu from './components/ProfileMenu'


export default function ProfileLayout({ children }: { children: React.ReactNode }) {

  // Check authentication
  // const { authenticated, user } = await requireAuth()

  // If not authenticated, redirect (in case middleware didn't trigger)
  // if (!authenticated || !user) {
  //   redirect('/')
  // }


  return (
    <div className="container px-[100px] py-8 grid grid-cols-4 gap-4 min-h-[calc(100vh-91px)]">
      <ProfileMenu />
      <CustomCard className='col-span-3 self-start'>
        {children}
      </CustomCard>
     
    </div>
  )
}