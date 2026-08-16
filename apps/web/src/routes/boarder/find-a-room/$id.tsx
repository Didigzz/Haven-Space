import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/boarder/find-a-room/$id')({
  component: () => <Outlet />,
});
