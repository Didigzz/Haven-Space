import type { ReactNode } from 'react';
import { PublicLayout } from './PublicLayout';

export interface LegalSection {
  number: string;
  title: string;
  body: ReactNode;
}

export function LegalLayout({
  title,
  subtitle,
  updated,
  sections,
}: {
  title: string;
  subtitle: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-gray-ink">{subtitle}</p>
          <p className="mt-2 text-sm text-gray-ink">
            <strong>Last updated:</strong> {updated}
          </p>
        </div>
        <div className="space-y-8">
          {sections.map(section => (
            <section key={section.number}>
              <h2 className="text-xl font-bold text-ink">
                <span className="text-primary">{section.number}. </span>
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-ink">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
