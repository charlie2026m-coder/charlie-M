import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "./providers";
import Header from "./_components/header/Header";
import Footer from "./_components/footer/Footer";
import CookieBanner from "./_components/CookieBanner";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: "Charlie M Hotel - Smart Hotel in Berlin Mitte",
  description: "Charlie M Hotel - smart hotel in Berlin Mitte with automated check-in.",
};

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const plusJakartaSans = Plus_Jakarta_Sans({ 
  variable: "--font-plus-jakarta-sans", 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});


export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const messages = await getMessages();
  const locale = await getLocale();
  
  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${plusJakartaSans.variable} antialiased bg-light-bg flex flex-col min-h-screen relative`}>
        <NextIntlClientProvider key={locale} messages={messages} locale={locale}>
          <ReactQueryProvider>
            <div className='z-11'>
              <Header/>
            </div>
            <main className="flex-1 relative z-10">{children}</main>
            <Footer/>
            <CookieBanner />
            <Toaster position="top-left" richColors/>
          </ReactQueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
