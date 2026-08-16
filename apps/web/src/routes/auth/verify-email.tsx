import { Link, createFileRoute, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, TextInput } from '../../components/ui/Field';
import { ApiRequestError } from '../../lib/api/http';
import { resendResetCode } from '../../lib/api/auth';

interface VerifyEmailSearch {
  email?: string;
}

export const Route = createFileRoute('/auth/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const search = useSearch({ from: '/auth/verify-email' });
  const [email, setEmail] = useState(search.email ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleResend() {
    if (!email.trim()) {
      setError('Enter your email address to resend the code.');
      return;
    }
    setError(null);
    setMessage(null);
    setSending(true);
    try {
      const result = await resendResetCode(email.trim());
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to resend the code.');
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle="We've sent you a verification code. Enter it on the signup or login page to verify your account."
    >
      {message ? <div className="rounded-md bg-mint p-3 text-sm">{message}</div> : null}
      {error ? <ErrorState message={error} /> : null}

      <div className="flex flex-col gap-4">
        <Field label="Email address" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="button" onClick={handleResend} disabled={sending}>
          {sending ? 'Sending…' : 'Resend Code'}
        </Button>
        <Link to="/auth/login" className="text-center text-sm text-primary hover:underline">
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
}
