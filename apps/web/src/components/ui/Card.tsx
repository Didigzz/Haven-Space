import type { ReactNode } from 'react';

/**
 * Surface primitive — opaque and elevated, matching the app-wide language
 * already used by `RoomDetailView`, `FindARoomContent` and the public pages
 * (`rounded-2xl` + `shadow-card`).
 *
 * Deliberately **opaque**: translucent material is reserved for floating chrome
 * (topbar, sidebar) and floating layers (modal, menus, toasts). Never stack one
 * translucent surface on another — legibility collapses (apple-design §12).
 */
export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 shadow-card ${className}`}>
      {children}
    </div>
  );
}
