import { createFileRoute, Link } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { MapEmbed, mapSubtitle } from '../components/rooms/MapEmbed';
import { buttonClasses } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';

export const Route = createFileRoute('/public-maps')({
  component: PublicMapsPage,
});

/**
 * The public, view-only map (spec `public-maps-view-only`).
 *
 * Deliberately does **not** mount the shared map-location hook or its control: visitors get a
 * plain overview, so this page never asks for a position, never reads the stored opt-in and
 * always renders the Malaybalay embed. Leaving the feature out entirely — rather than just hiding
 * the button — is what makes that structural instead of conditional. (The scan in
 * `test/maps.test.ts` asserts that absence, so this comment is kept free of the identifiers.)
 *
 * The "map near me" surface is `/maps`, which the row above the frame links to.
 */
function PublicMapsPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader title="Public map" subtitle={mapSubtitle()} />
        <div className="mb-4 flex flex-wrap items-center justify-end">
          <Link to="/maps" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
            <Icon name="map" size={16} className="mr-1.5" />
            Open the interactive map
          </Link>
        </div>
        <MapEmbed title="Haven Space public map" heightClass="h-[60vh]" />
      </div>
    </PublicLayout>
  );
}
