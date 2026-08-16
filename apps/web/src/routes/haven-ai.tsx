import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { chat, type AiHistoryMessage } from '../lib/api/ai';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, TextArea } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';

export const Route = createFileRoute('/haven-ai')({
  component: HavenAiPage,
});

const FEATURES = [
  {
    icon: 'search',
    color: 'bg-mint',
    title: 'Smart Property Matching',
    description:
      'Search using natural language—"Find rooms under ₱5,000 near universities with WiFi." Our AI understands your needs and finds the perfect matches.',
  },
  {
    icon: 'chat',
    color: 'bg-blue-100',
    title: '24/7 AI Assistant',
    description:
      'Get instant answers to your questions anytime. From application status to payment details, our AI assistant is always here to help.',
  },
  {
    icon: 'analytics',
    color: 'bg-purple-100',
    title: 'Intelligent Insights',
    description:
      'Landlords get pricing suggestions and occupancy predictions. Boarders get neighborhood insights and cost of living comparisons.',
  },
  {
    icon: 'cog',
    color: 'bg-orange-100',
    title: 'Smart Maintenance Triage',
    description:
      'AI automatically categorizes and prioritizes maintenance requests, provides troubleshooting steps, and dispatches landlords when needed.',
  },
  {
    icon: 'chat',
    color: 'bg-teal-100',
    title: 'Communication Aid',
    description:
      'Draft professional messages to landlords or boarders, translate communications, and summarize long conversation threads automatically.',
  },
  {
    icon: 'sparkles',
    color: 'bg-pink-100',
    title: 'Personalized Recommendations',
    description:
      'Haven AI learns your preferences over time, suggesting rooms, amenities, and locations that match your lifestyle and priorities.',
  },
];

const STEPS = [
  {
    number: '1',
    title: 'Ask or Search',
    description:
      "Type your question in natural language—whether it's finding a room, checking payment status, or requesting maintenance.",
  },
  {
    number: '2',
    title: 'AI Understands & Analyzes',
    description:
      'Haven AI processes your request, considers your context and preferences, then generates intelligent, personalized responses.',
  },
  {
    number: '3',
    title: 'Get Instant Results',
    description:
      'Receive actionable answers, curated listings, and smart recommendations in seconds—not minutes.',
  },
];

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
        setHistory(prev => [
          ...prev,
          { role: 'user', content: message },
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
      setInput('');
    }
  }

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-cream">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-mint/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
            <Icon name="sparkles" size={14} />
            Introducing Haven AI
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight text-ink md:text-5xl">
            Your smart boarding house assistant
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-ink">
            Haven AI transforms how you find, manage, and experience boarding houses. Get instant
            answers, personalized recommendations, and intelligent insights—all powered by AI.
          </p>
        </div>
      </section>

      {/* Chat */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Card>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-2 text-sm font-semibold text-ink">Haven AI Assistant</span>
            </div>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <Field label="Message" htmlFor="ai-message">
                <TextArea
                  id="ai-message"
                  rows={4}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="e.g. Find a room near UST under ₱5,000"
                />
              </Field>
              <Button type="submit" disabled={loading}>
                {loading ? 'Thinking…' : 'Ask Haven AI'}
              </Button>
            </form>
            {reply ? (
              <div className="mt-6 rounded-lg bg-cream p-4">
                <p className="whitespace-pre-wrap text-sm text-ink">{reply}</p>
              </div>
            ) : null}
            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              Features
            </span>
            <h2 className="mt-3 text-3xl font-bold text-ink">
              Everything you need, intelligently automated
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
              From finding the right room to managing your tenancy, Haven AI handles the details.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(feature => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-card"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
                >
                  <Icon name={feature.icon} size={24} className="shrink-0" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-ink">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              How It Works
            </span>
            <h2 className="mt-3 text-3xl font-bold text-ink">Three simple steps</h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
              Get the answers you need in seconds with a single question.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map(step => (
              <div
                key={step.number}
                className="relative rounded-xl border border-gray-200 bg-cream p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-ink">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
