import { test, expect } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  DEFAULT_MAP_URL,
  DEFAULT_MAP_ZOOM,
  MAP_LOCATION_QUERY,
  USER_LOCATION_MAP_ZOOM,
  mapUrlForCoordinates,
  osmEmbedUrl,
} from '../src/lib/maps';
import {
  GEOLOCATION_TIMEOUT_MS,
  LOCATION_OPT_IN_KEY,
  hasLocationOptIn,
  type UserCoordinates,
} from '../src/lib/geolocation';
import { useMapLocation } from '../src/lib/useMapLocation';
import { mapSubtitle } from '../src/components/rooms/MapEmbed';

const SRC_DIR = join(import.meta.dir, '..', 'src');

/** Every `.ts`/`.tsx` file under `src`, so a regression can't hide in an unread file. */
function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

// Regression: all four map pages hardcoded their own nationwide search
// (`?q=boarding+house+Philippines`), so none of them showed a meaningful location and the
// strings drifted apart. The locale now lives in one module (spec `auth-hero-map-locale`).
const MAP_ROUTES = [
  'routes/maps.tsx',
  'routes/public-maps.tsx',
  'routes/boarder/maps.tsx',
  'routes/landlord/maps.tsx',
];

/** Every surface that shows a map, for the "no coordinates leave the device" scan below. */
const MAP_SURFACE_FILES = [
  ...MAP_ROUTES,
  'components/rooms/MapEmbed.tsx',
  'components/rooms/MapLocationControl.tsx',
  'components/rooms/RoomDetailView.tsx',
];

// --- Static locale (spec `auth-hero-map-locale`) -------------------------------------------

test('the canonical map locale is Malaybalay, Bukidnon', () => {
  expect(MAP_LOCATION_QUERY).toBe('Malaybalay, Bukidnon');
});

test('the default map URL pins the locale at city zoom', () => {
  expect(DEFAULT_MAP_ZOOM).toBe(13);
  expect(DEFAULT_MAP_URL).toContain(`q=${encodeURIComponent(MAP_LOCATION_QUERY)}`);
  expect(DEFAULT_MAP_URL).toContain('output=embed');
  expect(DEFAULT_MAP_URL.endsWith(`&z=${DEFAULT_MAP_ZOOM}`)).toBe(true);
});

test('every map route renders the shared embed, not a literal URL', () => {
  for (const route of MAP_ROUTES) {
    const source = readFileSync(join(SRC_DIR, route), 'utf8');
    expect(source).toContain('<MapEmbed');
    expect(source).not.toContain('<iframe');
    expect(source).not.toContain('https://www.google.com/maps');
  }
});

test('the shared embed is the single place the map URL is consumed', () => {
  const embed = readFileSync(join(SRC_DIR, 'components/rooms/MapEmbed.tsx'), 'utf8');
  // A runtime position when the user shared one, otherwise the Malaybalay embed.
  expect(embed).toContain('url ?? DEFAULT_MAP_URL');
});

test('no source file still hardcodes the old nationwide map search', () => {
  const offenders = sourceFiles(SRC_DIR).filter(file =>
    readFileSync(file, 'utf8').includes('boarding+house+Philippines')
  );
  expect(offenders).toEqual([]);
});

// --- Runtime coordinates (spec `map-use-location`) -----------------------------------------

test('the user-location zoom is neighbourhood level, tighter than the default', () => {
  expect(USER_LOCATION_MAP_ZOOM).toBe(15);
  expect(USER_LOCATION_MAP_ZOOM).toBeGreaterThan(DEFAULT_MAP_ZOOM);
});

test('mapUrlForCoordinates pins raw coordinates at the user zoom', () => {
  const url = mapUrlForCoordinates(8.1575, 125.1275);
  expect(url).toContain('output=embed');
  expect(url).toContain(`q=${encodeURIComponent('8.1575,125.1275')}`);
  expect(url.endsWith(`&z=${USER_LOCATION_MAP_ZOOM}`)).toBe(true);
  // The place-string default must not leak into a coordinate URL.
  expect(url).not.toContain(encodeURIComponent(MAP_LOCATION_QUERY));
});

test('mapUrlForCoordinates handles negative coordinates and a custom zoom', () => {
  const url = mapUrlForCoordinates(-8.5, -125.25, 11);
  expect(url).toContain(`q=${encodeURIComponent('-8.5,-125.25')}`);
  expect(url.endsWith('&z=11')).toBe(true);
});

