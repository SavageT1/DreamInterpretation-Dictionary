import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from './_shared.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > 16_384) throw new Error('Request is too large.');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

function requestOriginAllowed(request: IncomingMessage) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost' || hostname === 'dreaminterpretation-dictionary.com' || hostname.endsWith('.dreaminterpretation-dictionary.com');
  } catch {
    return false;
  }
}

async function deliverNewsletterLead(email: string) {
  const webhookUrl = process.env.NEWSLETTER_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        source: 'dreaminterpretation-dictionary.com',
        form: 'dream-vault-newsletter',
        submittedAt: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error(`Newsletter webhook returned ${response.status}.`);
    const result = await response.json().catch(() => null) as { ok?: unknown; error?: unknown } | null;
    if (result?.ok !== true) {
      throw new Error(typeof result?.error === 'string' ? result.error : 'Newsletter webhook did not confirm delivery.');
    }
    return;
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const recipient = process.env.NEWSLETTER_RECIPIENT_EMAIL?.trim();
  if (!resendKey || !recipient) throw new Error('Newsletter delivery is not configured.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'DREAM Website <onboarding@resend.dev>',
      to: [recipient],
      subject: 'New DREAM newsletter signup',
      text: `Email: ${email}\nSource: dreaminterpretation-dictionary.com\nForm: Dream Vault newsletter`,
      reply_to: email,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Newsletter email delivery failed (${response.status}): ${body.slice(0, 160)}`);
  }
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }
  if (!requestOriginAllowed(request)) return sendJson(response, 403, { error: 'Request origin is not allowed.' });

  try {
    const body = await readJsonBody(request);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return sendJson(response, 400, { error: 'Enter a valid email address.' });
    }
    await deliverNewsletterLead(email);
    return sendJson(response, 200, { message: 'You’re on the list for Dream Vault updates.' });
  } catch (error) {
    console.error('Newsletter signup failed', {
      message: error instanceof Error ? error.message : 'Unknown newsletter error',
    });
    return sendJson(response, 503, { error: 'Signup could not be completed. Please try again later.' });
  }
}
