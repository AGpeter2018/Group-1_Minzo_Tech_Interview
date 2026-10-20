import React from 'react';

export const metadata = {
  title: 'Authentication | Minzo Africa',
  description: 'Sign in or register for Minzo Africa Healthcare Directory & Reviews',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface text-text flex flex-col justify-between">
      {children}
    </div>
  );
}
