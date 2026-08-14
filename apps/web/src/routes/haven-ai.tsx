import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { chat, type AiHistoryMessage } from '../lib/api/ai';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, TextArea } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';

export const Route = createFileRoute('/haven-ai')({
  component: HavenAiPage,
});

function HavenAiPage() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<AiHistoryMessage[]>([]);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;

    setLoading(true);
    setError(null);
    try {
      const result = await chat(message, history);
      if (result.success && result.response) {
        setReply(result.response);
        setHistory((prev) => [
          ...prev,
          { role: 'user', content: message },
          { role: 'assistant', content: result.response ?? '' },
        ]);
      } else {
        setError(result.error ?? 'AI assistant unavailable. Please try again later.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI assistant unavailable. Please try again later.');
    } finally {
      setLoading(false);
      setInput('');
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <PageHeader title="Haven AI" subtitle="Ask about available rooms." />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Message" htmlFor="ai-message">
          <TextArea
            id="ai-message"
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Find a room near UST under ₱5,000"
          />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? 'Thinking…' : 'Ask'}
        </Button>
      </form>
      {reply ? (
        <Card className="mt-6">
          <p className="whitespace-pre-wrap">{reply}</p>
        </Card>
      ) : null}
      {error ? <p className="mt-4 text-red-600">{error}</p> : null}
    </main>
  );
}
