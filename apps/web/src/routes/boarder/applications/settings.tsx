import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

export const Route = createFileRoute('/boarder/applications/settings')({
  component: ApplicationSettingsPage,
});

function ApplicationSettingsPage() {
  const [prefs, setPrefs] = useState({
    application_updates: true,
    landlord_messages: true,
    announcements: false,
  });
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  return (
    <Card>
      <h1 className="text-xl font-bold">Application notifications</h1>
      <p className="mt-1 text-sm text-gray-ink">
        These preferences are stored locally in this browser — the API does not yet expose a
        notification-settings endpoint.
      </p>

      <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        {(
          [
            ['application_updates', 'Application status updates'],
            ['landlord_messages', 'Messages from landlords'],
            ['announcements', 'Property announcements'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => toggle(key)}
              className="h-4 w-4 accent-primary"
            />
            {label}
          </label>
        ))}
        <div className="mt-2">
          <Button type="submit">Save preferences</Button>
        </div>
        {saved ? <p className="text-sm text-gray-ink">Preferences saved (locally).</p> : null}
      </form>
    </Card>
  );
}
