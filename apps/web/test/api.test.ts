import { test, expect } from 'bun:test';
import { ApiRequestError, apiFetch } from '../src/lib/api/http';
import { listPublicRooms } from '../src/lib/api/public';

test('apiFetch parses a JSON envelope', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
    })) as unknown as typeof fetch;

  const result = await apiFetch<{ data: { ok: boolean } }>('http://test', '/x');
  expect(result.data.ok).toBe(true);
});

test('apiFetch throws ApiRequestError with the API message on non-2xx', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'Property not found' }), {
      status: 404,
    })) as unknown as typeof fetch;

  const err = await apiFetch<unknown>('http://test', '/x').then(
    () => null,
    e => e
  );

  expect(err).toBeInstanceOf(ApiRequestError);
  expect((err as ApiRequestError).status).toBe(404);
  expect((err as ApiRequestError).message).toBe('Property not found');
});

test('listPublicRooms builds the full query string', async () => {
  let captured = '';
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    captured = String(input);
    return new Response(
      JSON.stringify({ data: { properties: [], total_count: 0, limit: 20, offset: 0 } }),
      { status: 200 }
    );
  }) as unknown as typeof fetch;

  await listPublicRooms(
    { search: 'Manila', price_max: 5000, sort_by: 'price_asc', limit: 20, offset: 0 },
    'http://test'
  );

  expect(captured).toBe(
    'http://test/api/rooms/public?search=Manila&price_max=5000&sort_by=price_asc&limit=20&offset=0'
  );
});