test('osmEmbedUrl keeps the listing-detail embed shape', () => {
  const url = osmEmbedUrl(8.1575, 125.1275);
  expect(url).toContain('https://www.openstreetmap.org/export/embed.html');
  expect(url).toContain('layer=mapnik');
  expect(url).toContain('marker=8.1575,125.1275');
  expect(url).toContain('bbox=');
});

// --- The hook ------------------------------------------------------------------------------

/**
 * happy-dom has no real geolocation, so the hook is exercised against a stub that answers
 * synchronously. Returns a counter so a test can assert nothing was fetched at all.
 */
function stubGeolocation(result: { coordinates?: UserCoordinates; fail?: boolean }) {
  const state = { calls: 0, options: [] as (PositionOptions | undefined)[] };
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition(
        onSuccess: (position: unknown) => void,
        onError?: (error: unknown) => void,
        options?: PositionOptions
      ) {
        state.calls += 1;
        state.options.push(options);
        if (result.fail) {
          onError?.({ code: 1, message: 'denied' });
          return;
        }
        onSuccess({ coords: result.coordinates ?? { latitude: 8.1575, longitude: 125.1275 } });
      },
    },
  });
  return state;
}

function removeGeolocation() {
  // The unsupported-browser case: the property must be genuinely absent.
  delete (navigator as unknown as Record<string, unknown>).geolocation;
}

function resetLocationState() {
  localStorage.removeItem(LOCATION_OPT_IN_KEY);
}

test('the control is hidden when the browser cannot serve a position', async () => {
  removeGeolocation();
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(false));
  expect(result.current.status).toBe('idle');
  expect(result.current.coordinates).toBeNull();
});

test('using the location activates the map and remembers the opt-in', async () => {
  stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  await act(async () => {
    result.current.useMyLocation();
  });

  await waitFor(() => expect(result.current.status).toBe('active'));
  expect(result.current.coordinates).toEqual({ latitude: 8.1575, longitude: 125.1275 });
  expect(localStorage.getItem(LOCATION_OPT_IN_KEY)).toBe('1');
});

test('every lookup carries a timeout so the control cannot spin forever', async () => {
  const stub = stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  await act(async () => {
    result.current.useMyLocation();
  });
  await waitFor(() => expect(result.current.status).toBe('active'));

  // Without a browser-side cap a stalled provider leaves the request pending and the button
  // stuck on "Locating…" (spec R3.4).
  expect(stub.options).toHaveLength(1);
  expect(stub.options[0]?.timeout).toBe(GEOLOCATION_TIMEOUT_MS);
});

test('a denied lookup stays on the default and writes no opt-in', async () => {
  stubGeolocation({ fail: true });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  await act(async () => {
    result.current.useMyLocation();
  });

  await waitFor(() => expect(result.current.status).toBe('idle'));
  expect(result.current.coordinates).toBeNull();
  expect(hasLocationOptIn()).toBe(false);
});

test('a remembered opt-in auto-applies fresh coordinates on mount', async () => {
  stubGeolocation({ coordinates: { latitude: 10.5, longitude: 122.5 } });
  resetLocationState();
  localStorage.setItem(LOCATION_OPT_IN_KEY, '1');

  const { result } = renderHook(() => useMapLocation());

  await waitFor(() => expect(result.current.status).toBe('active'));
  expect(result.current.coordinates).toEqual({ latitude: 10.5, longitude: 122.5 });
});

test('a failing lookup on mount keeps the stored opt-in', async () => {
  stubGeolocation({ fail: true });
  resetLocationState();
  localStorage.setItem(LOCATION_OPT_IN_KEY, '1');

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  // Give the rejected lookup a turn to settle, then confirm nothing was downgraded.
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  expect(result.current.status).toBe('idle');
  expect(hasLocationOptIn()).toBe(true);
});

test('reset clears the opt-in and returns to the default view', async () => {
  stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  await act(async () => {
    result.current.useMyLocation();
  });
  await waitFor(() => expect(result.current.status).toBe('active'));

  await act(async () => {
    result.current.reset();
  });

  expect(result.current.status).toBe('idle');
  expect(result.current.coordinates).toBeNull();
  expect(hasLocationOptIn()).toBe(false);
});

