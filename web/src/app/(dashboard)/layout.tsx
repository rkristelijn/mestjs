import * as React from 'react';
import { DashboardShell } from './DashboardShell';

// Toolpad's DashboardLayout relies on client-side router/navigation context,
// which cannot be statically prerendered — force dynamic rendering.
export const dynamic = 'force-dynamic';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
