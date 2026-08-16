import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Icon } from '../../components/ui/Icon';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/maps')({
  component: () => (
    <Protected role="landlord">
      <RoleShell title="Maps" nav={LANDLORD_NAV}>
        <div className="mb-5 flex items-center gap-3">
          <Icon name="map" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-ink">Property map view</h2>
            <p className="text-sm text-gray-ink">See your properties on the map.</p>
          </div>
        </div>
        <iframe
          title="Haven Space map"
          src="https://www.google.com/maps?q=boarding+house+Philippines&output=embed"
          className="h-[70vh] w-full rounded-xl border border-gray-200 shadow-card"
        />
      </RoleShell>
    </Protected>
  ),
});
