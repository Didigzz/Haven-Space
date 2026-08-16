import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Spinner } from '../../components/ui/Spinner';
import {
  getApplications,
  getLandlords,
  getProperties,
  getSettings,
  getSummary,
  getUsers,
  patchPropertyStatus,
  patchSettings,
  patchUserStatus,
  updateLandlordVerification,
} from '../../lib/api/admin';
import { useAuth } from '../../lib/auth-context';
import { ADMIN_NAV } from '../../lib/nav';
import type {
  AdminApplicationRow,
  AdminLandlordRow,
  AdminPropertyRow,
  AdminUserRow,
} from '../../lib/types';

export const Route = createFileRoute('/admin/')({
  component: () => (
    <Protected role="admin">
      <AdminOverview />
    </Protected>
  ),
});

type TabKey = 'users' | 'properties' | 'applications' | 'landlords' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'users', label: 'Users' },
  { key: 'properties', label: 'Properties' },
  { key: 'applications', label: 'Applications' },
  { key: 'landlords', label: 'Landlords' },
  { key: 'settings', label: 'Settings' },
];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <p className="text-sm text-gray-ink">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub ? <p className="mt-1 text-sm text-gray-ink">{sub}</p> : null}
    </Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === 'admin' ? 'bg-purple-100 text-purple-700' : role === 'landlord' ? 'bg-mint text-primary-dark' : 'bg-blue-100 text-blue-700';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{role}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'active'
      ? 'bg-green-100 text-green-700'
      : status === 'pending'
      ? 'bg-yellow-100 text-yellow-700'
      : status === 'published' || status === 'approved' || status === 'accepted' || status === 'confirmed'
      ? 'bg-green-100 text-green-700'
      : status === 'rejected' || status === 'banned' || status === 'flagged'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-600';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function AdminOverview() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('users');
  const [notice, setNotice] = useState('');

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const summary = useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: () => getSummary(token!),
    enabled: Boolean(token),
  });

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getUsers(token!),
    enabled: Boolean(token) && tab === 'users',
  });

  const properties = useQuery({
    queryKey: ['admin', 'properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token) && tab === 'properties',
  });

  const applications = useQuery({
    queryKey: ['admin', 'applications'],
    queryFn: () => getApplications(token!),
    enabled: Boolean(token) && tab === 'applications',
  });

  const landlords = useQuery({
    queryKey: ['admin', 'landlords'],
    queryFn: () => getLandlords(token!),
    enabled: Boolean(token) && tab === 'landlords',
  });

  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => getSettings(token!),
    enabled: Boolean(token) && tab === 'settings',
  });

  const patchUser = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: string }) =>
      patchUserStatus(token!, userId, status),
    onSuccess: (result) => {
      setNotice(result.message);
      invalidate();
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const patchProperty = useMutation({
    mutationFn: ({ propertyId, action }: { propertyId: number; action: string }) =>
      patchPropertyStatus(token!, propertyId, action),
    onSuccess: (result) => {
      setNotice(result.message);
      invalidate();
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const patchLandlord = useMutation({
    mutationFn: ({ landlordId, action }: { landlordId: number; action: 'approve' | 'reject' }) =>
      updateLandlordVerification(token!, landlordId, action),
    onSuccess: (result) => {
      setNotice(result.message);
      invalidate();
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const saveSettings = useMutation({
    mutationFn: (values: Record<string, string>) => patchSettings(token!, values),
    onSuccess: (result) => {
      setNotice(result.message);
      invalidate();
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const userColumns: Column<AdminUserRow>[] = [
    { header: 'Name', cell: (row) => `${row.first_name} ${row.last_name}` },
    { header: 'Email', cell: (row) => row.email },
    { header: 'Role', cell: (row) => <RoleBadge role={row.role} /> },
    {
      header: 'Status',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.account_status} />
          <select
            aria-label="Change account status"
            className="rounded border border-gray-300 px-1.5 py-0.5 text-xs"
            value={row.account_status}
            onChange={(event) =>
              patchUser.mutate({ userId: row.id, status: event.target.value })
            }
          >
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="banned">banned</option>
          </select>
        </div>
      ),
    },
    { header: 'Joined', cell: (row) => formatDate(row.created_at) },
  ];

  const propertyColumns: Column<AdminPropertyRow>[] = [
    { header: 'Title', cell: (row) => row.title },
    { header: 'Price', cell: (row) => `₱${Number(row.price).toLocaleString()}` },
    { header: 'Status', cell: (row) => <StatusBadge status={row.listing_moderation_status} /> },
    { header: 'Landlord', cell: (row) => `${row.landlord_first} ${row.landlord_last}` },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            className="text-sm text-green-600 hover:underline"
            onClick={() => patchProperty.mutate({ propertyId: row.id, action: 'publish' })}
          >
            Publish
          </button>
          <button
            type="button"
            className="text-sm text-red-600 hover:underline"
            onClick={() => patchProperty.mutate({ propertyId: row.id, action: 'reject' })}
          >
            Reject
          </button>
          <button
            type="button"
            className="text-sm text-yellow-600 hover:underline"
            onClick={() => patchProperty.mutate({ propertyId: row.id, action: 'flag' })}
          >
            Flag
          </button>
        </div>
      ),
    },
  ];

  const applicationColumns: Column<AdminApplicationRow>[] = [
    { header: 'Boarder', cell: (row) => `${row.boarder_first} ${row.boarder_last}` },
    { header: 'Boarder email', cell: (row) => row.boarder_email },
    { header: 'Landlord', cell: (row) => `${row.landlord_first} ${row.landlord_last}` },
    { header: 'Room', cell: (row) => row.room_title ?? '—' },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    { header: 'Applied', cell: (row) => formatDate(row.created_at) },
  ];

  const landlordColumns: Column<AdminLandlordRow>[] = [
    { header: 'Name', cell: (row) => `${row.first_name} ${row.last_name}` },
    { header: 'Email', cell: (row) => row.email },
    { header: 'Boarding house', cell: (row) => row.boarding_house_name ?? '—' },
    {
      header: 'Verified',
      cell: (row) => (
        <StatusBadge status={row.is_verified ? 'verified' : 'pending'} />
      ),
    },
    {
      header: 'Actions',
      cell: (row) =>
        row.is_verified ? null : (
          <div className="flex gap-2">
            <button
              type="button"
              className="text-sm text-green-600 hover:underline"
              onClick={() => patchLandlord.mutate({ landlordId: row.id, action: 'approve' })}
            >
              Approve
            </button>
            <button
              type="button"
              className="text-sm text-red-600 hover:underline"
              onClick={() => patchLandlord.mutate({ landlordId: row.id, action: 'reject' })}
            >
              Reject
            </button>
          </div>
        ),
    },
    { header: 'Joined', cell: (row) => formatDate(row.created_at) },
  ];

  const counts = summary.data?.data.counts;

  return (
    <RoleShell title="Admin overview" nav={ADMIN_NAV}>
      {notice ? (
        <div className="mb-4 rounded-md border border-mint bg-mint/40 px-4 py-2 text-sm">
          {notice}
        </div>
      ) : null}

      {summary.isLoading ? (
        <Spinner />
      ) : summary.error ? (
        <ErrorState message={summary.error.message} />
      ) : counts ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Users"
            value={String(counts.users_total)}
            sub={`${counts.users_boarder} boarders · ${counts.users_landlord} landlords`}
          />
          <StatCard
            label="Properties"
            value={String(counts.properties_total)}
            sub={`${counts.properties_pending_moderation} pending review`}
          />
          <StatCard
            label="Applications"
            value={String(counts.applications_total)}
          />
          <StatCard
            label="Landlord verification"
            value={String(counts.landlords_pending_verification)}
            sub="awaiting approval"
          />
        </div>
      ) : null}

      <div className="mt-6">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                tab === item.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-ink hover:text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <AdminTab
            isLoading={users.isLoading}
            error={users.error}
            empty={!users.data?.data.length}
            emptyTitle="No users found"
          >
            <DataTable rows={users.data!.data} columns={userColumns} keyFor={(row) => row.id} />
          </AdminTab>
        )}

        {tab === 'properties' && (
          <AdminTab
            isLoading={properties.isLoading}
            error={properties.error}
            empty={!properties.data?.data.length}
            emptyTitle="No properties pending review"
          >
            <DataTable
              rows={properties.data!.data}
              columns={propertyColumns}
              keyFor={(row) => row.id}
            />
          </AdminTab>
        )}

        {tab === 'applications' && (
          <AdminTab
            isLoading={applications.isLoading}
            error={applications.error}
            empty={!applications.data?.data.applications.length}
            emptyTitle="No applications"
          >
            {applications.data ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard label="Total" value={String(applications.data.data.stats.total)} />
                  <StatCard label="Pending" value={String(applications.data.data.stats.pending)} />
                  <StatCard label="Approved" value={String(applications.data.data.stats.approved)} />
                  <StatCard
                    label="Processed rate"
                    value={`${applications.data.data.stats.processed_rate_percent}%`}
                    sub={`${applications.data.data.stats.rejected} rejected`}
                  />
                </div>
                <DataTable
                  rows={applications.data.data.applications}
                  columns={applicationColumns}
                  keyFor={(row) => row.id}
                />
              </>
            ) : null}
          </AdminTab>
        )}

        {tab === 'landlords' && (
          <AdminTab
            isLoading={landlords.isLoading}
            error={landlords.error}
            empty={!landlords.data?.data.length}
            emptyTitle="No landlords found"
          >
            <DataTable
              rows={landlords.data!.data}
              columns={landlordColumns}
              keyFor={(row) => row.id}
            />
          </AdminTab>
        )}

        {tab === 'settings' && (
          <AdminTab
            isLoading={settings.isLoading}
            error={settings.error}
            empty={false}
          >
            {settings.data ? (
              <SettingsForm
                settings={settings.data.data}
                busy={saveSettings.isPending}
                onSave={(values) => saveSettings.mutate(values)}
              />
            ) : null}
          </AdminTab>
        )}
      </div>
    </RoleShell>
  );
}

function AdminTab({
  isLoading,
  error,
  empty,
  emptyTitle,
  children,
}: {
  isLoading: boolean;
  error: Error | null;
  empty: boolean;
  emptyTitle?: string;
  children: ReactNode;
}) {
  if (isLoading) return <Spinner />;
  if (error) return <ErrorState message={error.message} />;
  if (empty) return <EmptyState title={emptyTitle ?? 'Nothing here'} />;
  return <>{children}</>;
}

function SettingsForm({
  settings,
  busy,
  onSave,
}: {
  settings: Record<string, string>;
  busy: boolean;
  onSave: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [saved, setSaved] = useState(false);

  const set = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(values);
        setSaved(true);
      }}
    >
      {Object.entries(values).map(([key, value]) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium" htmlFor={`setting-${key}`}>
            {key.replaceAll('_', ' ')}
          </label>
          <input
            id={`setting-${key}`}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            value={value}
            onChange={(event) => set(key, event.target.value)}
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </Button>
        {saved ? <span className="text-sm text-green-600">Saved.</span> : null}
      </div>
    </form>
  );
}
