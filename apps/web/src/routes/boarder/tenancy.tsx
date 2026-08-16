import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ApiRequestError } from '../../lib/api/http';
import { getTenancy, leaveRequest } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';
import { BOARDER_NAV } from '../../lib/nav';

export const Route = createFileRoute('/boarder/tenancy')({
  component: () => (
    <Protected role="boarder">
      <TenancyPage />
    </Protected>
  ),
});

function TenancyPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tenancy = useQuery({
    queryKey: ['tenancy'],
    queryFn: () => getTenancy(token!),
    enabled: Boolean(token),
  });

  const leave = useMutation({
    mutationFn: () =>
      leaveRequest(token!, {
        reason: reason.trim(),
        leave_date: leaveDate,
        message: message.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenancy'] });
      setLeaveOpen(false);
      setReason('');
      setLeaveDate('');
      setMessage('');
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to submit leave request.'),
  });

  function handleLeaveSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    leave.mutate();
  }

  const data = tenancy.data?.data;
  const leaveStatus =
    typeof data?.leave_request_status === 'string' ? data.leave_request_status : 'none';

  return (
    <RoleShell title="Tenancy" nav={BOARDER_NAV}>
      {tenancy.isLoading ? (
        <Spinner />
      ) : !data ? (
        <EmptyState
          title="No active tenancy"
          description="Once your booking is confirmed, your tenancy details appear here."
        />
      ) : leaveStatus === 'pending' ? (
        <PendingLeaveState data={data} />
      ) : (
        <div className="max-w-2xl">
          {error ? (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          ) : null}
          <Card>
            <div className="flex items-center gap-3">
              <Icon name="document" size={28} className="shrink-0" />
              <h1 className="text-xl font-bold">{String(data.property_name ?? 'Your tenancy')}</h1>
            </div>
            <p className="mt-1 text-gray-ink">
              {String(data.address ?? '')}
              {data.city ? `, ${String(data.city)}` : ''}
              {data.province ? `, ${String(data.province)}` : ''}
            </p>
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-ink">Room</dt>
                <dd className="font-medium">
                  {String(data.room_number ?? data.room_title ?? '—')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-ink">Monthly rent</dt>
                <dd className="font-medium">₱{Number(data.monthly_rent ?? 0).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-ink">Move-in date</dt>
                <dd className="font-medium">{String(data.tenancy_start_date ?? '—')}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-ink">Deposit</dt>
                <dd className="font-medium">₱{Number(data.deposit ?? 0).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <Button
                className="border border-primary bg-white text-primary hover:bg-mint"
                onClick={() => setLeaveOpen(true)}
              >
                Request to leave
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal open={leaveOpen} title="Request to leave" onClose={() => setLeaveOpen(false)}>
        <form className="flex flex-col gap-4" onSubmit={handleLeaveSubmit}>
          <Field label="Reason" htmlFor="reason">
            <TextInput
              id="reason"
              placeholder="e.g., Moving to a new city"
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </Field>
          <Field label="Leave date" htmlFor="leaveDate">
            <TextInput
              id="leaveDate"
              type="date"
              required
              value={leaveDate}
              onChange={e => setLeaveDate(e.target.value)}
            />
          </Field>
          <Field label="Message" htmlFor="leaveMessage">
            <TextArea
              id="leaveMessage"
              rows={3}
              placeholder="Anything the landlord should know…"
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={leave.isPending}>
            {leave.isPending ? 'Submitting…' : 'Submit request'}
          </Button>
        </form>
      </Modal>
    </RoleShell>
  );
}

function PendingLeaveState({ data }: { data: Record<string, unknown> }) {
  const propertyName = String(data.property_name ?? 'Your tenancy');
  const address = [
    String(data.address ?? ''),
    data.city ? String(data.city) : '',
    data.province ? String(data.province) : '',
  ]
    .filter(Boolean)
    .join(', ');
  const reason =
    typeof data.leave_request_reason === 'string' && data.leave_request_reason
      ? data.leave_request_reason
      : null;
  const intendedDate =
    typeof data.intended_leave_date === 'string' && data.intended_leave_date
      ? data.intended_leave_date
      : null;
  const submittedDate =
    typeof data.leave_request_date === 'string' && data.leave_request_date
      ? data.leave_request_date
      : null;

  return (
    <div className="max-w-2xl">
      <Card>
        <div className="flex items-center gap-3">
          <Icon name="document" size={28} className="shrink-0" />
          <h1 className="text-xl font-bold">{propertyName}</h1>
          <StatusBadge status="pending" />
        </div>
        {address ? <p className="mt-1 text-gray-ink">{address}</p> : null}
        <div className="mt-4 rounded-lg bg-mint/60 p-4">
          <p className="font-semibold text-primary">Leave request pending</p>
          <p className="mt-1 text-sm text-gray-ink">
            Your landlord will review your request. Your room stays reserved for you until it&apos;s
            approved, and you can&apos;t submit another request until it&apos;s resolved.
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {reason ? (
            <div>
              <dt className="text-sm text-gray-ink">Reason</dt>
              <dd className="font-medium">{reason}</dd>
            </div>
          ) : null}
          {intendedDate ? (
            <div>
              <dt className="text-sm text-gray-ink">Intended leave date</dt>
              <dd className="font-medium">{intendedDate}</dd>
            </div>
          ) : null}
          {submittedDate ? (
            <div>
              <dt className="text-sm text-gray-ink">Requested on</dt>
              <dd className="font-medium">{submittedDate}</dd>
            </div>
          ) : null}
        </dl>
      </Card>
    </div>
  );
}
