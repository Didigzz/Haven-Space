import { Link } from '@tanstack/react-router';

export interface NavItem {
  to: string;
  label: string;
}

export function Sidebar({ nav }: { nav: NavItem[] }) {
  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white p-4">
      <nav className="flex flex-col gap-1">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-md px-3 py-2 text-sm hover:bg-mint"
            activeProps={{ className: 'bg-mint font-semibold text-primary' }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
