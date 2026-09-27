import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from './_shared.js';

const MAX_TEXT_LENGTH = 5_000;
const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 8;
const requestWindows = new Map<string, { count: number; startedAt: number }>();

type RequestWithBody = IncomingMessage & {
  body?: { text?: unknown } | string;
};

async function readBody(request: RequestWithBody) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    return JSON.parse(request.body) as { text?: unknown };
  }

  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > MAX_TEXT_LENGTH + 1_000) throw new Error('Request is too large.');
  }
  return JSON.parse(raw || '{}') as { text?: unknown };
}

function getClientAddress(request: IncomingMessage) {
  const forwarded = request.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() || request.socket?.remoteAddress || 'unknown';
}

function isRateLimited(request: IncomingMessage) {
  const now = Date.now();
  const address = getClientAddress(request);
  const current = requestWindows.get(address);

  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestWindows.set(address, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > REQUESTS_PER_WINDOW;
}

export default async function handler(request: RequestWithBody, response: ServerResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  }

  if (isRateLimited(request)) {
    return sendJson(response, 429, {
      error: 'Too many voiceovers at once. Please wait a minute and try again.',
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return sendJson(response, 503, {
      error: 'Voiceover is temporarily unavailable.',
    });
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    return sendJson(response, 400, { error: 'Invalid request.' });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (text.length < 1 || text.length > MAX_TEXT_LENGTH) {
    return sendJson(response, 400, {
      error: 'Please provide text between 1 and 5,000 characters.',
    });
  }

  const cleaned = text.replace(/[#*_>`]/g, '');

  try {
    const openAIResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: cleaned,
        voice: 'shimmer',
        speed: 0.95,
        response_format: 'mp3',
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI TTS request failed', {
        status: openAIResponse.status,
        requestId: openAIResponse.headers.get('x-request-id'),
      });
      return sendJson(response, 502, {
        error: 'Voiceover is unavailable right now. Please try again.',
      });
    }

    const audioBuffer = Buffer.from(await openAIResponse.arrayBuffer());
    response.statusCode = 200;
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Content-Length', audioBuffer.length);
    response.setHeader('Cache-Control', 'no-store');
    response.end(audioBuffer);
  } catch (error) {
    console.error('Voiceover error', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return sendJson(response, 502, {
      error: 'Voiceover is unavailable right now. Please try again.',
    });
  }
}
