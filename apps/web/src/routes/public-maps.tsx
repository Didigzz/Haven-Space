import { createFileRoute } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { LOCATION_SUBTITLE, MapEmbed, mapSubtitle } from '../components/rooms/MapEmbed';
import { MapLocationControl } from '../components/rooms/MapLocationControl';
import { PageHeader } from '../components/ui/PageHeader';
import { mapUrlForCoordinates } from '../lib/maps';
import { useMapLocation } from '../lib/useMapLocation';

export const Route = createFileRoute('/public-maps')({
  component: PublicMapsPage,
});

function PublicMapsPage() {
  const location = useMapLocation();
  const pin = location.coordinates;
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader title="Public map" subtitle={pin ? LOCATION_SUBTITLE : mapSubtitle()} />
        <MapLocationControl state={location} />
        <MapEmbed
          title="Haven Space public map"
          heightClass="h-[60vh]"
          url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
        />
      </div>
    </PublicLayout>
  );
}
