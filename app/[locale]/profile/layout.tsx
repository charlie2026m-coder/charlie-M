import CustomCard from '@/app/_components/ui/CustomCard'
import ProfileMenu from './components/ProfileMenu'
import { Suspense } from 'react'
import Header from '@/app/_components/header/Header'
import { getTranslations } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function ProfileLayout({ children, params }: { children: React.ReactNode, params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations()
  
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let hasAddedReservations = false
  if (user) {
    const { data } = await supabase
      .from('reservations')
      .select('reservation_id')
      .eq('user_id', user.id)
      .limit(1)
    hasAddedReservations = (data && data.length > 0) || false
  }
  
  return (
    <>
      <Header locale={locale} />
      <div className="container px-4 md:px-10  xl:px-[100px] py-8 grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ">
        <ProfileMenu hasAddedReservations={hasAddedReservations} />
        <CustomCard className=' md:col-span-1 overflow-hidden lg:col-span-2 xl:col-span-3 self-start border rounded-[40px] p-0 min-h-[650px]'>
          <Suspense fallback={<div className="p-8">{t('loading')}</div>}>
            {children}
          </Suspense>
        </CustomCard>
      </div>
    </>
  )
}