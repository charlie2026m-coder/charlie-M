import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';

export const locales = ['en', 'de'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  // Try to get locale from header (set by middleware) or cookie
  const headersList = await headers();
  const cookieStore = await cookies();
  
  const locale = (
    headersList.get('x-locale') || 
    cookieStore.get('NEXT_LOCALE')?.value || 
    'en'
  ) as Locale;

  return {
    locale,
    messages: (await import(`./language/${locale}.json`)).default,
  };
});
