import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createPremiumCookie,
  getRequestOrigin,
  sendJson,
  stripeRequest,
} from './_shared.js';

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  const url = new URL(request.url || '/', getRequestOrigin(request));
  const sessionId = url.searchParams.get('session_id') || '';
  if (!sessionId.startsWith('cs_')) {
    return sendJson(response, 400, { error: 'Invalid checkout session.' });
  }

  try {
    const session = await stripeRequest(
      `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    );
    const expectedPriceId = process.env.STRIPE_PRICE_ID;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id?: unknown } | undefined)?.id;

    if (
      !expectedPriceId ||
      session.status !== 'complete' ||
      session.mode !== 'subscription' ||
      typeof subscriptionId !== 'string'
    ) {
      return sendJson(response, 402, { error: 'Payment is not complete.' });
    }

    const subscription = await stripeRequest(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price`,
    );
    const subscriptionItems = (
      subscription.items as { data?: Array<{ price?: { id?: unknown } }> } | undefined
    )?.data;
    const hasExpectedPrice = subscriptionItems?.some(
      (item) => item.price?.id === expectedPriceId,
    );
    const isActive =
      subscription.status === 'active' || subscription.status === 'trialing';
    if (!hasExpectedPrice || !isActive) {
      return sendJson(response, 402, { error: 'Premium subscription was not found.' });
    }

    return sendJson(
      response,
      200,
      { premium: true },
      { 'Set-Cookie': createPremiumCookie(subscriptionId) },
    );
  } catch {
    return sendJson(response, 400, { error: 'Checkout could not be verified.' });
  }
}
