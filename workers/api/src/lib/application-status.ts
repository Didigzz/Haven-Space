/**
 * Explicit application lifecycle state machine.
 *
 * The only legal transitions are:
 *
 *   pending  -> accepted | rejected | cancelled     (landlord decides, boarder withdraws)
 *   accepted -> confirmed | cancelled               (boarder books, boarder withdraws)
 *   confirmed -> ended                              (landlord approves the leave request)
 *
 * `ended`, `rejected`, and `cancelled` are terminal: no mutation may move an
 * application out of them. Every route that mutates application state must
 * validate against this table before writing.
 */

export const APPLICATION_STATUSES = [
  'pending',
  'accepted',
  'confirmed',
  'ended',
  'rejected',
  'cancelled',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['confirmed', 'cancelled'],
  confirmed: ['ended'],
  ended: [],
  rejected: [],
  cancelled: [],
};

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

/** True when `from` may legally move to `to`. Unknown statuses never transition. */
export function canTransition(from: string, to: string): boolean {
  if (!isApplicationStatus(from) || !isApplicationStatus(to)) {
    return false;
  }

  return TRANSITIONS[from].includes(to);
}

/** The statuses reachable from `from` in a single step. */
export function allowedTransitions(from: string): ApplicationStatus[] {
  return isApplicationStatus(from) ? [...TRANSITIONS[from]] : [];
}

/** Terminal statuses cannot be mutated further. */
export function isTerminalStatus(status: string): boolean {
  return status === 'ended' || status === 'rejected' || status === 'cancelled';
}
