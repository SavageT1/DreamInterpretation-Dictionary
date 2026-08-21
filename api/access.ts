import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  FREE_INTERPRETATION_LIMIT,
  getActiveSubscriptionId,
  PAYMENTS_ENABLED,
  readFreeUsage,
  sendJson,
} from './_shared.js';

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  const subscriptionId = await getActiveSubscriptionId(request);
  const premium = Boolean(subscriptionId);
  const freeRemaining = Math.max(0, FREE_INTERPRETATION_LIMIT - readFreeUsage(request));
  return sendJson(response, 200, {
    premium,
    paymentsEnabled: PAYMENTS_ENABLED,
    freeRemaining: premium ? null : freeRemaining,
  });
}
