'use client';

import { ReactNode } from 'react';

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Just render the children - the root layout with AppShell will handle everything
  return <>{children}</>;
} 