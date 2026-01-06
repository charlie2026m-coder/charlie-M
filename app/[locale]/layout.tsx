import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales } from '@/i18n';
import { ReactQueryProvider } from '@/app/providers';
import Header from '@/app/_components/header/Header';
import Footer from '@/app/_components/footer/Footer';
import CookieBanner from '@/app/_components/CookieBanner';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://charlie-m.de";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  
  const languages: Record<string, string> = {
    en: `${siteUrl}`,
    de: `${siteUrl}/de`
  };

  return {
    alternates: {
      canonical: locale === 'en' ? siteUrl : `${siteUrl}/${locale}`,
      languages: languages
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: Props) {
  const { locale } = await Promise.resolve(params);
  
  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider key={locale} messages={messages} locale={locale}>
      <ReactQueryProvider>
        <div className='z-11'>
          <Header locale={locale} />
        </div>
        <main className="flex-1 relative z-10">{children}</main>
        <Footer/>
        <CookieBanner />
        <Toaster position="top-left" richColors/>
      </ReactQueryProvider>
    </NextIntlClientProvider>
  );
}

