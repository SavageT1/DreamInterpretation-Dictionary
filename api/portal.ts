import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getPublicOrigin,
  readPremiumSubscriptionId,
  sendJson,
  stripeRequest,
} from './_shared.js';

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  const subscriptionId = readPremiumSubscriptionId(request);
  if (!subscriptionId) {
    return sendJson(response, 401, { error: 'Premium access was not found.' });
  }

  try {
    const subscription = await stripeRequest(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as { id?: unknown } | undefined)?.id;
    if (typeof customerId !== 'string') throw new Error('Customer not found.');

    const form = new URLSearchParams({
      customer: customerId,
      return_url: getPublicOrigin(),
    });
    const portal = await stripeRequest('/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });

    return sendJson(response, 200, { url: portal.url });
  } catch {
    return sendJson(response, 502, {
      error: 'Subscription management could not be opened.',
    });
  }
}
