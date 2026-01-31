import Content from "./components/Content";
import { PiListBulletsFill } from "react-icons/pi";
import type { Metadata } from 'next';
import Header from "@/app/_components/header/Header";
import { getTranslations } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const isGerman = locale === 'de';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";
  
  const canonicalUrl = isGerman ? `${siteUrl}/de/terms-and-conditions` : `${siteUrl}/terms-and-conditions`;

  const metadata = {
    en: {
      title: 'Terms and Conditions | Charlie M Hotel Berlin',
      description: 'Read Charlie M Hotel terms and conditions. Booking policies, cancellation rules, payment terms, and guest responsibilities for your stay in Berlin.',
    },
    de: {
      title: 'Allgemeine Geschäftsbedingungen | Charlie M Hotel Berlin',
      description: 'Lesen Sie die Allgemeinen Geschäftsbedingungen des Charlie M Hotels. Buchungsrichtlinien, Stornierungsbedingungen, Zahlungsbedingungen und Gästerichtlinien für Ihren Aufenthalt in Berlin.',
    }
  };

  const currentMeta = isGerman ? metadata.de : metadata.en;

  return {
    title: currentMeta.title,
    description: currentMeta.description,
    
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      }
    },
    
    openGraph: {
      title: currentMeta.title,
      description: currentMeta.description,
      url: canonicalUrl,
      siteName: 'Charlie M Hotel',
      locale: isGerman ? 'de_DE' : 'en_US',
      type: 'website',
    },
    
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/terms-and-conditions`,
        de: `${siteUrl}/de/terms-and-conditions`
      }
    }
  };
}

export default async function TermsAndConditions({ params }: Props) {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations({ locale, namespace: 'termsAndConditions' });

  return (
    <>
      <Header locale={locale} />
      <section className="flex flex-col items-center justify-center container px-4 md:px-10 xl:px-[100px] py-[50px]">
        <div className='flex items-center gap-5 mb-10'>
          <div className='size-10 md:size-[76px] bg-blue rounded-full flex items-center justify-center text-white '>
            <PiListBulletsFill className='size-6 md:size-[40px]' />
          </div>
          <h1 className='text-3xl text-mute md:text-6xl font-bold jakarta'>{t('title')}</h1>
        </div>
      <Content />
    </section>
    </>
  )
}

