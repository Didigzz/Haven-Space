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

// NOTE: the Hono Worker does not yet implement `/api/ai/chat` (the former PHP AI backend was
// removed). This client is wired to the expected contract and the page degrades to an
// "unavailable" state until that endpoint is added.
export function chat(message: string, history: AiHistoryMessage[] = []): Promise<AiChatResponse> {
  return apiFetch<AiChatResponse>(getApiBaseUrl(), '/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history,
      session_id: sessionId(),
      user_id:
        typeof window !== 'undefined'
          ? localStorage.getItem('user_id') || 'anonymous'
          : 'anonymous',
    }),
  });
}
