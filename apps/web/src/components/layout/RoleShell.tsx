import type { ReactNode } from 'react';
import { Sidebar, type NavItem } from './Sidebar';
import { Topbar } from './Topbar';

export function RoleShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar nav={nav} />
      <div className="flex-1">
        <Topbar title={title} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
