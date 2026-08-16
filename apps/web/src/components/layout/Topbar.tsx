import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth-context';
import { NotificationBell } from './NotificationBell';

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <h1 className="font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <span className="text-sm text-gray-ink">
          {user?.first_name} {user?.last_name}
        </span>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={async () => {
            await logout();
            void navigate({ to: '/auth/login' });
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
