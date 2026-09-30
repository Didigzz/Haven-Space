import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from './Icon';

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-error-ink">{error}</span> : null}
    </label>
  );
}

// `text-base` pins the controls at 16px, the size that keeps mobile browsers from zooming the page
// when a field is focused. They already inherit 16px, so this is insurance against a future
// `text-sm` utility re-introducing the zoom.
const inputClasses =
  'w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-base text-ink focus:border-primary focus:outline-none';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClasses} {...props} />;
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const { className, ...rest } = props;
  return (
    <div className="relative">
      <input
        {...rest}
        type={visible ? 'text' : 'password'}
        className={`${inputClasses} pr-10 ${className ?? ''}`}
      />
      <button
        type="button"
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible(v => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-gray-ink focus:outline-none"
      >
        <Icon name={visible ? 'eye' : 'eyeOff'} size={18} />
      </button>
    </div>
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClasses} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputClasses} {...props} />;
}
