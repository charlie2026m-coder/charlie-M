'use client';
import Image from 'next/image';
import { Link } from '@/navigation';
import MobileMenu from './MobileMenu';
import Language from './Language';
import { Suspense } from 'react';

interface WelcomeHeaderProps {
  locale: string;
}

const WelcomeHeader = ({ locale }: WelcomeHeaderProps) => {
  return (
    <header className="absolute top-0 left-0 w-full z-20">
      <section className="container px-4 xl:px-[100px] py-5 flex items-center">
        <MobileMenu isWhite />
        <Link href="/" locale={locale as 'en' | 'de'}>
          <Image
            src="/images/logo-white.svg"
            alt="Charlie M Logo"
            width={147}
            height={34}
            priority
            className="w-24 md:w-[147px]"
          />
        </Link>
        <div className="ml-auto hidden md:block">
          <Suspense fallback={<div className="w-8 h-8" />}>
            <Language isWhite />
          </Suspense>
        </div>
      </section>
    </header>
  );
};

export default WelcomeHeader;
