import {getRequestConfig} from 'next-intl/server';

export const locales = ['en', 'de'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({locale}) => {
  // If no locale in URL (e.g., /), default to English
  const effectiveLocale = locale || 'en';
  
  return {
    locale: effectiveLocale,
    messages: (await import(`./language/${effectiveLocale}.json`)).default
  };
});
