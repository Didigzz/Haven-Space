import { getApiBaseUrl } from '../config';
import { apiFetch } from './http';

// Payments and messages are intentionally deferred; the Worker returns 501 FEATURE_DEFERRED.
// These functions exist only to keep the data layer complete and are not called by UI yet.
export function paymentsDeferred(): Promise<{ error: string }> {
  return apiFetch(getApiBaseUrl(), '/api/payments');
}

export function messagesDeferred(): Promise<{ error: string }> {
  return apiFetch(getApiBaseUrl(), '/api/messages');
}
