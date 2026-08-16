import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { ApiRequestError } from '../../lib/api/http';
import { changePassword } from '../../lib/api/auth';
import { getProfile, updateProfile, uploadAvatar } from '../../lib/api/account';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/settings')({
  component: () => (
    <Protected role="landlord">
      <SettingsPage />
    </Protected>
  ),
});

function SettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(token!),
    enabled: Boolean(token),
  });

  const [seeded, setSeeded] = useState(false);
  if (profile.data && !seeded) {
    const user = profile.data.user as {
      first_name?: string;
      last_name?: string;
      phone_number?: string;
    };
    setFirstName(user.first_name ?? '');
    setLastName(user.last_name ?? '');
    setPhone(user.phone_number ?? '');
    setSeeded(true);
  }

  const saveProfile = useMutation({
    mutationFn: () =>
      updateProfile(token!, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSavedMessage('Profile updated.');
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update profile.'),
  });

  const avatar = useMutation({
    mutationFn: (file: File) => uploadAvatar(token!, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSavedMessage('Avatar updated.');
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to upload avatar.'),
  });

  const password = useMutation({
    mutationFn: () => changePassword(token!, currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setSavedMessage('Password changed.');
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to change password.'),
  });

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedMessage(null);
    saveProfile.mutate();
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedMessage(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    password.mutate();
  }

  if (profile.isLoading) return <Spinner />;

  return (
    <RoleShell title="Settings" nav={LANDLORD_NAV}>
      <div className="flex max-w-2xl flex-col gap-6">
        {error ? <ErrorState message={error} /> : null}
        {savedMessage ? <div className="rounded-md bg-mint p-3 text-sm">{savedMessage}</div> : null}

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="user" size={20} /> Profile
          </h2>
          <form className="mt-4 flex flex-col gap-4" onSubmit={handleProfileSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" htmlFor="firstName">
                <TextInput
                  id="firstName"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </Field>
              <Field label="Last name" htmlFor="lastName">
                <TextInput
                  id="lastName"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Phone number" htmlFor="phone">
              <TextInput
                id="phone"
                type="tel"
                placeholder="+63 9XX XXX XXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="photo" size={20} /> Profile picture
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <label className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Choose an image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={avatar.isPending}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setError(null);
                    setSavedMessage(null);
                    avatar.mutate(file);
                  }
                }}
              />
            </label>
            {avatar.isPending ? <span className="text-sm text-gray-ink">Uploading…</span> : null}
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="settings" size={20} /> Change password
          </h2>
          <form className="mt-4 flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
            <Field label="Current password" htmlFor="currentPassword">
              <TextInput
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="New password" htmlFor="newPassword">
              <TextInput
                id="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={password.isPending}>
              {password.isPending ? 'Changing…' : 'Change password'}
            </Button>
          </form>
        </Card>
      </div>
    </RoleShell>
  );
}
