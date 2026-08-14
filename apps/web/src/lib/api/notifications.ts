import { getApiBaseUrl } from '../config';
import type { NotificationsResponse, UnreadCountResponse } from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

export function getNotifications(token: string): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>(base(), '/api/notifications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getUnreadCount(token: string): Promise<UnreadCountResponse> {
  return apiFetch<UnreadCountResponse>(base(), '/api/notifications/unread-count', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function markRead(token: string, id: number): Promise<{ message: string }> {
  return apiFetch(base(), `/api/notifications/${id}/read`, jsonOptions(token, { method: 'PATCH' }));
}

export function markAllRead(token: string): Promise<{ message: string }> {
  return apiFetch(base(), '/api/notifications/read-all', jsonOptions(token, { method: 'PATCH' }));
}

export function deleteNotification(token: string, id: number): Promise<{ message: string }> {
  return apiFetch(base(), `/api/notifications/${id}`, jsonOptions(token, { method: 'DELETE' }));
}
