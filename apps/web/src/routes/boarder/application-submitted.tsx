import { Link, createFileRoute } from '@tanstack/react-router';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Card } from '../../components/ui/Card';
import { BOARDER_NAV } from '../../lib/nav';

export const Route = createFileRoute('/boarder/application-submitted')({
  component: () => (
    <Protected role="boarder">
      <RoleShell title="Application submitted" nav={BOARDER_NAV}>
        <Card className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold">Application submitted!</h1>
          <p className="mt-2 text-gray-ink">
            The landlord will review your application and you'll be notified of their decision.
          </p>
          <Link
            to="/boarder/applications"
            className="mt-4 inline-block text-primary hover:underline"
          >
            View your applications
          </Link>
        </Card>
      </RoleShell>
    </Protected>
  ),
});
