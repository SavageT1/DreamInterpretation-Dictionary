import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  FREE_INTERPRETATION_LIMIT,
  getActiveSubscriptionId,
  getFirebaseIdentity,
  getFreeUsageTarget,
  PAYMENTS_ENABLED,
  readFreeReadingsUsed,
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
  const used = premium
    ? 0
    : await readFreeReadingsUsed(getFreeUsageTarget(request, identity, false).keys);
  const freeRemaining = Math.max(0, FREE_INTERPRETATION_LIMIT - used);
  return sendJson(response, 200, {
    premium,
    paymentsEnabled: PAYMENTS_ENABLED,
    freeRemaining: premium ? null : freeRemaining,
  });
}
