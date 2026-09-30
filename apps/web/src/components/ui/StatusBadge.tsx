import { Icon } from './Icon';

/**
 * Tone map for status pills. Each entry is a `tint` surface plus an `ink` text
 * colour — both semantic tokens rather than raw palette colours.
 */
const TONES: Record<string, string> = {
  // positive
  active: 'bg-success-tint text-success-ink',
  verified: 'bg-success-tint text-success-ink',
  published: 'bg-success-tint text-success-ink',
  approved: 'bg-success-tint text-success-ink',
  accepted: 'bg-success-tint text-success-ink',
  confirmed: 'bg-success-tint text-success-ink',
  owned: 'bg-mint text-primary-dark',
  // waiting
  pending: 'bg-warning-tint text-warning-ink',
  pending_review: 'bg-warning-tint text-warning-ink',
  submitted: 'bg-info-tint text-info-ink',
  shared: 'bg-info-tint text-info-ink',
  // negative
  rejected: 'bg-error-tint text-error-ink',
  banned: 'bg-error-tint text-error-ink',
  flagged: 'bg-error-tint text-error-ink',
  high: 'bg-error-tint text-error-ink',
  suspended: 'bg-warning-tint text-warning-ink',
  // neutral
  ended: 'bg-subtle text-gray-ink',
  cancelled: 'bg-subtle text-gray-ink',
  // account roles — the same pill language for the admin users table, so it no
  // longer hand-rolls its own colours next to this component
  // (`admin-apple-ui-restructure` R20).
  admin: 'bg-accent-tint text-accent-ink',
  landlord: 'bg-mint text-primary-dark',
  boarder: 'bg-info-tint text-info-ink',
};

const FALLBACK = 'bg-subtle text-gray-ink';

export function StatusBadge({
  status,
  label,
  icon,
}: {
  status: string;
  label?: string;
  /** Optional leading icon, tinted with the pill's own text colour. */
  icon?: string;
}) {
  const style = TONES[status] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {icon ? <Icon name={icon} size={12} className="shrink-0" /> : null}
      {label ?? status.replaceAll('_', ' ')}
    </span>
  );
}
