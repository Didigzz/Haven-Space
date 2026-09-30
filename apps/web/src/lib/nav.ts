import { BROWSE_LISTINGS_PATH } from './routes';
import type { AuthUser } from './types';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  group: string;
}

export const BOARDER_NAV: NavItem[] = [
  { to: '/boarder', label: 'Dashboard', icon: 'home', group: 'Main' },
  { to: '/boarder/tenancy', label: 'My Tenancy', icon: 'document', group: 'Main' },
  { to: '/boarder/applications', label: 'Applications', icon: 'application', group: 'Main' },
  { to: BROWSE_LISTINGS_PATH, label: 'Find a Room', icon: 'search', group: 'Discovery' },
  { to: '/boarder/messages', label: 'Messages', icon: 'chat', group: 'Communication' },
  {
    to: '/boarder/announcements',
    label: 'Announcements',
    icon: 'announcement',
    group: 'Communication',
  },
  { to: '/boarder/payments', label: 'Payments', icon: 'payment', group: 'Payments' },
  { to: '/boarder/house-rules', label: 'House Rules', icon: 'book', group: 'Info' },
  { to: '/boarder/settings', label: 'Settings', icon: 'settings', group: 'Account' },
];

/**
 * Sidebar for boarders without a confirmed tenancy (`boarder_status` !==
 * 'confirmed'): enough to discover rooms, apply, and manage the account —
 * nothing that only makes sense once they live in a boarding house (spec
 * `pre-tenancy-boarder-nav` R1/R2/R4). Rendered as a single `Main` group.
 */
export const BOARDER_LIMITED_NAV: NavItem[] = [
  { to: '/boarder/applications', label: 'Applications', icon: 'application', group: 'Main' },
  { to: BROWSE_LISTINGS_PATH, label: 'Find a Room', icon: 'search', group: 'Main' },
  { to: '/boarder/settings', label: 'Settings', icon: 'settings', group: 'Main' },
];

/**
 * Pure status → sidebar mapping for boarders. Only a `confirmed` booking
 * (active tenancy) unlocks the full list; every other status — including an
 * unknown/undefined one (fail-safe, spec R14) — gets the limited list.
 */
export function getBoarderNav(status: string | undefined): NavItem[] {
  return status === 'confirmed' ? BOARDER_NAV : BOARDER_LIMITED_NAV;
}

export const LANDLORD_NAV: NavItem[] = [
  { to: '/landlord', label: 'Dashboard', icon: 'home', group: 'Main' },
  { to: '/landlord/listings', label: 'My Listings', icon: 'list', group: 'Main' },
  { to: '/landlord/properties', label: 'Properties', icon: 'buildingOffice', group: 'Main' },
  { to: '/landlord/maps', label: 'Map View', icon: 'map', group: 'Main' },
  { to: '/landlord/invitations', label: 'Invitations', icon: 'document', group: 'Main' },
  { to: '/landlord/applications', label: 'Applications', icon: 'application', group: 'Main' },
  { to: '/landlord/boarders', label: 'Tenants', icon: 'users', group: 'Main' },
  { to: '/landlord/messages', label: 'Messages', icon: 'chat', group: 'Communication' },
  { to: '/landlord/payments', label: 'Payments', icon: 'payment', group: 'Payments' },
  {
    to: '/landlord/announcements',
    label: 'Announcements',
    icon: 'announcement',
    group: 'Communication',
  },
  { to: '/landlord/calendar', label: 'Calendar', icon: 'calendar', group: 'Management' },
  { to: '/landlord/activity', label: 'Activity', icon: 'analytics', group: 'Management' },
  { to: '/landlord/pricing', label: 'Pricing', icon: 'flag', group: 'Management' },
  { to: '/landlord/settings', label: 'Settings', icon: 'settings', group: 'Account' },
];

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: 'home', group: 'Operations' },
];

/** Every destination the account menu's primary entry can take. */
export type AccountHomePath = '/admin' | '/landlord' | '/boarder' | '/boarder/applications';

export interface AccountMenuEntry {
  to: AccountHomePath;
  label: string;
}

/**
 * The account menu's primary entry (`UserMenu`).
 *
 * A boarder without a confirmed tenancy lands on their applications list — the
 * dashboard is gated behind a confirmed booking (`pre-tenancy-boarder-nav-spec`
 * D5) — so the entry reads "Application" and links straight there instead of
 * bouncing through `/boarder`. Once the booking is confirmed the entry becomes
 * the real "Dashboard". Landlords and admins are unaffected.
 */
export function accountHomeEntry(
  role: AuthUser['role'] | undefined,
  boarderStatus?: string
): AccountMenuEntry {
  if (role === 'admin') return { to: '/admin', label: 'Dashboard' };
  if (role === 'landlord') return { to: '/landlord', label: 'Dashboard' };

  return boarderStatus === 'confirmed'
    ? { to: '/boarder', label: 'Dashboard' }
    : { to: '/boarder/applications', label: 'Application' };
}
