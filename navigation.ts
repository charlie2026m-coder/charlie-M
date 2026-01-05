import { createNavigation } from 'next-intl/navigation';
import { locales } from './i18n';

export const { Link, redirect, usePathname, useRouter } = 
  createNavigation({ 
    locales: locales as unknown as string[],
    defaultLocale: 'en',
    localePrefix: 'as-needed' 
  });

