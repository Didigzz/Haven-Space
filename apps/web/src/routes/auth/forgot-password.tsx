import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, TextInput } from '../../components/ui/Field';
import { ApiRequestError } from '../../lib/api/http';
import { forgotPassword, verifyResetCode } from '../../lib/api/auth';

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const result = await forgotPassword(email.trim());
      setInfo(result.message);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to send reset code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyResetCode(email.trim(), code.trim());
      if (!result.valid || !result.request_id) {
        setError('The code could not be verified. Please try again.');
        return;
      }
      void navigate({
        to: '/auth/reset-password',
        search: { email: email.trim(), request_id: String(result.request_id) },
      });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to verify code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={step === 'email' ? 'Forgot Password?' : 'Enter Verification Code'}
      subtitle={
        step === 'email'
          ? "No worries! Enter your email and we'll send you a reset code."
          : `We've sent a 6-digit code to ${email}`
      }
      footer={
        <p>
          Remember your password?{' '}
          <Link to="/auth/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      {error ? <ErrorState message={error} /> : null}
      {info ? <div className="rounded-md bg-mint p-3 text-sm">{info}</div> : null}

      {step === 'email' ? (
        <form className="flex flex-col gap-4" onSubmit={handleEmailSubmit}>
          <Field label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send Reset Code'}
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleCodeSubmit}>
          <Field label="6-digit code" htmlFor="code">
            <TextInput
              id="code"
              name="code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </Field>
          <Button type="submit" disabled={submitting || code.length !== 6}>
            {submitting ? 'Verifying…' : 'Verify Code'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
