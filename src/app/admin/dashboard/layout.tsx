'use client';

import { ReactNode } from 'react';

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Return children directly - the root layout with AppShell will handle everything
  return <>{children}</>;
} 