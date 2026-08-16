import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { chatStream, type AiHistoryMessage } from '../lib/api/ai';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { Icon } from '../components/ui/Icon';

export const Route = createFileRoute('/haven-ai')({
  component: HavenAiPage,
});

const SUGGESTIONS = [
  'Find a room near UST under ₱5,000',
  'When is my next payment due?',
  'Help me submit a maintenance request',
  'Show me rooms with AC near my university',
];

function AiAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white">
      <Icon name="sparkles" size={18} />
    </div>
  );
}

function HavenAiPage() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<AiHistoryMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  async function sendMessage(message: string) {
    const text = message.trim();
    if (!text || loading) return;

    setHistory(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    setError(null);
    setStreamingContent('');
    try {
      const result = await chatStream(text, history, delta => {
        setStreamingContent(prev => prev + delta);
      });
      if (result.success && result.response) {
        setHistory(prev => [
          ...prev,
          { role: 'assistant', content: result.response ?? '' },
        ]);
      } else {
        setError(result.error ?? 'AI assistant unavailable. Please try again later.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'AI assistant unavailable. Please try again later.'
      );
    } finally {
      setLoading(false);
      setStreamingContent('');
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading, streamingContent]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage(input);
    setInput('');
  }

  const hasMessages = history.length > 0;

  return (
    <div className="flex h-screen flex-col bg-white text-ink">
      <PublicNavbar />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Messages / empty state */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!hasMessages && !loading ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white">
                <Icon name="sparkles" size={24} />
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink">
                What can I help with?
              </h1>
              <p className="mt-2 max-w-md text-gray-ink">
                Ask Haven AI about rooms, payments, maintenance, or anything about your tenancy.
              </p>
              <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-xl border border-gray-200 bg-white p-4 text-left text-sm text-gray-ink transition hover:border-primary hover:bg-mint/40 hover:text-ink"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
              {history.map((msg, index) =>
                msg.role === 'user' ? (
                  <div key={index} className="flex justify-end">
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-white">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={index} className="flex items-start gap-3">
                    <AiAvatar />
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-ink">
                      {msg.content}
                    </div>
                  </div>
                )
              )}

              {loading ? (
                <div className="flex items-start gap-3">
                  <AiAvatar />
                  {streamingContent ? (
                    <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-ink">
                      {streamingContent}
                      <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary align-middle" />
                    </div>
                  ) : (
                    <div className="flex gap-1 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="h-2 w-2 animate-bounce rounded-full bg-gray-ink"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {error ? (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
              ) : null}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-gray-200 bg-white px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <form
              onSubmit={onSubmit}
              className="flex items-end gap-2 rounded-3xl border border-gray-300 bg-white p-2 shadow-sm focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(74,124,35,0.1)]"
            >
              <textarea
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e);
                  }
                }}
                placeholder="Ask Haven AI anything..."
                className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={loading || input.trim() === ''}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-muted">
              Haven AI can make mistakes. Check important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
