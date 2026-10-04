'use client';
import * as React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
