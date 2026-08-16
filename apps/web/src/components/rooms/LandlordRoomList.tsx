import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ErrorState } from '../ui/ErrorState';
import { Field, SelectInput, TextInput } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { StatusBadge } from '../ui/StatusBadge';
import { ApiRequestError } from '../../lib/api/http';
import { createRoom, deleteRoom, getRooms } from '../../lib/api/landlord';
import type { LandlordRoom } from '../../lib/types';

interface AddRoomForm {
  room_number: string;
  room_type: string;
  price: string;
  deposit: string;
  capacity: string;
}

const EMPTY_ROOM_FORM: AddRoomForm = {
  room_number: '',
  room_type: 'single',
  price: '',
  deposit: '',
  capacity: '1',
};

/**
 * Landlord room management block: lists a property's rooms with per-room edit
 * links and add/delete affordances. Owns its own data fetching and mutations so
 * it can be embedded on any landlord page (listing edit, properties, etc.).
 */
export function LandlordRoomList({ token, propertyId }: { token: string; propertyId: number }) {
  const queryClient = useQueryClient();
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [roomForm, setRoomForm] = useState<AddRoomForm>(EMPTY_ROOM_FORM);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LandlordRoom | null>(null);

  const rooms = useQuery({
    queryKey: ['landlord-rooms', propertyId],
    queryFn: () => getRooms(token, propertyId),
    enabled: Boolean(token),
  });

  const addRoom = useMutation({
    mutationFn: () =>
      createRoom(token, {
        property_id: propertyId,
        room_number: roomForm.room_number.trim(),
        room_type: roomForm.room_type,
        price: Number(roomForm.price),
        deposit: roomForm.deposit === '' ? 0 : Number(roomForm.deposit),
        capacity: Number(roomForm.capacity),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyId] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      setAddRoomOpen(false);
      setRoomForm(EMPTY_ROOM_FORM);
      setRoomError(null);
    },
    onError: err =>
      setRoomError(err instanceof ApiRequestError ? err.message : 'Failed to add room.'),
  });

  const removeRoom = useMutation({
    mutationFn: (roomId: number) => deleteRoom(token, roomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyId] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      setDeleteError(null);
    },
    onError: err =>
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Failed to delete room.'),
  });

  function handleAddRoom(e: FormEvent) {
    e.preventDefault();
    setRoomError(null);
    addRoom.mutate();
  }

  return (
    <>
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Rooms</h2>
            <p className="mt-1 text-sm text-gray-ink">
              Edit each room&apos;s price, status, and photos, or add new rooms.
            </p>
          </div>
          <Button onClick={() => setAddRoomOpen(true)}>+ Add room</Button>
        </div>

        {deleteError ? (
          <div className="mt-4">
            <ErrorState message={deleteError} />
          </div>
        ) : null}

        {rooms.isLoading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : rooms.error ? (
          <div className="mt-4">
            <ErrorState message={rooms.error.message} />
          </div>
        ) : (rooms.data?.data.rooms.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-gray-ink">No rooms on this listing yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
            {rooms.data!.data.rooms.map(room => (
              <li
                key={room.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-ink">{room.room_number}</p>
                  <p className="text-sm text-gray-ink">
                    {room.room_type === 'single' ? 'Single' : 'Shared'} · ₱
                    {room.price.toLocaleString()}/mo · Capacity {room.capacity}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={room.status} />
                  <Link
                    to="/landlord/listings/rooms/$id/edit"
                    params={{ id: String(room.id) }}
                    search={{ propertyId: String(propertyId) }}
                    className="rounded-full border border-primary px-3 py-1 text-sm font-semibold text-primary hover:bg-mint"
                  >
                    Edit room
                  </Link>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    disabled={removeRoom.isPending}
                    onClick={() => setPendingDelete(room)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={addRoomOpen} title="Add a room" onClose={() => setAddRoomOpen(false)}>
        <form className="flex flex-col gap-4" onSubmit={handleAddRoom}>
          {roomError ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{roomError}</div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room number" htmlFor="room_number">
              <TextInput
                id="room_number"
                required
                value={roomForm.room_number}
                onChange={e => setRoomForm(f => ({ ...f, room_number: e.target.value }))}
              />
            </Field>
            <Field label="Room type" htmlFor="room_type">
              <SelectInput
                id="room_type"
                value={roomForm.room_type}
                onChange={e => setRoomForm(f => ({ ...f, room_type: e.target.value }))}
              >
                <option value="single">Single</option>
                <option value="shared">Shared</option>
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Monthly rent (₱)" htmlFor="room_price">
              <TextInput
                id="room_price"
                type="number"
                min={0}
                required
                value={roomForm.price}
                onChange={e => setRoomForm(f => ({ ...f, price: e.target.value }))}
              />
            </Field>
            <Field label="Deposit (₱)" htmlFor="room_deposit">
              <TextInput
                id="room_deposit"
                type="number"
                min={0}
                value={roomForm.deposit}
                onChange={e => setRoomForm(f => ({ ...f, deposit: e.target.value }))}
              />
            </Field>
            <Field label="Capacity" htmlFor="room_capacity">
              <TextInput
                id="room_capacity"
                type="number"
                min={1}
                required
                value={roomForm.capacity}
                onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))}
              />
            </Field>
          </div>
          <Button type="submit" disabled={addRoom.isPending}>
            {addRoom.isPending ? 'Adding…' : 'Add room'}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete room"
        message={
          <>
            Delete <strong>{pendingDelete?.room_number}</strong>? This cannot be undone.
          </>
        }
        confirmLabel="Delete room"
        busy={removeRoom.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          removeRoom.mutate(pendingDelete.id, {
            onSuccess: () => setPendingDelete(null),
          });
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
