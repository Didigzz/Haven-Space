import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Field, SelectInput, TextArea } from '../../../../components/ui/Field';
import { ApiRequestError } from '../../../../lib/api/http';
import { createApplication } from '../../../../lib/api/boarder';
import { getRoomDetail } from '../../../../lib/api/public';
import { useAuth } from '../../../../lib/auth-context';

export const Route = createFileRoute('/boarder/find-a-room/$id/apply')({
  component: ApplyPage,
});

function ApplyPage() {
  const { id } = Route.useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['listing', Number(id)],
    queryFn: () => getRoomDetail(Number(id)),
  });

  const submit = useMutation({
    mutationFn: () =>
      createApplication(token!, {
        room_id: Number(roomId),
        landlord_id: detail.data!.data.landlord.id,
        message: message.trim(),
      }),
    onSuccess: () => void navigate({ to: '/boarder/application-submitted' }),
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to submit application.'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!roomId) {
      setError('Select a room to apply for.');
      return;
    }
    submit.mutate();
  }

  if (detail.isLoading) return null;
  if (detail.error) return <ErrorState message={detail.error.message} />;
  if (!detail.data) return null;

  const listing = detail.data.data;
  const availableRooms = listing.rooms.filter(room => room.status !== 'Occupied');

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/boarder/find-a-room/$id"
        params={{ id }}
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← Back to {listing.title}
      </Link>

      <h1 className="text-2xl font-bold">Apply to {listing.title}</h1>
      <p className="mt-1 text-gray-ink">
        {listing.address}, {listing.city} — {listing.landlord.name}
      </p>

      {error ? (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Room" htmlFor="room">
          <SelectInput
            id="room"
            name="room"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
          >
            <option value="">Select a room</option>
            {availableRooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.roomNumber} — ₱{room.price.toLocaleString()} ({room.capacity} occupant(s))
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Message to landlord" htmlFor="message">
          <TextArea
            id="message"
            name="message"
            rows={4}
            placeholder="Introduce yourself and tell the landlord why you're a good fit…"
            required
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </Field>

        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? 'Submitting…' : 'Submit Application'}
        </Button>
      </form>
    </div>
  );
}
