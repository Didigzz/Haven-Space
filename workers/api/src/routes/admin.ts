import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authenticateUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { readJsonObject } from '../lib/validation';
import {
  allowedAdminSettingKeys,
  getAdminApplications,
  getAdminSettings,
  getAdminSummary,
  listAdminProperties,
  listAdminUsers,
  updateAdminPropertyModeration,
  updateAdminUserStatus,
  upsertAdminSetting,
} from '../repositories/admin-dashboard';
import {
  getAdminLandlordDetail,
  listAdminLandlords,
  updateLandlordVerification,
} from '../repositories/admin-landlords';

const adminRoutes = new Hono<{ Bindings: Env }>();

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function requireAdmin(c: Context<{ Bindings: Env }>) {
  const user = await authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'admin') {
    return null;
  }

  return user;
}

async function handleAdminLandlords(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const detailId = parsePositiveInt(c.req.query('id'));

  if (detailId) {
    const landlord = await getAdminLandlordDetail(db, detailId);

    if (!landlord) {
      return errorResponse(404, 'Landlord not found');
    }

    return jsonResponse({ data: landlord });
  }

  if (parsePositiveInt(c.req.query('history'))) {
    return jsonResponse({ data: [] });
  }

  const landlords = await listAdminLandlords(
    db,
    c.req.query('status') ?? '',
    c.req.query('limit'),
    c.req.query('offset')
  );

  return jsonResponse({ data: landlords });
}

async function handleUpdateAdminLandlord(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const landlordId = Number.parseInt(String(body.landlordId ?? ''), 10);
  const action = String(body.action ?? '');

  if (!Number.isFinite(landlordId) || landlordId <= 0 || !action) {
    return errorResponse(400, 'Missing required fields: landlordId, action');
  }

  if (action !== 'approve' && action !== 'reject') {
    return errorResponse(400, 'Invalid action. Use approve or reject');
  }

  const changes = await updateLandlordVerification(db, landlordId, action);

  if (changes === 0) {
    return errorResponse(404, 'Landlord not found');
  }

  return jsonResponse({ message: 'Landlord verification updated successfully' });
}

async function handleAdminSummary(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  return jsonResponse({ data: await getAdminSummary(db) });
}

async function handleAdminUsers(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const result = await listAdminUsers(db, {
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
    query: c.req.query('q'),
    role: c.req.query('role'),
  });

  return jsonResponse(result);
}

async function handleUpdateAdminUser(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const userId = Number.parseInt(String(body.userId ?? ''), 10);
  const accountStatus = String(body.account_status ?? '');

  if (!Number.isFinite(userId) || userId <= 0 || !accountStatus) {
    return errorResponse(400, 'Missing required fields: userId, account_status');
  }

  if (!['active', 'suspended', 'banned'].includes(accountStatus)) {
    return errorResponse(400, 'Invalid account status. Allowed: active, suspended, banned');
  }

  const changes = await updateAdminUserStatus(db, userId, accountStatus);

  if (changes === 0) {
    return errorResponse(404, 'User not found');
  }

  return jsonResponse({ message: 'User status updated successfully' });
}

async function handleAdminProperties(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const moderation = c.req.query('moderation') || 'pending_review';
  const moderationStatus = moderation === 'all' ? null : moderation;

  return jsonResponse({ data: await listAdminProperties(db, moderationStatus) });
}

async function handleUpdateAdminProperty(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);
  const propertyId = Number.parseInt(String(body.propertyId ?? ''), 10);
  const action = String(body.action ?? '');
  const newStatus =
    action === 'publish'
      ? 'published'
      : action === 'reject'
      ? 'rejected'
      : action === 'flag'
      ? 'flagged'
      : '';

  if (!Number.isFinite(propertyId) || propertyId <= 0 || !action) {
    return errorResponse(400, 'Missing required fields: propertyId, action');
  }

  if (!newStatus) {
    return errorResponse(400, 'Invalid action. Use publish, reject, or flag');
  }

  const changes = await updateAdminPropertyModeration(db, propertyId, newStatus);

  if (changes === 0) {
    return errorResponse(404, 'Property not found');
  }

  return jsonResponse({ message: 'Property moderation status updated successfully' });
}

async function handleAdminApplications(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  return jsonResponse({ data: await getAdminApplications(db) });
}

async function handleAdminSettings(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  return jsonResponse({ data: await getAdminSettings(db) });
}

async function handleUpdateAdminSettings(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);

  if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
    return errorResponse(400, 'Missing or invalid settings object');
  }

  for (const [key, value] of Object.entries(body.settings)) {
    if (!allowedAdminSettingKeys.includes(key)) {
      continue;
    }

    await upsertAdminSetting(db, key, String(value ?? ''));
  }

  return jsonResponse({ message: 'Settings updated successfully' });
}

adminRoutes.get('/api/admin/landlords', handleAdminLandlords);
adminRoutes.post('/api/admin/landlords', handleUpdateAdminLandlord);
adminRoutes.get('/api/admin/summary', handleAdminSummary);
adminRoutes.get('/api/admin/users', handleAdminUsers);
adminRoutes.patch('/api/admin/users', handleUpdateAdminUser);
adminRoutes.get('/api/admin/properties', handleAdminProperties);
adminRoutes.post('/api/admin/properties', handleUpdateAdminProperty);
adminRoutes.get('/api/admin/applications', handleAdminApplications);
adminRoutes.get('/api/admin/settings', handleAdminSettings);
adminRoutes.patch('/api/admin/settings', handleUpdateAdminSettings);

export default adminRoutes;
