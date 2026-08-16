import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { PublicNavbar } from './PublicNavbar';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
