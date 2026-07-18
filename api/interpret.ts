import { GoogleGenAI } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'node:http';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 6;
const requestLog = new Map<string, number[]>();

type RequestWithBody = IncomingMessage & {
  body?: { dreamText?: unknown } | string;
};

function sendJson(response: ServerResponse, status: number, body: Record<string, string>) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

async function readBody(request: RequestWithBody) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') return JSON.parse(request.body) as { dreamText?: unknown };

  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 12_000) throw new Error('Request is too large.');
  }
  return JSON.parse(raw || '{}') as { dreamText?: unknown };
}

function isRateLimited(request: IncomingMessage) {
  const forwarded = request.headers['x-forwarded-for'];
  const client = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() || 'unknown';
  const now = Date.now();
  const recent = (requestLog.get(client) || []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  requestLog.set(client, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

export default async function handler(request: RequestWithBody, response: ServerResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  if (isRateLimited(request)) {
    return sendJson(response, 429, { error: 'Too many readings at once. Please wait a minute and try again.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(response, 503, { error: 'Dream readings are temporarily unavailable. Please try again shortly.' });
  }

  try {
    const body = await readBody(request);
    const dreamText = typeof body.dreamText === 'string' ? body.dreamText.trim() : '';

    if (dreamText.length < 10 || dreamText.length > 5_000) {
      return sendJson(response, 400, { error: 'Please enter a dream between 10 and 5,000 characters.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Interpret the following dream. Give a thoughtful, specific reading in 3 to 5 short paragraphs. Discuss the strongest symbols, the emotions or conflicts they may represent, and two reflective questions the dreamer can consider. Use tentative language such as "may" and "could"; do not claim certainty, predict the future, diagnose mental illness, or provide medical advice. Do not repeat the full dream.\n\nDream:\n${dreamText}`,
        }],
      }],
      config: { temperature: 0.7, maxOutputTokens: 900 },
    });

    const interpretation = result.text?.trim();
    if (!interpretation) throw new Error('Empty interpretation');
    return sendJson(response, 200, { interpretation });
  } catch (error) {
    console.error('Dream interpretation failed', error instanceof Error ? error.message : error);
    return sendJson(response, 500, { error: 'We could not complete this reading. Please try again.' });
  }
}

