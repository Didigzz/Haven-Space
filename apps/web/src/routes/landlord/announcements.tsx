import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { ApiRequestError } from '../../lib/api/http';
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from '../../lib/api/landlord';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';
import type { LandlordAnnouncement } from '../../lib/types';

export const Route = createFileRoute('/landlord/announcements')({
  component: () => (
    <Protected role="landlord">
      <AnnouncementsPage />
    </Protected>
  ),
});

interface AnnouncementForm {
  id: number | null;
  title: string;
  description: string;
  category: string;
  priority: string;
}

const EMPTY_FORM: AnnouncementForm = {
  id: null,
  title: '',
  description: '',
  category: 'general',
  priority: 'medium',
};

function AnnouncementsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const announcements = useQuery({
    queryKey: ['landlord-announcements'],
    queryFn: () => getAnnouncements(token!),
    enabled: Boolean(token),
  });

  const save = useMutation({
    mutationFn: () =>
      form.id === null
        ? createAnnouncement(token!, {
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            priority: form.priority,
          })
        : updateAnnouncement(token!, form.id, {
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            priority: form.priority,
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-announcements'] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save announcement.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAnnouncement(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-announcements'] });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to delete announcement.'),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(announcement: LandlordAnnouncement) {
    setForm({
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      category: announcement.category,
      priority: announcement.priority,
    });
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    save.mutate();
  }

  const list = announcements.data?.data.announcements ?? [];

  return (
    <RoleShell title="Announcements" nav={LANDLORD_NAV}>
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon name="announcement" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-ink">Announcements</h2>
            <p className="text-sm text-gray-ink">Reach your boarders with updates.</p>
          </div>
        </div>
        <Button onClick={openCreate}>+ New announcement</Button>
      </div>

      {announcements.isLoading ? (
        <Spinner />
      ) : announcements.error ? (
        <ErrorState message={announcements.error.message} />
      ) : list.length === 0 ? (
        <EmptyState
          title="No announcements"
          description="Create an announcement to reach your boarders."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map(announcement => (
            <Card key={announcement.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{announcement.title}</h2>
                    {announcement.priority === 'high' ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        High priority
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-gray-ink">
                    {announcement.category} · {announcement.priority} priority ·{' '}
                    {announcement.target_property}
                  </p>
                  <p className="mt-1 text-sm">{announcement.description}</p>
                  <p className="mt-1 text-xs text-gray-ink">
                    {announcement.view_count} view(s) ·{' '}
                    {announcement.publish_date
                      ? new Date(announcement.publish_date).toLocaleDateString()
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => openEdit(announcement)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => remove.mutate(announcement.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={form.id === null ? 'New announcement' : 'Edit announcement'}
        onClose={() => setModalOpen(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="Title" htmlFor="title">
            <TextInput
              id="title"
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </Field>
          <Field label="Message" htmlFor="description">
            <TextArea
              id="description"
              rows={4}
              required
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="category">
              <SelectInput
                id="category"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="urgent">Urgent</option>
                <option value="reminder">Reminder</option>
                <option value="event">Event</option>
              </SelectInput>
            </Field>
            <Field label="Priority" htmlFor="priority">
              <SelectInput
                id="priority"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </SelectInput>
            </Field>
          </div>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : form.id === null ? 'Create' : 'Save changes'}
          </Button>
        </form>
      </Modal>
    </RoleShell>
  );
}
