import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';

export function AuthSplitLayout({
  title,
  subtitle,
  image = '/assets/images/public/login_right.png',
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  image?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left image panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:block">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/80 to-primary/20" />
        <div className="relative z-10 flex h-full flex-col justify-end p-10 text-white">
          <h2 className="text-3xl font-bold leading-tight">
            Find your haven,
            <br />
            right next door.
          </h2>
          <p className="mt-3 max-w-md text-white/90">
            Verified boarding houses near you, managed by trusted landlords.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-cream px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <img
              src="/assets/images/Haven_Space_Logo.png"
              alt="Haven Space"
              className="h-9 w-9 object-contain"
            />
            <span className="text-lg font-bold text-primary">Haven Space</span>
          </Link>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-gray-ink">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 border-t border-gray-100 pt-4 text-sm">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({
  onClick,
  label = 'Continue with Google',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mint"
    >
      <Icon name="google" size={18} />
      {label}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-gray-ink">
      <span className="h-px flex-1 bg-gray-200" />
      or
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  );
}
