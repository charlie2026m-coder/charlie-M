'use client';
import React from 'react';
import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-provider';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Server always gets a fresh client; browser reuses a singleton.
// Using useState would break with Suspense — React discards client state on suspend.
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function ReactQueryProvider({ children }: React.PropsWithChildren) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
