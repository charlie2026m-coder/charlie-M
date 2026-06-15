import { getTranslations } from 'next-intl/server'
import Header from '@/app/_components/header/Header'
import type { Metadata } from 'next'
import GroupBookingForm from './components/GroupBookingForm'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await Promise.resolve(params)
  const t = await getTranslations({ locale, namespace: 'groupBookings' })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://charlie-m.de'
  const canonicalUrl = locale === 'de' ? `${siteUrl}/de/group-bookings` : `${siteUrl}/group-bookings`

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: canonicalUrl,
      siteName: 'Charlie M Hotel',
      locale: locale === 'de' ? 'de_DE' : 'en_US',
      type: 'website',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/group-bookings`,
        de: `${siteUrl}/de/group-bookings`,
      },
    },
  }
}

const GroupBookingsPage = async ({ params }: Props) => {
  const { locale } = await Promise.resolve(params)

  return (
    <>
      <Header locale={locale} />
      <GroupBookingForm locale={locale} />
    </>
  )
}

export default GroupBookingsPage
