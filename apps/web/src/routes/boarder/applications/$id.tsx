import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, SelectInput } from '../../../components/ui/Field';
import { Spinner } from '../../../components/ui/Spinner';
import { ApiRequestError } from '../../../lib/api/http';
import { confirmApplication, deleteApplication, getApplication } from '../../../lib/api/boarder';
import { useAuth } from '../../../lib/auth-context';

export const Route = createFileRoute('/boarder/applications/$id')({
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [error, setError] = useState<string | null>(null);

  const application = useQuery({
    queryKey: ['application', Number(id)],
    queryFn: () => getApplication(token!, Number(id)),
    enabled: Boolean(token),
  });

  const confirm = useMutation({
    mutationFn: () => confirmApplication(token!, Number(id), paymentMethod),
    onSuccess: () => void navigate({ to: '/boarder/confirm-booking' }),
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to confirm booking.'),
  });

  const remove = useMutation({
    mutationFn: () => deleteApplication(token!, Number(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void navigate({ to: '/boarder/applications' });
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to delete application.'),
  });

  if (application.isLoading) return <Spinner />;
  if (application.error) return <ErrorState message={application.error.message} />;
  if (!application.data?.data) return <ErrorState message="Application not found" />;

  const app = application.data.data;
  const isAccepted = app.status === 'accepted';

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/boarder/applications"
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← Back to applications
      </Link>

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <Card>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{app.property?.title ?? app.room?.title ?? `Application #${app.id}`}</h1>
          <span className="rounded-full bg-mint px-3 py-1 text-sm capitalize">
            {String(app.status).replace(/_/g, ' ')}
          </span>
        </div>
        <p className="mt-1 text-gray-ink">
          Room {app.room?.room_number ?? '—'} · ₱{app.room?.price?.toLocaleString() ?? '—'} / month
        </p>
        {app.property ? (
          <p className="text-sm text-gray-ink">
            {app.property.address}, {app.property.city}
          </p>
        ) : null}
        {app.message ? (
          <p className="mt-3 rounded-md bg-cream p-3 text-sm">{app.message}</p>
        ) : null}
      </Card>

      {isAccepted ? (
        <Card className="mt-4">
          <h2 className="font-semibold">Confirm your booking</h2>
          <p className="mt-1 text-sm text-gray-ink">
            Choose a payment method to confirm your spot in this room.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="Payment method" htmlFor="paymentMethod">
              <SelectInput
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
              </SelectInput>
            </Field>
            <Button onClick={() => confirm.mutate()} disabled={confirm.isPending}>
              {confirm.isPending ? 'Confirming…' : 'Confirm Booking'}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6">
        <Button
          className="bg-red-600 hover:bg-red-700"
          onClick={() => remove.mutate()}
          disabled={remove.isPending || isAccepted}
        >
          {remove.isPending ? 'Deleting…' : 'Delete application'}
        </Button>
      </div>
    </div>
  );
}
