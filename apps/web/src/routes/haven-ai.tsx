import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { chat, type AiHistoryMessage } from '../lib/api/ai';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Icon } from '../components/ui/Icon';

export const Route = createFileRoute('/haven-ai')({
  component: HavenAiPage,
});

const FEATURES = [
  {
    icon: 'search',
    color: 'bg-[rgba(74,124,35,0.1)] text-primary',
    title: 'Smart Property Matching',
    description:
      'Search using natural language—"Find rooms under ₱5,000 near universities with WiFi." Our AI understands your needs and finds the perfect matches.',
  },
  {
    icon: 'chat',
    color: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]',
    title: '24/7 AI Assistant',
    description:
      'Get instant answers to your questions anytime. From application status to payment details, our AI assistant is always here to help.',
  },
  {
    icon: 'analytics',
    color: 'bg-[rgba(147,51,234,0.1)] text-[#9333ea]',
    title: 'Intelligent Insights',
    description:
      'Landlords get pricing suggestions and occupancy predictions. Boarders get neighborhood insights and cost of living comparisons.',
  },
  {
    icon: 'cog',
    color: 'bg-[rgba(217,119,6,0.1)] text-[#d97706]',
    title: 'Smart Maintenance Triage',
    description:
      'AI automatically categorizes and prioritizes maintenance requests, provides troubleshooting steps, and dispatches landlords when needed.',
  },
  {
    icon: 'chat',
    color: 'bg-[rgba(20,184,166,0.1)] text-[#14b8a6]',
    title: 'Communication Aid',
    description:
      'Draft professional messages to landlords or boarders, translate communications, and summarize long conversation threads automatically.',
  },
  {
    icon: 'sparkles',
    color: 'bg-[rgba(236,72,153,0.1)] text-[#ec4899]',
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
    icon: 'search',
  },
  {
    number: '2',
    title: 'AI Understands & Analyzes',
    description:
      'Haven AI processes your request, considers your context and preferences, then generates intelligent, personalized responses.',
    icon: 'sparkles',
  },
  {
    number: '3',
    title: 'Get Instant Results',
    description:
      'Receive actionable answers, curated listings, and smart recommendations in seconds—not minutes.',
    icon: 'check',
  },
];

const USE_CASES = [
  {
    icon: 'user',
    title: 'For Boarders',
    items: [
      '"Show me rooms with AC near my university"',
      '"What\'s my application status?"',
      '"Help me submit a maintenance request"',
      '"When is my next payment due?"',
    ],
  },
  {
    icon: 'home',
    title: 'For Landlords',
    items: [
      '"What should I price my listing at?"',
      '"Show me occupancy trends this month"',
      '"How can I improve my listing?"',
      '"Track pending applications"',
    ],
  },
  {
    icon: 'shieldCheck',
    title: 'For Admins',
    items: [
      '"Flag suspicious listing patterns"',
      '"Generate platform activity report"',
      '"Review user dispute history"',
      '"Monitor system health metrics"',
    ],
  },
];

const PRIVACY_POINTS = [
  'No passwords or payment details sent to AI',
  'Personal data anonymized before processing',
  'Clear consent for all AI data processing',
  'Option to disable AI assistant anytime',
];

function SectionBadge({ children }: { children: string }) {
  return (
    <span className="mb-4 inline-block rounded-full bg-mint px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary">
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-4xl font-extrabold tracking-tight text-ink">{children}</h2>;
}

function SectionSubtitle({ children }: { children: string }) {
  return (
    <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-gray-ink">{children}</p>
  );
}

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-primary px-7 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:border-primary-dark hover:bg-primary-dark"
    >
      {children}
    </a>
  );
}

function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-block rounded-full border-2 border-primary bg-white px-7 py-3 text-base font-semibold text-primary transition hover:bg-mint"
    >
      {children}
    </a>
  );
}

