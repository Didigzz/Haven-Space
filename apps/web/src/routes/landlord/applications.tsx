import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import { ApiRequestError } from '../../lib/api/http';
import { getApplications, patchApplicationStatus } from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import type { ApplicationSummary } from '../../lib/types';

export const Route = createFileRoute('/landlord/applications')({
  component: () => (
    <Protected role="landlord">
      <ApplicationsPage />
    </Protected>
  ),
});

function ApplicationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const applications = useQuery({
    queryKey: ['landlord-applications'],
    queryFn: () => getApplications(token!),
    enabled: Boolean(token),
  });

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      patchApplicationStatus(token!, id, status),
    onSuccess: (_data, { status }) => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-applications'] });
      push({
        tone: 'success',
        message: status === 'accepted' ? 'Application accepted.' : 'Application rejected.',
      });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update application.'),
  });

  if (applications.isLoading) return <Spinner />;
  if (applications.error) return <ErrorState message={applications.error.message} />;
  if (!applications.data || applications.data.data.length === 0) {
    return <EmptyState title="No applications" description="Boarder applications appear here." />;
  }

  return (
    <RoleShell title="Applications" nav={LANDLORD_NAV}>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <div className="mb-5 flex items-center gap-3">
        <Icon name="application" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-ink">Applications</h2>
          <p className="text-sm text-gray-ink">Review and respond to boarder applications.</p>
        </div>
      </div>
      <DataTable<ApplicationSummary>
        rows={applications.data.data}
        keyFor={row => row.id}
        columns={[
          {
            header: 'Property',
            cell: row => row.property_title,
          },
          {
            header: 'Room',
            cell: row => `${row.room_title} · ₱${row.room_price.toLocaleString()}`,
          },
          {
            header: 'Boarder',
            cell: row => `${row.first_name} ${row.last_name}`,
          },
          {
            header: 'Status',
            cell: row => <StatusBadge status={String(row.status)} />,
          },
          {
            header: 'Actions',
            cell: row =>
              row.status === 'pending' ? (
                <div className="flex gap-2">
                  <Button
                    className="px-2 py-1 text-xs"
                    onClick={() => patchStatus.mutate({ id: row.id, status: 'accepted' })}
                    disabled={patchStatus.isPending}
                  >
                    Accept
                  </Button>
                  <Button
                    className="bg-red-600 px-2 py-1 text-xs hover:bg-red-700"
                    onClick={() => patchStatus.mutate({ id: row.id, status: 'rejected' })}
                    disabled={patchStatus.isPending}
                  >
                    Reject
                  </Button>
                </div>
              ) : null,
          },
        ]}
      />
    </RoleShell>
  );
}
