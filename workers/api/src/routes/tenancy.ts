import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authenticateUser, authorizeUser, type AuthenticatedUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { isJsonRecord, type JsonRecord } from '../lib/validation';
import {
  approvePendingLeaveRequest,
  buildLeaveMessage,
  createLeaveConversation,
  createLeaveMessage,
  declinePendingLeaveRequest,
  findBoarderName,
  findCurrentTenancy,
  findLeaveConversation,
  findPendingLeaveRequest,
  formatTenancy,
  submitLeaveRequest,
  touchConversation,
} from '../repositories/tenancy';

const tenancyRoutes = new Hono<{ Bindings: Env }>();

async function readJsonBody(request: Request): Promise<JsonRecord | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  return isJsonRecord(body) ? body : null;
}

function nonEmptyString(body: JsonRecord | null, field: string): string | null {
  const value = body?.[field];

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function positiveInt(body: JsonRecord | null, field: string): number | null {
  const value = body?.[field];

  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

async function requireLandlord(
  c: Context<{ Bindings: Env }>
): Promise<AuthenticatedUser | Response> {
  const user = await authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'landlord') {
    return errorResponse(403, 'Forbidden: You do not have permission to access this resource');
  }

  return user;
}

tenancyRoutes.get('/api/boarder/tenancy', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const tenancy = await findCurrentTenancy(db, user.user_id);

  if (!tenancy) {
    return jsonResponse({
      success: true,
      data: null,
      message: 'No active tenancy found',
    });
  }

  return jsonResponse({
    success: true,
    data: formatTenancy(tenancy),
  });
});

tenancyRoutes.post('/api/boarder/leave-request', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const body = await readJsonBody(c.req.raw);
  const reason = nonEmptyString(body, 'reason');
  const leaveDate = nonEmptyString(body, 'leave_date');
  const message = nonEmptyString(body, 'message');

  if (!reason || !leaveDate || !message) {
    return errorResponse(400, 'Reason, leave date, and message are required');
  }

  if (!validDateString(leaveDate)) {
    return errorResponse(400, 'Invalid leave date');
  }

  const boarder = await findBoarderName(db, user.user_id);

  if (!boarder) {
    return errorResponse(404, 'User not found');
  }

  const tenancy = await findCurrentTenancy(db, user.user_id);

  if (!tenancy) {
    return errorResponse(
      404,
      'No active tenancy found. You must be currently renting to submit a leave request.'
    );
  }

  if (tenancy.leave_request_status === 'pending') {
    return errorResponse(
      409,
      'You already have a pending leave request. Please wait for your landlord to review it before submitting another.'
    );
  }

  const boarderName = [boarder.first_name, boarder.last_name].filter(Boolean).join(' ').trim();
  const leaveMessage = buildLeaveMessage(
    boarderName,
    tenancy.property_name,
    reason,
    leaveDate,
    message
  );
  const existingConversation = await findLeaveConversation(
    db,
    Number(tenancy.property_id),
    user.user_id,
    Number(tenancy.landlord_id)
  );
  const conversationId = existingConversation
    ? Number(existingConversation.id)
    : await createLeaveConversation(
        db,
        `Leave Request - ${tenancy.property_name}`,
        Number(tenancy.property_id),
        user.user_id,
        Number(tenancy.landlord_id)
      );

  if (existingConversation) {
    await touchConversation(db, conversationId);
  }

  const messageId = await createLeaveMessage(db, conversationId, user.user_id, leaveMessage.text);

  await submitLeaveRequest(db, Number(tenancy.application_id), user.user_id, reason, leaveDate);

  return jsonResponse({
    success: true,
    message: 'Leave request sent to landlord successfully',
    data: {
      conversation_id: conversationId,
      message_id: messageId,
      landlord_name: [tenancy.landlord_first_name, tenancy.landlord_last_name]
        .filter(Boolean)
        .join(' ')
        .trim(),
      property_name: tenancy.property_name,
      leave_date: leaveMessage.formattedDate,
    },
  });
});

tenancyRoutes.post('/api/landlord/approve-leave-request', async c => {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonBody(c.req.raw);
  const applicationId = positiveInt(body, 'application_id');

  if (!applicationId) {
    return errorResponse(400, 'Application ID is required');
  }

  const request = await findPendingLeaveRequest(db, applicationId, user.user_id);

  if (!request) {
    return errorResponse(404, 'Leave request not found or already processed');
  }

  await approvePendingLeaveRequest(db, applicationId, request.boarder_id, Number(request.room_id));

  return jsonResponse({
    success: true,
    message: 'Leave request approved successfully',
    data: {
      application_id: applicationId,
      boarder_name: [request.first_name, request.last_name].filter(Boolean).join(' ').trim(),
      intended_leave_date: request.intended_leave_date,
    },
  });
});

tenancyRoutes.post('/api/landlord/decline-leave-request', async c => {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonBody(c.req.raw);
  const applicationId = positiveInt(body, 'application_id');

  if (!applicationId) {
    return errorResponse(400, 'Application ID is required');
  }

  const request = await findPendingLeaveRequest(db, applicationId, user.user_id);

  if (!request) {
    return errorResponse(404, 'Leave request not found or already processed');
  }

  await declinePendingLeaveRequest(db, applicationId);

  return jsonResponse({
    success: true,
    message: 'Leave request declined successfully',
    data: {
      application_id: applicationId,
      boarder_name: [request.first_name, request.last_name].filter(Boolean).join(' ').trim(),
      intended_leave_date: request.intended_leave_date,
    },
  });
});

export default tenancyRoutes;
