'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname ? pathname.startsWith('/auth') || pathname.startsWith('/signUp') : false;

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-text">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
