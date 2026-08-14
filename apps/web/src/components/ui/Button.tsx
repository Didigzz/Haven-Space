import type { ButtonHTMLAttributes } from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
