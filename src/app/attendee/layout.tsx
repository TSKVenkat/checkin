'use client';

import React from 'react';
import EmergencyAlert from '@/components/EmergencyAlert';

export default function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Only show EmergencyAlert in attendee section */}
      <EmergencyAlert darkMode={true} defaultHidden={false} />
      {children}
    </>
  );
} 