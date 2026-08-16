import { useState } from 'react';

const FAQS = [
  {
    category: 'getting-started',
    question: 'How do I find boarding houses near me?',
    answer:
      'Simply use our interactive map or search feature to browse verified boarding houses in your preferred location. Filter by price, amenities, and availability to find your perfect match.',
  },
  {
    category: 'features',
    question: 'Are the landlords verified?',
    answer:
      'Yes! All landlords on Haven Space go through a verification process. We ensure they are legitimate property owners or authorized managers before they can list their properties on our platform.',
  },
  {
    category: 'billing',
    question: 'Is my payment information secure?',
    answer:
      'Absolutely. We use industry-standard encryption and secure payment processing to protect your financial information. Your payment data is never shared with third parties.',
  },
  {
    category: 'features',
    question: 'Can I schedule a viewing before booking?',
    answer:
      'Yes! You can request a viewing directly through the property listing. Many landlords offer virtual tours or in-person visits so you can see the space before committing.',
  },
  {
    category: 'support',
    question: 'What if I have issues with my boarding house?',
    answer:
      'Our platform includes a built-in messaging system and maintenance request feature. You can communicate directly with your landlord, and our support team is available to help resolve any disputes.',
  },
];

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'getting-started', label: 'Getting Started' },
  { key: 'features', label: 'Features' },
  { key: 'billing', label: 'Billing' },
  { key: 'support', label: 'Support' },
];

export function FAQSection() {
  const [tab, setTab] = useState('all');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const visible = tab === 'all' ? FAQS : FAQS.filter((faq) => faq.category === tab);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">FAQ</span>
          <h2 className="mt-2 text-3xl font-bold text-ink">Frequently Asked Questions</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-ink">
            Everything you need to know about Haven Space, from finding rooms to secure payments
            and trusted landlords.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left — image + CTA */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <img
                src="/assets/images/public/costumer_support.png"
                alt="Customer support representative"
                className="h-48 w-full object-cover"
              />
              <div className="bg-cream p-5">
                <p className="font-semibold text-ink">
                  Any other questions? <span className="font-normal text-gray-ink">We have the answers.</span>
                </p>
                <a
                  href="mailto:support@havenspace.app"
                  className="mt-3 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  Contact us
                </a>
              </div>
            </div>
          </div>

          {/* Right — tabs + accordion */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex flex-wrap gap-2">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setTab(item.key);
                    setOpenIndex(null);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === item.key ? 'bg-primary text-white' : 'bg-mint text-primary hover:bg-mint/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {visible.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div key={faq.question}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left"
                    >
                      <span className="font-medium text-ink">{faq.question}</span>
                      <span
                        className={`ml-4 text-xl text-primary transition-transform ${isOpen ? 'rotate-45' : ''}`}
                      >
                        +
                      </span>
                    </button>
                    {isOpen ? (
                      <p className="px-5 pb-4 text-sm leading-relaxed text-gray-ink">{faq.answer}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
