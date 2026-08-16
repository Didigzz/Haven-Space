import { Hono } from 'hono';

import type { Env } from '../env';
import { requireD1 } from '../lib/d1';
import { HttpError, jsonResponse } from '../lib/http';

const aiRoutes = new Hono<{ Bindings: Env }>();

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_HISTORY_MESSAGES = 10;
const MAX_LISTINGS = 6;

const SYSTEM_PROMPT = `You are Haven AI, the friendly and knowledgeable assistant for Haven Space, a boarding house platform in the Philippines connecting boarders with verified landlords.
Help users find rooms, understand payments, maintenance requests, applications, and tenancy.
Keep answers concise and practical. If real listings were provided, use them to answer accurately; otherwise, if you do not know something specific about a listing or account, be honest and point the user to the relevant page in the app (Find a Room, Payments, Maintenance, or their landlord).`;

interface ChatMessage {
  role: string;
  content: string;
}

const ROOM_KEYWORDS = [
  'room',
  'rooms',
  'boarding',
  'dorm',
  'dormitory',
  'rent',
  'rental',
  'property',
  'listing',
  'apartment',
  'bedspace',
  'ac',
  'wifi',
  'price',
  'find',
  'search',
  'near',
  'budget',
  'monthly',
  'under',
  'pesos',
  'php',
];

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'to',
  'in',
  'and',
  'or',
  'of',
  'at',
  'for',
  'with',
  'me',
  'my',
  'i',
  'we',
  'you',
  'your',
  'is',
  'are',
  'it',
  'that',
  'this',
  'these',
  'those',
  'under',
  'near',
  'nearby',
  'below',
  'around',
  'show',
  'shows',
  'want',
  'looking',
  'look',
  'list',
  'listing',
  'listings',
  'available',
  'good',
  'cheap',
  'affordable',
  'apartment',
  'dorm',
  'dormitory',
  'monthly',
  'rent',
  'rental',
  'rents',
  'per',
  'month',
  'please',
  'can',
  'how',
  'much',
  'do',
  'does',
  'need',
  'pesos',
  'php',
  'less',
  'than',
  'like',
  'some',
  'any',
  'anyone',
  'have',
  'has',
  'had',
  'there',
  'they',
  'their',
  'find',
  'room',
  'rooms',
  'boarding',
  'house',
  'houses',
  'budget',
  'max',
  'maximum',
  'minimum',
  'yes',
  'no',
  'several',
  'about',
  'tell',
  'what',
  'which',
  'where',
  'who',
  'when',
  'why',
  'would',
  'could',
  'get',
  'give',
  'recommend',
  'suggest',
  'options',
  'option',
  'place',
  'places',
  'spot',
  'staying',
  'stay',
]);

function looksLikeRoomSearch(message: string): boolean {
  const lower = message.toLowerCase();
  return ROOM_KEYWORDS.some(keyword => lower.includes(keyword));
}

function parseMaxPrice(message: string): number | null {
  const patterns = [
    /₱\s*(\d[\d,]*)/i,
    /(\d[\d,]*)\s*(?:pesos?|php|₱)/i,
    /(?:under|below|less than|max(?:imum)?|budget of?)\s+(\d[\d,]*)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return Number(match[1].replace(/,/g, ''));
    }
  }
  return null;
}

function parseSearchPhrase(message: string): string {
  const words = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(
      word => word.length >= 3 && !STOPWORDS.has(word) && !/^\d{2,}(?:,\d{3})*$/.test(word) // skip prices/amounts — handled by parseMaxPrice
    );
  return [...new Set(words)].slice(0, 4).join(' ');
}

interface RoomListing {
  property_id: number;
  property_title: string;
  price: number;
  city: string | null;
  province: string | null;
  address_line_1: string | null;
  available_rooms: number;
}

async function fetchRoomContext(
  db: D1Database,
  message: string
): Promise<{ listings: RoomListing[]; searched: boolean }> {
  if (!looksLikeRoomSearch(message)) {
    return { listings: [], searched: false };
  }

  const maxPrice = parseMaxPrice(message);
  const searchPhrase = parseSearchPhrase(message);

  const conditions = ['p.deleted_at IS NULL', "p.listing_moderation_status = 'published'"];
  const params: Array<string | number> = [];

  if (maxPrice !== null) {
    conditions.push('p.price <= ?');
    params.push(maxPrice);
  }

  if (searchPhrase) {
    conditions.push(
      '(p.title LIKE ? OR a.address_line_1 LIKE ? OR a.city LIKE ? OR p.description LIKE ?)'
    );
    const term = `%${searchPhrase}%`;
    params.push(term, term, term, term);
  }

  const sql = `
    SELECT p.id AS property_id, p.title AS property_title, p.price,
           a.city, a.province, a.address_line_1,
           (SELECT COUNT(*) FROM rooms r
             WHERE r.property_id = p.id AND r.deleted_at IS NULL AND r.status = 'available'
           ) AS available_rooms
    FROM properties p
    LEFT JOIN addresses a ON a.id = p.address_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.price ASC
    LIMIT ${MAX_LISTINGS}
  `;

  try {
    const result = await db
      .prepare(sql)
      .bind(...params)
      .all<RoomListing>();
    return {
      listings: (result.results ?? []) as RoomListing[],
      searched: true,
    };
  } catch {
    return { listings: [], searched: true };
  }
}

