import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth-context';
import { Icon } from '../ui/Icon';
import { NotificationBell } from './NotificationBell';

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <h1 className="text-lg font-bold text-ink">{title}</h1>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2">
          <img
            src="/assets/images/sample.png"
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="text-sm text-gray-ink">
            {user?.first_name} {user?.last_name}
          </span>
        </div>
        <button
          type="button"
          title="Log out"
          aria-label="Log out"
          className="flex items-center gap-1 text-sm text-gray-700 hover:text-primary"
          onClick={async () => {
            await logout();
            void navigate({ to: '/auth/login' });
          }}
        >
          <Icon name="logout" size={18} />
          Log out
        </button>
      </div>
    </header>
  );
}
