import { getApiBaseUrl } from '../config';
import { apiFetch } from './http';

export interface AiHistoryMessage {
  role: string;
  content: string;
}

export interface AiChatResponse {
  success: boolean;
  response?: string;
  property_count?: number;
  error?: string;
}

function sessionId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  const stored = localStorage.getItem('ai_session_id');
  if (stored) return stored;
  const next = `session_${Date.now()}`;
  localStorage.setItem('ai_session_id', next);
  return next;
}

function userId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  return localStorage.getItem('user_id') || 'anonymous';
}

/** Non-streaming chat (single JSON response). */
export function chat(message: string, history: AiHistoryMessage[] = []): Promise<AiChatResponse> {
  return apiFetch<AiChatResponse>(getApiBaseUrl(), '/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history,
      session_id: sessionId(),
      user_id: userId(),
    }),
  });
}

/**
 * Streaming chat. Requests `stream: true` from the API; each token is passed
 * to `onDelta` as it arrives, and the promise resolves with the full response.
 */
export async function chatStream(
  message: string,
  history: AiHistoryMessage[] = [],
  onDelta: (delta: string) => void
): Promise<AiChatResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      session_id: sessionId(),
      user_id: userId(),
      stream: true,
    }),
  });

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<AiChatResponse>;
    return { success: false, error: body.error ?? `Request failed (${response.status})` };
  }

  if (contentType.includes('text/event-stream') && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          for (const line of event.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const data = JSON.parse(payload) as {
                delta?: string;
                done?: boolean;
                error?: string;
                property_count?: number;
              };
              if (data.error) return { success: false, error: data.error };
              if (data.done) {
                return { success: true, response: full, property_count: data.property_count };
              }
              if (data.delta) {
                full += data.delta;
                onDelta(data.delta);
              }
            } catch {
              // ignore malformed frames
            }
          }
        }
      }
      return { success: true, response: full };
    } finally {
      reader.releaseLock();
    }
  }

  return (await response.json()) as AiChatResponse;
}
