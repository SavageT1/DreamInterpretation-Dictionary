import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const FREE_INTERPRETATION_LIMIT = 3;
const stripeConfigurationPresent = Boolean(
  process.env.STRIPE_SECRET_KEY &&
  process.env.ENTITLEMENT_SECRET,
);
export const PAYMENTS_ENABLED =
  process.env.PAYMENTS_ENABLED === 'true' || stripeConfigurationPresent;

export function sendJson(
  response: ServerResponse,
  status: number,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string | string[]> = {},
) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');

  for (const [name, value] of Object.entries(extraHeaders)) {
    response.setHeader(name, value);
  }

  response.end(JSON.stringify(body));
}

export function getPublicOrigin() {
  const configuredOrigin = process.env.PUBLIC_SITE_URL?.trim();
  const vercelOrigin = process.env.VERCEL_URL?.trim();
  const value =
    configuredOrigin ||
    (vercelOrigin ? `https://${vercelOrigin}` : 'https://www.dreaminterpretation-dictionary.com');
  const origin = new URL(value);

  if (origin.protocol !== 'https:' && origin.hostname !== 'localhost') {
    throw new Error('The public site URL must use HTTPS.');
  }

  return origin.origin;
}

function parseCookies(request: IncomingMessage) {
  const header = request.headers.cookie ?? '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator === -1) return [part, ''];
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

function sign(value: string) {
  const secret = process.env.ENTITLEMENT_SECRET;
  if (!secret) return '';
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function verifySignedValue(value: string) {
  const separator = value.lastIndexOf('.');
  if (separator === -1) return null;

  const payload = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  const expectedSignature = sign(payload);
  if (!expectedSignature) return null;

  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  return payload;
}

export function createPremiumCookie(subscriptionId: string) {
  const payload = Buffer.from(
    JSON.stringify({ subscriptionId, issuedAt: Date.now() }),
    'utf8',
  ).toString('base64url');

  return `dream_premium=${encodeURIComponent(`${payload}.${sign(payload)}`)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function createCheckoutNonce() {
  const nonce = randomBytes(24).toString('base64url');
  return {
    nonce,
    cookie: `dream_checkout=${encodeURIComponent(`${nonce}.${sign(nonce)}`)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800`,
  };
}

export function readCheckoutNonce(request: IncomingMessage) {
  const token = parseCookies(request).dream_checkout;
  if (!token) return null;
  const nonce = verifySignedValue(token);
  return nonce && /^[A-Za-z0-9_-]{32}$/.test(nonce) ? nonce : null;
}

export const CLEAR_CHECKOUT_COOKIE =
  'dream_checkout=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';

export function readPremiumSubscriptionId(request: IncomingMessage) {
  const token = parseCookies(request).dream_premium;
  if (!token) return null;

  const payload = verifySignedValue(token);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      subscriptionId?: unknown;
    };
    return typeof parsed.subscriptionId === 'string' ? parsed.subscriptionId : null;
  } catch {
    return null;
  }
}

export function readFreeUsage(request: IncomingMessage) {
  const token = parseCookies(request).dream_free;
  if (!token) return 0;

  const payload = verifySignedValue(token);
  if (!payload) return 0;

  const count = Number(payload);
  return Number.isInteger(count) && count >= 0 ? count : 0;
}

export function createFreeUsageCookie(count: number) {
  const payload = String(count);
  return `dream_free=${encodeURIComponent(`${payload}.${sign(payload)}`)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;
}

export async function stripeRequest(path: string, options: RequestInit = {}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Stripe is not configured.');

  const response = await fetch(`https://api.stripe.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(options.headers ?? {}),
    },
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    [key: string]: unknown;
  };
  if (!response.ok) {
    throw new Error(data.error?.message || 'Stripe request failed.');
  }

  return data;
}

export async function isSubscriptionActive(subscriptionId: string) {
  try {
    const subscription = await stripeRequest(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
    return subscription.status === 'active' || subscription.status === 'trialing';
  } catch {
    return false;
  }
}
