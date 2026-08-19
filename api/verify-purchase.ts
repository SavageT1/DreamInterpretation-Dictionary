import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  CLEAR_CHECKOUT_COOKIE,
  createPremiumCookie,
  getPublicOrigin,
  readCheckoutNonce,
  sendJson,
  stripeRequest,
} from './_shared.js';

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  const url = new URL(request.url || '/', getPublicOrigin());
  const sessionId = url.searchParams.get('session_id') || '';
  const checkoutNonce = readCheckoutNonce(request);
  if (!sessionId.startsWith('cs_')) {
    return sendJson(response, 400, { error: 'Invalid checkout session.' });
  }
  if (!checkoutNonce) {
    return sendJson(response, 400, { error: 'Checkout verification expired.' });
  }

  try {
    const session = await stripeRequest(
      `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    );
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id?: unknown } | undefined)?.id;

    if (
      session.status !== 'complete' ||
      session.mode !== 'subscription' ||
      session.client_reference_id !== checkoutNonce ||
      typeof subscriptionId !== 'string'
    ) {
      return sendJson(response, 402, { error: 'Payment is not complete.' });
    }

    const subscription = await stripeRequest(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price`,
    );
    const metadata = subscription.metadata as { product?: unknown; plan?: unknown } | undefined;
    const validPlans = new Set(['weekly', 'monthly', 'annual']);
    const hasExpectedProduct =
      metadata?.product === 'dream_interpretation_premium' &&
      typeof metadata.plan === 'string' &&
      validPlans.has(metadata.plan);
    const isActive =
      subscription.status === 'active' || subscription.status === 'trialing';
    if (!hasExpectedProduct || !isActive) {
      return sendJson(response, 402, { error: 'Premium subscription was not found.' });
    }

    return sendJson(
      response,
      200,
      { premium: true },
      {
        'Set-Cookie': [
          createPremiumCookie(subscriptionId),
          CLEAR_CHECKOUT_COOKIE,
        ],
      },
    );
  } catch {
    return sendJson(response, 400, { error: 'Checkout could not be verified.' });
  }
}
