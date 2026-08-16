import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { Icon } from '../ui/Icon';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/our-story', label: 'Our Story' },
  { to: '/teams', label: 'Our Team' },
  { to: '/for-landlords', label: 'For Landlords' },
  { to: '/haven-ai', label: 'Haven AI' },
] as const;

export function PublicNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const homeFor = (role: string) =>
    role === 'admin' ? '/admin' : role === 'landlord' ? '/landlord' : '/boarder';

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/assets/images/Haven_Space_Logo.png"
            alt="Haven Space"
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-bold text-primary">Haven Space</span>
        </Link>
        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="text-sm font-medium text-gray-700 hover:text-primary"
                activeProps={{ className: 'text-primary font-semibold' }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-3 hover:bg-mint"
              >
                <img
                  src="/assets/images/sample.png"
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
                <span className="text-sm font-medium">{user.first_name}</span>
                <Icon name="chevronDown" size={14} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-pop">
                  <Link
                    to={homeFor(user.role)}
                    className="block px-4 py-2 text-sm hover:bg-mint"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to={
                      user.role === 'landlord' ? '/landlord/settings' : '/boarder/settings'
                    }
                    className="block px-4 py-2 text-sm hover:bg-mint"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-error hover:bg-mint"
                    onClick={async () => {
                      await logout();
                      setMenuOpen(false);
                      void navigate({ to: '/auth/login' });
                    }}
                  >
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="text-sm font-medium text-gray-700 hover:text-primary"
              >
                Log in
              </Link>
              <Link
                to="/auth/choose"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Join now
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
