import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, SelectInput, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ApiRequestError } from '../../lib/api/http';
import {
  addBoarder,
  approveLeaveRequest,
  declineLeaveRequest,
  getBoarders,
  getProperties,
  getRooms,
  removeBoarder,
  updateBoarder,
} from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import type { LandlordBoarder } from '../../lib/types';

export const Route = createFileRoute('/landlord/boarders')({
  component: () => (
    <Protected role="landlord">
      <BoardersPage />
    </Protected>
  ),
});

interface BoarderForm {
  id: number | null;
  first_name: string;
  last_name: string;
  email: string;
  room_id: string;
  move_in_date: string;
}

const EMPTY_FORM: BoarderForm = {
  id: null,
  first_name: '',
  last_name: '',
  email: '',
  room_id: '',
  move_in_date: '',
};

function BoardersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [propertyId, setPropertyId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BoarderForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const properties = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: () => getProperties(token!),
    enabled: Boolean(token),
  });

  const propertyIdNumber = propertyId ? Number(propertyId) : null;

  const boarders = useQuery({
    queryKey: ['boarders', propertyIdNumber],
    queryFn: () => getBoarders(token!, propertyIdNumber!),
    enabled: Boolean(token && propertyIdNumber),
  });

  const rooms = useQuery({
    queryKey: ['landlord-rooms', propertyIdNumber],
    queryFn: () => getRooms(token!, propertyIdNumber!),
    enabled: Boolean(token && propertyIdNumber),
  });

  const availableRooms = (rooms.data?.data.rooms ?? []).filter(
    room => room.status !== 'occupied' || form.id
  );

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        property_id: propertyIdNumber,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        room_id: Number(form.room_id),
        ...(form.move_in_date ? { move_in_date: form.move_in_date } : {}),
      };
      return form.id === null
        ? addBoarder(token!, payload)
        : updateBoarder(token!, { ...payload, id: form.id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['boarders', propertyIdNumber] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save boarder.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => removeBoarder(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['boarders', propertyIdNumber] });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to remove boarder.'),
  });

  const respond = useMutation({
    mutationFn: ({
      applicationId,
      action,
    }: {
      applicationId: number;
      action: 'approve' | 'decline';
    }) =>
      action === 'approve'
        ? approveLeaveRequest(token!, applicationId)
        : declineLeaveRequest(token!, applicationId),
    onSuccess: () => {
      // Approval frees the room and changes occupancy, so refresh rooms too.
      void queryClient.invalidateQueries({ queryKey: ['boarders', propertyIdNumber] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-rooms', propertyIdNumber] });
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update leave request.'),
  });

  function openAdd() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(boarder: LandlordBoarder) {
    setForm({
      id: boarder.id,
      first_name: boarder.first_name,
      last_name: boarder.last_name,
      email: boarder.email ?? '',
      room_id: boarder.room_id ? String(boarder.room_id) : '',
      move_in_date: boarder.move_in_date ?? '',
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    save.mutate();
  }

  const boarderList = boarders.data?.data.boarders ?? [];

  return (
    <RoleShell title="Boarders" nav={LANDLORD_NAV}>
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="mb-5 flex items-center gap-3">
        <Icon name="users" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-ink">Boarders</h2>
          <p className="text-sm text-gray-ink">Manage the tenants in your properties.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="w-72">
          <Field label="Property" htmlFor="propertyId">
            <SelectInput
              id="propertyId"
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
            >
              <option value="">Select a property</option>
              {properties.data?.data.properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        {propertyIdNumber ? <Button onClick={openAdd}>+ Add boarder</Button> : null}
      </div>

      {!propertyIdNumber ? (
        <EmptyState
          title="Select a property"
          description="Choose a property to see its boarders."
        />
      ) : boarders.isLoading ? (
        <Spinner />
      ) : boarders.error ? (
        <ErrorState message={boarders.error.message} />
      ) : boarderList.length === 0 ? (
        <EmptyState title="No boarders" description="Add your first boarder to get started." />
      ) : (
        <DataTable<LandlordBoarder>
          rows={boarderList}
          keyFor={row => row.id}
          columns={[
            {
              header: 'Name',
              cell: row => `${row.first_name} ${row.last_name}`,
            },
            { header: 'Email', cell: row => row.email ?? '—' },
            { header: 'Room', cell: row => row.room_title ?? '—' },
            {
              header: 'Rent',
              cell: row => `₱${row.rent.toLocaleString()}`,
            },
            {
              header: 'Status',
              cell: row => {
                if (row.leave_request_status === 'pending') {
                  return <StatusBadge status="pending" label="Leave requested" />;
                }
                if (row.leave_request_status === 'approved') {
                  return <StatusBadge status="approved" label="Leaving approved" />;
                }
                return <StatusBadge status="active" />;
              },
            },
            {
              header: 'Actions',
              cell: row => {
                const isPendingLeave = row.leave_request_status === 'pending';
                return (
                  <div className="flex items-center gap-2">
                    {isPendingLeave ? (
                      <>
                        <button
                          type="button"
                          className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                          disabled={respond.isPending}
                          onClick={() =>
                            respond.mutate({ applicationId: row.application_id, action: 'approve' })
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="text-sm text-red-600 hover:underline disabled:opacity-50"
                          disabled={respond.isPending}
                          onClick={() =>
                            respond.mutate({ applicationId: row.application_id, action: 'decline' })
                          }
                        >
                          Decline
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => remove.mutate(row.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              },
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        title={form.id === null ? 'Add boarder' : 'Edit boarder'}
        onClose={() => setModalOpen(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="first_name">
              <TextInput
                id="first_name"
                required
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              />
            </Field>
            <Field label="Last name" htmlFor="last_name">
              <TextInput
                id="last_name"
                required
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label="Room" htmlFor="room_id">
            <SelectInput
              id="room_id"
              required
              value={form.room_id}
              onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
            >
              <option value="">Select a room</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.room_number} — ₱{room.price.toLocaleString()} ({room.status})
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Move-in date" htmlFor="move_in_date">
            <TextInput
              id="move_in_date"
              type="date"
              value={form.move_in_date}
              onChange={e => setForm(f => ({ ...f, move_in_date: e.target.value }))}
            />
          </Field>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : form.id === null ? 'Add boarder' : 'Save changes'}
          </Button>
        </form>
      </Modal>
    </RoleShell>
  );
}
