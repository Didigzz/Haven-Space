import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { LOCATION_SUBTITLE, MapEmbed } from '../../components/rooms/MapEmbed';
import { MapLocationControl } from '../../components/rooms/MapLocationControl';
import { PageHeader } from '../../components/ui/PageHeader';
import { mapUrlForCoordinates } from '../../lib/maps';
import { useBoarderNav } from '../../lib/useBoarderNav';
import { useMapLocation } from '../../lib/useMapLocation';

export const Route = createFileRoute('/boarder/maps')({
  component: MapsPage,
});

function MapsPage() {
  const nav = useBoarderNav();
  const location = useMapLocation();
  const pin = location.coordinates;
  return (
    <Protected role="boarder">
      <RoleShell nav={nav}>
        <PageHeader
          icon="map"
          title="Explore the map"
          subtitle={pin ? LOCATION_SUBTITLE : 'Find boarding houses and available rooms near you.'}
        />
        <MapLocationControl state={location} />
        <MapEmbed
          title="Haven Space map"
          heightClass="h-[70vh]"
          url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
        />
      </RoleShell>
    </Protected>
  );
}
