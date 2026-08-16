import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { getBoarderAnnouncements, viewAnnouncement } from '../../lib/api/boarder';
import { useAuth } from '../../lib/auth-context';
import { BOARDER_NAV } from '../../lib/nav';
import type { Announcement } from '../../lib/types';

export const Route = createFileRoute('/boarder/announcements')({
  component: () => (
    <Protected role="boarder">
      <AnnouncementsPage />
    </Protected>
  ),
});

function AnnouncementsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Announcement | null>(null);

  const announcements = useQuery({
    queryKey: ['announcements'],
    queryFn: () => getBoarderAnnouncements(token!),
    enabled: Boolean(token),
  });

  const view = useMutation({
    mutationFn: (id: number) => viewAnnouncement(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  function open(announcement: Announcement) {
    setSelected(announcement);
    if (!announcement.is_viewed) view.mutate(announcement.id);
  }

  const list = announcements.data?.data.announcements ?? [];

  return (
    <RoleShell title="Announcements" nav={BOARDER_NAV}>
      {announcements.isLoading ? (
        <Spinner />
      ) : announcements.error ? (
        <ErrorState message={announcements.error.message} />
      ) : list.length === 0 ? (
        <EmptyState title="No announcements" description="Announcements from your landlord appear here." />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((announcement) => (
            <button
              key={announcement.id}
              type="button"
              onClick={() => open(announcement)}
              className="rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-primary"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{announcement.title}</h2>
                <div className="flex items-center gap-2">
                  {announcement.priority === 'high' ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      High priority
                    </span>
                  ) : null}
                  {!announcement.is_viewed ? (
                    <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-ink">{announcement.category}</p>
              <p className="mt-2 line-clamp-2 text-sm">{announcement.body}</p>
            </button>
          ))}
        </div>
      )}

      <Modal open={Boolean(selected)} title={selected?.title ?? ''} onClose={() => setSelected(null)}>
        {selected ? (
          <div>
            <p className="text-sm text-gray-ink">
              {selected.category} · {new Date(selected.created_at).toLocaleDateString()}
            </p>
            <p className="mt-3 whitespace-pre-line">{selected.body}</p>
          </div>
        ) : null}
      </Modal>
    </RoleShell>
  );
}
