import { ReactNode, cache } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales } from '@/i18n';
import { ReactQueryProvider } from '@/app/providers';
import ConditionalStickyHeader from '@/app/_components/header/ConditionalStickyHeader';
import Footer from '@/app/_components/footer/Footer';
import { CookieConsentBanner } from '@/app/_components/CookieConsent/CookieConsentBanner';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import Discount from '@/app/_components/ui/Discount';
import DevelopmentBanner from '@/app/_components/ui/DevelopmentBanner';

const getCachedMessages = cache(async (locale: string) => {
  return await getMessages({ locale });
});
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

  const messages = await getCachedMessages(locale);

  return (
    <NextIntlClientProvider key={locale} messages={messages} locale={locale}>
      <ReactQueryProvider>
        <DevelopmentBanner />
        <Discount />

        <ConditionalStickyHeader locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
        <CookieConsentBanner />
        <Toaster position="top-left" richColors/>
      </ReactQueryProvider>
    </NextIntlClientProvider>
  );
}

