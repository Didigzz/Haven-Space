import { getApiBaseUrl } from '../config';
import type { ApiErrorBody } from '../types';

export class ApiRequestError extends Error {
  constructor(public status: number, message: string, public body: unknown) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    // Send cookies (e.g. the API-issued ai_usage tracking cookie) cross-origin.
    credentials: options.credentials ?? 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      body.error ?? body.message ?? `Request failed (${response.status})`,
      body
    );
  }

  return body;
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function jsonOptions(token: string | undefined, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? bearer(token) : {}),
      ...(init.headers ?? {}),
    },
  };
}

export { getApiBaseUrl };
