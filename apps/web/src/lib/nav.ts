import type { NavItem } from '../components/layout/Sidebar';

export const BOARDER_NAV: NavItem[] = [
  { to: '/boarder', label: 'Dashboard' },
  { to: '/boarder/find-a-room', label: 'Find a room' },
  { to: '/boarder/applications', label: 'Applications' },
  { to: '/boarder/tenancy', label: 'Tenancy' },
  { to: '/boarder/announcements', label: 'Announcements' },
  { to: '/boarder/settings', label: 'Settings' },
];

export const LANDLORD_NAV: NavItem[] = [
  { to: '/landlord', label: 'Dashboard' },
  { to: '/landlord/listings', label: 'Listings' },
  { to: '/landlord/applications', label: 'Applications' },
  { to: '/landlord/boarders', label: 'Boarders' },
  { to: '/landlord/announcements', label: 'Announcements' },
  { to: '/landlord/settings', label: 'Settings' },
];

export const ADMIN_NAV: NavItem[] = [{ to: '/admin', label: 'Overview' }];
