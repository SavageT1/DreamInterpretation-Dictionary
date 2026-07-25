import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createCheckoutNonce,
  getPublicOrigin,
  sendJson,
  stripeRequest,
} from './_shared.js';

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return sendJson(response, 503, { error: 'Premium checkout is not configured yet.' });
  }

  try {
    const origin = getPublicOrigin();
    const checkoutNonce = createCheckoutNonce();
    const form = new URLSearchParams({
      mode: 'subscription',
      client_reference_id: checkoutNonce.nonce,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      allow_promotion_codes: 'true',
      'subscription_data[metadata][product]': 'dream_interpretation_premium',
    });

    const session = await stripeRequest('/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });

    return sendJson(
      response,
      200,
      { url: session.url },
      { 'Set-Cookie': checkoutNonce.cookie },
    );
  } catch (error) {
    console.error('Checkout creation failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return sendJson(response, 502, {
      error: 'Checkout could not be opened. Please try again.',
    });
  }
}
