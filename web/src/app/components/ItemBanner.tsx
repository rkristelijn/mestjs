'use client';
import * as React from 'react';
import { Box } from '@mui/material';
import type { Item } from '@/lib/api';

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
