'use client'
import CustomCard from '@/app/_components/ui/CustomCard'
import ProfileMenu from './components/ProfileMenu'
import { Suspense } from 'react'


export default function ProfileLayout({ children }: { children: React.ReactNode }) {

  // Check authentication
  // const { authenticated, user } = await requireAuth()

  // If not authenticated, redirect (in case middleware didn't trigger)
  // if (!authenticated || !user) {
  //   redirect('/')
  // }


  return (
    <div className="container px-4 md:px-10  xl:px-[100px] py-8 grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[calc(100vh-91px)]">
      <ProfileMenu />
      <CustomCard className=' md:col-span-1 lg:col-span-2 xl:col-span-3 self-start shadow-lg px-0'>
        <Suspense fallback={<div className="p-8">Loading...</div>}>
          {children}
        </Suspense>
      </CustomCard>
     
    </div>
  )
}