function HavenAiPage() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<AiHistoryMessage[]>([]);
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
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(74, 124, 35, 0.08) 0%, transparent 60%), radial-gradient(at 20% 20%, rgba(124, 179, 66, 0.15) 0%, transparent 50%), radial-gradient(at 80% 10%, rgba(74, 124, 35, 0.1) 0%, transparent 50%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-32 text-center md:pt-40">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/10 px-3 py-1.5 text-sm font-semibold text-primary backdrop-blur">
            <Icon name="sparkles" size={18} />
            Introducing Haven AI
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink md:text-6xl">
            Your smart boarding house assistant
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-xl leading-relaxed text-gray-ink">
            Haven AI transforms how you find, manage, and experience boarding houses. Get instant
            answers, personalized recommendations, and intelligent insights—all powered by AI.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PrimaryButton href="#features">
              <Icon name="arrowRight" size={20} />
              Explore Features
            </PrimaryButton>
            <SecondaryButton href="/auth/choose">Get Started Free</SecondaryButton>
          </div>

          {/* Demo chat window */}
          <div className="mt-16 w-full max-w-[600px] mx-auto overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3 border-b border-gray-200 bg-[#f8f9fa] px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]" />
              <span className="ml-2 text-sm font-medium text-gray-ink">Haven AI Assistant</span>
            </div>

            <div className="flex min-h-[250px] flex-col gap-4 bg-[#fafbfc] p-6">
              {history.length === 0 && !loading ? (
                <div className="flex items-end gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white">
                    <Icon name="sparkles" size={18} />
                  </div>
                  <div className="max-w-[70%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-ink">
                    Hello! I&apos;m Haven AI. Ask me anything about finding rooms, payments, or
                    maintenance.
                  </div>
                </div>
              ) : null}

              {history.map((msg, index) =>
                msg.role === 'user' ? (
                  <div key={index} className="flex justify-end">
                    <div className="max-w-[70%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-white">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={index} className="flex items-end gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white">
                      <Icon name="sparkles" size={18} />
                    </div>
                    <div className="max-w-[70%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-ink">
                      {msg.content}
                    </div>
                  </div>
                )
              )}

              {loading ? (
                <div className="flex items-end gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white">
                    <Icon name="sparkles" size={18} />
                  </div>
                  <div className="flex gap-1 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-ink"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>

            <form
              onSubmit={onSubmit}
              className="flex items-center gap-3 border-t border-gray-200 bg-white px-5 py-4"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Haven AI anything..."
                className="flex-1 rounded-full border-2 border-transparent bg-[#f5f6f8] px-4 py-2 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(74,124,35,0.1)]"
              />
              <button
                type="submit"
                disabled={loading}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:scale-105 hover:bg-primary-dark disabled:cursor-not-allowed disabled:scale-100 disabled:bg-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <SectionBadge>Features</SectionBadge>
            <SectionTitle>Everything you need, intelligently automated</SectionTitle>
            <SectionSubtitle>
              From smart search to instant support, Haven AI makes your boarding house experience
              effortless.
            </SectionSubtitle>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(feature => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_24px_rgba(74,124,35,0.08)]"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl ${feature.color}`}
                >
                  <Icon name={feature.icon} size={28} className="shrink-0" />
                </div>
                <div className="mt-5">
                  <h3 className="text-xl font-bold text-ink">{feature.title}</h3>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-gray-ink">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#f8f9fa] py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <SectionBadge>How It Works</SectionBadge>
            <SectionTitle>Three simple steps</SectionTitle>
            <SectionSubtitle>Getting started with Haven AI is quick and effortless.</SectionSubtitle>
          </div>
          <div className="flex flex-col gap-12">
            {STEPS.map(step => (
              <div
                key={step.number}
                className="grid grid-cols-[60px_1fr] items-center gap-6 rounded-2xl border border-gray-200 bg-white p-8 transition hover:border-primary hover:shadow-[0_8px_24px_rgba(74,124,35,0.08)] md:grid-cols-[60px_1fr_120px]"
              >
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-white">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ink">{step.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-gray-ink">
                    {step.description}
                  </p>
                </div>
                <div className="hidden items-center justify-center text-primary opacity-60 md:flex">
                  <Icon name={step.icon} size={48} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <SectionBadge>Use Cases</SectionBadge>
            <SectionTitle>Built for everyone</SectionTitle>
            <SectionSubtitle>
              Haven AI adapts to your role, providing relevant assistance whether you&apos;re a
              boarder, landlord, or admin.
            </SectionSubtitle>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {USE_CASES.map(useCase => (
              <div
                key={useCase.title}
                className="rounded-2xl border border-gray-200 bg-white p-8 transition hover:border-primary hover:shadow-[0_8px_24px_rgba(74,124,35,0.08)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-mint text-primary">
                    <Icon name={useCase.icon} size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-ink">{useCase.title}</h3>
                </div>
                <ul className="mt-6 flex flex-col gap-3">
                  {useCase.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-ink">
                      <span className="shrink-0 text-primary">
                        <Icon name="check" size={18} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & trust */}
      <section className="bg-[#f8f9fa] py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-12 text-center">
            <div className="mb-6 flex justify-center text-primary">
              <Icon name="shieldCheck" size={48} />
            </div>
            <h2 className="text-3xl font-extrabold text-ink">Your privacy comes first</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-gray-ink">
              Haven AI is built with privacy and security at its core. We never share sensitive data
              with AI models, and all personal information is encrypted and anonymized.
            </p>
            <ul className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
              {PRIVACY_POINTS.map(point => (
                <li key={point} className="flex items-center gap-3 text-sm text-ink">
                  <span className="shrink-0 text-primary">
                    <Icon name="check" size={20} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-ink">
            Ready to experience smarter boarding?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-gray-ink">
            Join thousands of users already benefiting from Haven AI&apos;s intelligent features.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/auth/choose"
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-primary px-7 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:border-primary-dark hover:bg-primary-dark"
            >
              Get Started Free
              <Icon name="arrowRight" size={20} />
            </Link>
            <Link
              to="/"
              className="inline-block rounded-full border-2 border-primary bg-white px-7 py-3 text-base font-semibold text-primary transition hover:bg-mint"
            >
              Back to Homepage
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
