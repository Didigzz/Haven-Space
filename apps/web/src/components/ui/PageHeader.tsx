import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle ? <p className="mt-1 text-gray-ink">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </header>
  );
}
