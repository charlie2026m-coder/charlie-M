import Content from "./components/Content";
import { PiListBulletsFill } from "react-icons/pi";
import type { Metadata } from 'next';

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

export default function TermsAndConditions() {

  return (
    <section className="flex flex-col items-center justify-center container px-4 md:px-10 xl:px-[100px] py-[50px]">
      <div className="flex flex-col items-center gap-6 py-15 bg-blue/30 rounded-[40px] mb-8">
        <div className='flex items-center gap-5'>
          <div className='size-10 md:size-[76px] bg-blue rounded-full flex items-center justify-center text-white '>
            <PiListBulletsFill className='size-6 md:size-[40px]' />
          </div>
          <h1 className='text-3xl text-mute md:text-6xl font-bold jakarta'>Terms and Conditions</h1>
        </div>
        <p className='w-4/5 text-center text-dark text-sm inter'>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      </div>
      <Content />
    </section>
  )
}

