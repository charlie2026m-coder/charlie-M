import CustomCard from '@/app/_components/ui/CustomCard'
import ProfileMenu from './components/ProfileMenu'
import { Suspense } from 'react'
import Header from '@/app/_components/header/Header'

export default async function ProfileLayout({ children, params }: { children: React.ReactNode, params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return (
    <>
      <Header locale={locale} />
      <div className="container px-4 md:px-10  xl:px-[100px] py-8 grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ">
        <ProfileMenu />
        <CustomCard className=' md:col-span-1 lg:col-span-2 xl:col-span-3 self-start shadow-lg px-0 min-h-[650px]'>
          <Suspense fallback={<div className="p-8">Loading...</div>}>
            {children}
          </Suspense>
        </CustomCard>
      </div>
    </>
  )
}