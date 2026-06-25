import { MdShield } from "react-icons/md";
import Content from "./components/Content";
import type { Metadata } from 'next';
import Header from "@/app/_components/header/Header";
import { getTranslations } from 'next-intl/server';
import { CookieDeclaration } from "@/app/_components/CookieConsent/CookieDeclaration";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const isGerman = locale === 'de';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";
  
  const canonicalUrl = isGerman ? `${siteUrl}/de/privacy-policy` : `${siteUrl}/privacy-policy`;

  const metadata = {
    en: {
      title: 'Privacy Policy | Charlie M Hotel Berlin',
      description: 'Read Charlie M Hotel privacy policy. Learn how we collect, use, and protect your personal data in compliance with GDPR and data protection regulations.',
    },
    de: {
      title: 'Datenschutzerklärung | Charlie M Hotel Berlin',
      description: 'Lesen Sie die Datenschutzerklärung des Charlie M Hotels. Erfahren Sie, wie wir Ihre personenbezogenen Daten gemäß DSGVO und Datenschutzbestimmungen erheben, verwenden und schützen.',
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
        en: `${siteUrl}/privacy-policy`,
        de: `${siteUrl}/de/privacy-policy`
      }
    }
  };
}

export default async function PrivacyPolicy({ params }: Props) {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations({ locale, namespace: 'privacyPolicy' });

  return (
    <>
      <Header locale={locale} />
      <section className="flex flex-col items-center justify-center container px-4 md:px-10 xl:px-[100px] py-[50px] bg-light">
        <div className='flex items-center gap-5 mb-10'>
          <div className='size-10 md:size-[76px] bg-blue rounded-full flex items-center justify-center text-white '>
            <MdShield className='size-6 md:size-[40px]' />
          </div>
          <h1 className='text-3xl text-mute md:text-6xl font-bold jakarta'>{t('title')}</h1>
        </div>
      <Content />
      <div className="w-full mt-12">
        <CookieDeclaration />
      </div>
    </section>
    </>
  )
}



