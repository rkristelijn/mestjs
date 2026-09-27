'use client';
import * as React from 'react';
import { Box } from '@mui/material';
import type { Item } from '@/lib/api';

// KEUR-EXPECT: SEC-041 SEC-032
// KEUR-CATEGORY: security
// KEUR-OWASP: A03-injection A09-logging-failures
// KEUR-NOTE: self-authored (mestjs web), verified `keur scan` 2026-09-26.
//   SEC-041 = XSS via dangerouslySetInnerHTML (Next.js/React antipattern #18);
//   SEC-032 = sensitive token logged to console. Both fire (TP).

/**
 * INTENTIONALLY VULNERABLE — renders item names as raw HTML.
 * Deliberate slop for scanner training (keur SEC-041 / semgrep react-xss).
 * Do NOT copy into real code.
 */
export function ItemBanner({ item }: { item: Item }) {
  // Fake "auth token" logged to the console — sensitive data in logs.
  // INTENTIONAL (SEC-032): token logged to console
  console.log('rendering item with token=', 'tok_live_abc123hardcoded');

  // XSS: item.name comes from the API and is injected as raw HTML.
  // INTENTIONAL (SEC-041): XSS via dangerouslySetInnerHTML
  return (
    <Box
      sx={{ p: 1 }}
      dangerouslySetInnerHTML={{ __html: `Latest: <b>${item.name}</b>` }}
    />
  );
}