test("autoApply: false keeps the surface's own default on mount", async () => {
  const stub = stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();
  localStorage.setItem(LOCATION_OPT_IN_KEY, '1');

  // The listing map's default is the listing, so a remembered opt-in must not override it until
  // the user clicks the control.
  const { result } = renderHook(() => useMapLocation({ autoApply: false }));
  await waitFor(() => expect(result.current.supported).toBe(true));

  expect(stub.calls).toBe(0);
  expect(result.current.status).toBe('idle');

  await act(async () => {
    result.current.useMyLocation();
  });
  await waitFor(() => expect(result.current.status).toBe('active'));
});

test('no lookup runs on mount without an opt-in', async () => {
  const stub = stubGeolocation({ coordinates: { latitude: 8.1575, longitude: 125.1275 } });
  resetLocationState();

  const { result } = renderHook(() => useMapLocation());
  await waitFor(() => expect(result.current.supported).toBe(true));

  expect(stub.calls).toBe(0);
  expect(result.current.status).toBe('idle');
});

// --- Source-scan guards --------------------------------------------------------------------

/**
 * Surfaces that follow the user. `/public-maps` is deliberately **absent** (spec
 * `public-maps-view-only`): it is a view-only overview for visitors, so it neither renders the
 * control nor mounts the hook. Keep this list and the guard below in step — one asserts the
 * feature is still everywhere it belongs, the other that it never comes back here.
 */
const LOCATION_SURFACES = [
  'routes/maps.tsx',
  'routes/boarder/maps.tsx',
  'routes/landlord/maps.tsx',
  'components/rooms/RoomDetailView.tsx',
];

test('every location-enabled surface renders the shared location control', () => {
  // `MapEmbed` is the frame only — the pages (and the listing detail) own the control row.
  for (const file of LOCATION_SURFACES) {
    const source = readFileSync(join(SRC_DIR, file), 'utf8');
    expect(source).toContain('MapLocationControl');
  }
});

test('the public map is view-only: no control and no geolocation wiring', () => {
  // Dropping any of these would silently re-enable "use my location" on a page that must never
  // ask for a position, so the absence is asserted rather than assumed.
  const source = readFileSync(join(SRC_DIR, 'routes/public-maps.tsx'), 'utf8');
  expect(source).not.toContain('MapLocationControl');
  expect(source).not.toContain('useMapLocation');
  expect(source).not.toContain('geolocation');
  expect(source).not.toContain('LOCATION_SUBTITLE');
  expect(source).not.toContain('mapUrlForCoordinates');
  // No runtime position on this surface: the embed uses its own Malaybalay default.
  expect(source).not.toContain('url=');
  // It still renders a map — and points at the interactive one.
  expect(source).toContain('<MapEmbed');
  expect(source).toContain('to="/maps"');
});

test('the public map keeps the Malaybalay subtitle', () => {
  // The page has no location state left, so `mapSubtitle()` is its only subtitle.
  expect(mapSubtitle()).toBe(`Browse boarding houses around ${MAP_LOCATION_QUERY}.`);
});

test('navigator.geolocation is only touched by the geolocation module', () => {
  const offenders = sourceFiles(SRC_DIR)
    .filter(file => readFileSync(file, 'utf8').includes('navigator.geolocation'))
    .map(file => file.slice(SRC_DIR.length + 1).replace(/\\/g, '/'));
  expect(offenders).toEqual(['lib/geolocation.ts']);
});

test('no map surface sends coordinates anywhere', () => {
  for (const file of MAP_SURFACE_FILES) {
    const source = readFileSync(join(SRC_DIR, file), 'utf8');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('createServerFn');
    expect(source).not.toContain('console.log');
  }
});

test('only the opt-in flag is persisted, never coordinates', () => {
  const persistedCoordinates = sourceFiles(SRC_DIR).filter(file =>
    /setItem\([^)]*(latitude|longitude|coords)/i.test(readFileSync(file, 'utf8'))
  );
  expect(persistedCoordinates).toEqual([]);

  const writers = sourceFiles(SRC_DIR).filter(file =>
    readFileSync(file, 'utf8').includes('LOCATION_OPT_IN_KEY')
  );
  // The key is defined in and written by the geolocation module alone.
  expect(writers.map(file => file.slice(SRC_DIR.length + 1).replace(/\\/g, '/'))).toEqual([
    'lib/geolocation.ts',
  ]);
});
