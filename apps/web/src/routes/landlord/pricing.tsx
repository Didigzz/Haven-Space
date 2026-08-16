import { createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/pricing')({
  component: () => (
    <Protected role="landlord">
      <RoleShell title="Pricing" nav={LANDLORD_NAV}>
        <Card className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold">Simple, Transparent Pricing</h1>
          <h2 className="mt-3 text-lg font-semibold">Landlord Premium</h2>
          <p className="mt-2 text-sm text-gray-ink">
            List unlimited properties, accept applications, and manage boarders with no credit card
            required. Cancel anytime.
          </p>
          <p className="mt-4 text-sm text-gray-ink">
            What&apos;s included: unlimited listings, application management, boarder management,
            announcements, and payment tracking.
          </p>
        </Card>
      </RoleShell>
    </Protected>
  ),
});
