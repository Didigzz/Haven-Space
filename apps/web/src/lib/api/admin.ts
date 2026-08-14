import { getApiBaseUrl } from '../config';
import type {
  AdminApplicationsResponse,
  AdminPropertiesResponse,
  AdminSettingsResponse,
  AdminSummaryResponse,
  AdminUsersResponse,
} from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

export function getSummary(token: string): Promise<AdminSummaryResponse> {
  return apiFetch<AdminSummaryResponse>(base(), '/api/admin/summary', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getUsers(token: string): Promise<AdminUsersResponse> {
  return apiFetch<AdminUsersResponse>(base(), '/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function patchUserStatus(
  token: string,
  userId: number,
  accountStatus: string
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    '/api/admin/users',
    jsonOptions(token, {
      method: 'PATCH',
      body: JSON.stringify({ userId, account_status: accountStatus }),
    })
  );
}

export function getProperties(token: string): Promise<AdminPropertiesResponse> {
  return apiFetch<AdminPropertiesResponse>(
    base(),
    '/api/admin/properties?moderation=pending_review',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export function patchPropertyStatus(
  token: string,
  propertyId: number,
  action: string
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    '/api/admin/properties',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ propertyId, action }),
    })
  );
}

export function getApplications(token: string): Promise<AdminApplicationsResponse> {
  return apiFetch<AdminApplicationsResponse>(base(), '/api/admin/applications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getSettings(token: string): Promise<AdminSettingsResponse> {
  return apiFetch<AdminSettingsResponse>(base(), '/api/admin/settings', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function patchSettings(
  token: string,
  settings: Record<string, string>
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    '/api/admin/settings',
    jsonOptions(token, {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    })
  );
}

export function getLandlords(token: string): Promise<AdminUsersResponse> {
  return apiFetch<AdminUsersResponse>(base(), '/api/admin/landlords', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateLandlordVerification(
  token: string,
  landlordId: number,
  action: 'approve' | 'reject'
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    '/api/admin/landlords',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ landlordId, action }),
    })
  );
}
