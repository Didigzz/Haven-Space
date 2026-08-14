import { createFileRoute } from '@tanstack/react-router';

// Placeholder route so Phase 0 navigation targets resolve. The full form lands in Phase 2.
export const Route = createFileRoute('/auth/login')({
  component: () => (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="text-gray-ink">The login form lands in Phase 2.</p>
    </main>
  ),
});
