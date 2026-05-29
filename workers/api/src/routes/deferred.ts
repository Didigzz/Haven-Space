import { Hono } from 'hono';

import type { Env } from '../env';
import { jsonResponse } from '../lib/http';

const deferredRoutes = new Hono<{ Bindings: Env }>();

function deferred(feature: 'payments' | 'messages'): Response {
  // TODO: Implement this feature in the Worker. The PHP backend has been removed by request.
  return jsonResponse(
    {
      success: false,
      error: `${feature} routes are not implemented in the Cloudflare Worker yet`,
      code: 'FEATURE_DEFERRED',
      feature,
    },
    501
  );
}

function deferredPayments(): Response {
  return deferred('payments');
}

function deferredMessages(): Response {
  return deferred('messages');
}

deferredRoutes.all('/api/payments/*', deferredPayments);
deferredRoutes.all('/api/payments', deferredPayments);
deferredRoutes.all('/api/boarder/landlord-payment-info', deferredPayments);
deferredRoutes.all('/api/landlord/payment-overview', deferredPayments);
deferredRoutes.all('/api/landlord/payment-methods', deferredPayments);
deferredRoutes.all('/api/landlord/payments', deferredPayments);
deferredRoutes.all('/api/landlord/payments/export', deferredPayments);
deferredRoutes.all('/api/landlord/payments-export', deferredPayments);
deferredRoutes.all('/api/landlord/payments-email-report', deferredPayments);
deferredRoutes.all('/api/landlord/payment-summary', deferredPayments);
deferredRoutes.all('/api/landlord/send-reminder', deferredPayments);

deferredRoutes.all('/api/messages/*', deferredMessages);
deferredRoutes.all('/api/messages', deferredMessages);

export default deferredRoutes;
