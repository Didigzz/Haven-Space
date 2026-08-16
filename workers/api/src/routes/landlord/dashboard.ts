import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { jsonResponse } from '../../lib/http';
import { getLandlordDashboardStats } from '../../repositories/landlord-dashboard';
import { requireLandlord } from './shared';
async function handleLandlordDashboardStats(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const stats = await getLandlordDashboardStats(db, user.user_id);

  return jsonResponse({ data: stats });
}

const dashboardRoutes = new Hono<{ Bindings: Env }>();

dashboardRoutes.get('/dashboard-stats', handleLandlordDashboardStats);
dashboardRoutes.get('/dashboard/stats', handleLandlordDashboardStats);

export default dashboardRoutes;