function formatRoomContext(listings: RoomListing[]): string {
  const lines = listings.map(
    (listing, index) =>
      `${index + 1}. ${listing.property_title} — ${listing.address_line_1 ?? listing.city ?? ''}${
        listing.city && listing.city !== listing.address_line_1 ? `, ${listing.city}` : ''
      }${listing.province ? `, ${listing.province}` : ''} — ₱${Number(
        listing.price
      ).toLocaleString()} — ${Number(listing.available_rooms) || 1} room(s) available`
  );
  return `Real listings currently available on Haven Space:\n${lines.join('\n')}`;
}

async function groqChatCompletion(apiKey: string, messages: ChatMessage[]): Promise<string> {
  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new HttpError(502, 'AI provider request failed', {
      code: 'AI_PROVIDER_ERROR',
      details: detail.slice(0, 500),
    });
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new HttpError(502, 'AI provider returned no response', { code: 'AI_EMPTY_RESPONSE' });
  }

  return content;
}

function streamGroqChat(
  apiKey: string,
  messages: ChatMessage[],
  propertyCount: number
): Promise<Response> {
  return fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
    signal: AbortSignal.timeout(60_000),
  })
    .then(async upstream => {
      if (!upstream.ok) {
        const detail = await upstream.text();
        return jsonResponse(
          {
            success: false,
            error: 'AI provider request failed',
            code: 'AI_PROVIDER_ERROR',
            details: detail.slice(0, 500),
          },
          200
        );
      }

      if (!upstream.body) {
        return jsonResponse(
          { success: false, error: 'AI provider returned no stream', code: 'AI_EMPTY_RESPONSE' },
          200
        );
      }

      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      void (async () => {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;
              try {
                const parsed = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              } catch {
                // ignore malformed upstream frames
              }
            }
          }
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, property_count: propertyCount })}\n\n`
            )
          );
        } catch {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, error: 'stream interrupted' })}\n\n`
            )
          );
        } finally {
          await writer.close().catch(() => {});
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    })
    .catch(error => {
      return jsonResponse(
        {
          success: false,
          error: error instanceof Error ? error.message : 'AI provider request failed',
          code: 'AI_PROVIDER_ERROR',
        },
        200
      );
    });
}

aiRoutes.post('/api/ai/chat', async c => {
  const apiKey = c.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { success: false, error: 'AI assistant is not configured', code: 'AI_NOT_CONFIGURED' },
      200
    );
  }

  let body: { message?: unknown; history?: unknown; stream?: unknown };
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    throw new HttpError(400, 'Message is required');
  }

  let roomContext: { listings: RoomListing[]; searched: boolean } = {
    listings: [],
    searched: false,
  };
  try {
    const db = requireD1(c.env);
    roomContext = await fetchRoomContext(db, message);
  } catch {
    // DB unavailable — fall back to plain chat
  }

  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

  if (roomContext.listings.length > 0) {
    messages.push({ role: 'system', content: formatRoomContext(roomContext.listings) });
  }

  if (Array.isArray(body.history)) {
    const recent = body.history.slice(-MAX_HISTORY_MESSAGES);
    for (const item of recent) {
      if (!item || typeof item !== 'object') continue;
      const { role, content } = item as ChatMessage;
      if (
        (role === 'user' || role === 'assistant') &&
        typeof content === 'string' &&
        content.trim()
      ) {
        messages.push({ role, content: content.trim() });
      }
    }
  }

  messages.push({ role: 'user', content: message });

  const propertyCount = roomContext.searched ? roomContext.listings.length : 0;

  if (body.stream === true) {
    return streamGroqChat(apiKey, messages, propertyCount);
  }

  const response = await groqChatCompletion(apiKey, messages);
  return jsonResponse({
    success: true,
    response,
    ...(roomContext.searched ? { property_count: roomContext.listings.length } : {}),
  });
});

export default aiRoutes;
