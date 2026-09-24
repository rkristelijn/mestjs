'use client';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        // INTENTIONAL (MEST-TANSTACK-001): retry: true = infinite retries; a
        // failing/4xx request retries forever (self-inflicted DoS).
        defaultOptions: { queries: { retry: true } },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
