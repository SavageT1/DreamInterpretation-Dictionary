import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getActiveSubscriptionId,
  getFirebaseIdentity,
  getFreeUsageTarget,
  PAYMENTS_ENABLED,
  readFreeReadingsRemaining,
  sendJson,
} from './_shared.js';

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  const identity = await getFirebaseIdentity(request);
  const subscriptionId = await getActiveSubscriptionId(request);
  const premium = Boolean(subscriptionId);
  const remaining = premium
    ? null
    : Math.max(0, await readFreeReadingsRemaining(getFreeUsageTarget(request, identity, false).keys));
  return sendJson(response, 200, {
    premium,
    paymentsEnabled: PAYMENTS_ENABLED,
    freeRemaining: remaining,
  });
}
