import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '../lib/auth-context';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Haven Space' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <RootDocument>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
      </AuthProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="bg-cream text-ink">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
