import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createCheckoutNonce,
  getPublicOrigin,
  PAYMENTS_ENABLED,
  sendJson,
  stripeRequest,
} from './_shared.js';

// Weekly is the existing STRIPE_PRICE_ID env var (update its value to $3.99
// in Vercel). Monthly and annual are new env vars you need to add:
//   STRIPE_MONTHLY_PRICE_ID  -> your $8.99 price
//   STRIPE_ANNUAL_PRICE_ID   -> your $49.99 price
type PlanId = 'weekly' | 'monthly' | 'annual';

function isValidPlan(value: unknown): value is PlanId {
  return value === 'weekly' || value === 'monthly' || value === 'annual';
}

function getPriceIdForPlan(plan: PlanId): string | undefined {
  switch (plan) {
    case 'weekly':
      return process.env.STRIPE_PRICE_ID;
    case 'monthly':
      return process.env.STRIPE_MONTHLY_PRICE_ID;
    case 'annual':
      return process.env.STRIPE_ANNUAL_PRICE_ID;
  }
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  if (!PAYMENTS_ENABLED) {
    return sendJson(response, 503, {
      error: 'Premium subscriptions are opening soon.',
    });
  }

  const body = await readJsonBody(request);
  const requestedPlan = body.plan;
  const plan: PlanId = isValidPlan(requestedPlan) ? requestedPlan : 'weekly'; // default keeps old callers working

  const priceId = getPriceIdForPlan(plan);
  if (!priceId) {
    return sendJson(response, 503, { error: 'This plan is not configured yet.' });
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
      'subscription_data[metadata][plan]': plan,
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
      message: error instanceof Error ? error.message : 'Unknown Stripe error',
      plan,
    });
    return sendJson(response, 502, {
      error: 'Checkout could not be opened. Please try again.',
    });
  }
}
