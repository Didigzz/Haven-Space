import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../../../components/ui/Button';
import { Card } from '../../../../../components/ui/Card';
import { ErrorState } from '../../../../../components/ui/ErrorState';
import { Icon } from '../../../../../components/ui/Icon';
import { Field, SelectInput, TextArea, TextInput } from '../../../../../components/ui/Field';
import { Spinner } from '../../../../../components/ui/Spinner';
import { ApiRequestError } from '../../../../../lib/api/http';
import { getRooms, updateRoom, uploadRoomPhotos } from '../../../../../lib/api/landlord';
import { useAuth } from '../../../../../lib/auth-context';

interface RoomEditSearch {
  propertyId?: string;
}

export const Route = createFileRoute('/landlord/listings/rooms/$id/edit')({
  validateSearch: (search: Record<string, unknown>): RoomEditSearch => ({
    propertyId:
      typeof search.propertyId === 'string' || typeof search.propertyId === 'number'
        ? String(search.propertyId)
        : undefined,
  }),
  component: EditRoomPage,
});

function EditRoomPage() {
  const { id } = Route.useParams();
  const { propertyId } = useSearch({ from: '/landlord/listings/rooms/$id/edit' });
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const roomId = Number(id);
  const propertyIdNumber = propertyId ? Number(propertyId) : null;

  const rooms = useQuery({
    queryKey: ['landlord-rooms', propertyIdNumber],
    queryFn: () => getRooms(token!, propertyIdNumber!),
    enabled: Boolean(token && propertyIdNumber),
  });

  const room = rooms.data?.data.rooms.find(r => r.id === roomId);

  const [form, setForm] = useState({
    room_number: '',
    room_type: '',
    price: '',
    deposit: '',
    status: 'available',
    capacity: '1',
    description: '',
    size: '',
  });
  const [seeded, setSeeded] = useState(false);

  if (room && !seeded) {
    setForm({
      room_number: room.room_number ?? '',
      room_type: room.room_type ?? '',
      price: String(room.price ?? 0),
      deposit: String(room.deposit ?? 0),
      status: room.status ?? 'available',
      capacity: String(room.capacity ?? 1),
      description: room.description ?? '',
      size: room.size == null ? '' : String(room.size),
    });
    setSeeded(true);
  }

  const submit = useMutation({
    mutationFn: () =>
      updateRoom(token!, roomId, {
        ...form,
        price: Number(form.price),
        deposit: Number(form.deposit),
        capacity: Number(form.capacity),
        size: form.size === '' ? undefined : Number(form.size),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyIdNumber] });
      void navigate({
        to: '/landlord/listings/$id/edit',
        params: { id: String(propertyIdNumber) },
      });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update room.'),
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPhotoError(null);
    setUploading(true);
    uploadRoomPhotos(token!, roomId, files)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyIdNumber] });
      })
      .catch(err =>
        setPhotoError(err instanceof ApiRequestError ? err.message : 'Failed to upload photos.')
      )
      .finally(() => setUploading(false));
    e.target.value = '';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    submit.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      {rooms.isLoading ? (
        <Spinner />
      ) : !propertyIdNumber ? (
        <div>
          <ErrorState message="This page needs a propertyId query parameter to load the room." />
          <Link
            to="/landlord/listings"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            ← Back to listings
          </Link>
        </div>
      ) : rooms.error ? (
        <ErrorState message={rooms.error.message} />
      ) : !room ? (
        <ErrorState message="Room not found" />
      ) : (
        <div>
          <Link
            to="/landlord/listings/$id/edit"
            params={{ id: String(propertyIdNumber) }}
            className="mb-4 inline-block text-sm text-primary hover:underline"
          >
            ← Back to listing
          </Link>
          <div className="mb-5 flex items-center gap-3">
            <Icon name="book" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-ink">Edit room {room.room_number}</h1>
              <p className="text-sm text-gray-ink">Update this room's details and photos.</p>
            </div>
          </div>

          {error ? (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          ) : null}

          <Card>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Room number" htmlFor="room_number">
                  <TextInput
                    id="room_number"
                    required
                    value={form.room_number}
                    onChange={e => set('room_number', e.target.value)}
                  />
                </Field>
                <Field label="Room type" htmlFor="room_type">
                  <SelectInput
                    id="room_type"
                    value={form.room_type}
                    onChange={e => set('room_type', e.target.value)}
                  >
                    <option value="">Select type</option>
                    <option value="single">Single</option>
                    <option value="shared">Shared</option>
                  </SelectInput>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Monthly rent (₱)" htmlFor="price">
                  <TextInput
                    id="price"
                    type="number"
                    min={0}
                    required
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                  />
                </Field>
                <Field label="Deposit (₱)" htmlFor="deposit">
                  <TextInput
                    id="deposit"
                    type="number"
                    min={0}
                    value={form.deposit}
                    onChange={e => set('deposit', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Capacity" htmlFor="capacity">
                  <TextInput
                    id="capacity"
                    type="number"
                    min={1}
                    required
                    value={form.capacity}
                    onChange={e => set('capacity', e.target.value)}
                  />
                </Field>
                <Field label="Size (m²)" htmlFor="size">
                  <TextInput
                    id="size"
                    type="number"
                    min={0}
                    value={form.size}
                    onChange={e => set('size', e.target.value)}
                  />
                </Field>
                <Field label="Status" htmlFor="status">
                  <SelectInput
                    id="status"
                    value={form.status}
                    onChange={e => set('status', e.target.value)}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </SelectInput>
                </Field>
              </div>

              <Field label="Description" htmlFor="description">
                <TextArea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
              </Field>

              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </form>

            <section className="mt-8">
              <h2 className="text-lg font-semibold">Photos</h2>
              {photoError ? (
                <div className="mt-2">
                  <ErrorState message={photoError} />
                </div>
              ) : null}
              <label className="mt-3 block cursor-pointer rounded-md border border-dashed border-gray-300 p-4 text-center text-sm hover:bg-gray-50">
                {uploading ? 'Uploading…' : 'Choose photos to upload (jpg/png/webp, max 5 MB each)'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotos}
                />
              </label>
              {room.photos.length > 0 ? (
                <ul className="mt-3 grid grid-cols-3 gap-2">
                  {room.photos.map(photo => (
                    <li
                      key={photo.id}
                      className="overflow-hidden rounded-md border border-gray-200"
                    >
                      <img src={photo.photo_url} alt="" className="h-24 w-full object-cover" />
                      {photo.is_cover ? (
                        <span className="block bg-primary py-0.5 text-center text-xs text-white">
                          Cover
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </Card>
        </div>
      )}
    </div>
  );
}
