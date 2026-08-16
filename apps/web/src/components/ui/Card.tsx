import type { ReactNode } from 'react';

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>{children}</div>
  );
}
