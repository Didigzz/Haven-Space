import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <h1 className="text-lg font-bold text-ink">{title}</h1>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
