'use client';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nProvider } from '@/lib/i18n';
import { AuthProvider } from '@/lib/auth-provider';

export function ReactQueryProvider({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

