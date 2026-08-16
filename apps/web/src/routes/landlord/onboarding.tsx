import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/onboarding')({
  component: () => (
    <Protected role="landlord">
      <OnboardingPage />
    </Protected>
  ),
});

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: '',
    contactNumber: '',
    city: '',
    province: '',
    bio: '',
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNext(e: FormEvent) {
    e.preventDefault();
    setStep((s) => Math.min(s + 1, 3));
  }

  return (
    <RoleShell title="Onboarding" nav={LANDLORD_NAV}>
      <Card className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-sm">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`rounded-full px-3 py-1 ${n === step ? 'bg-primary text-white' : n < step ? 'bg-mint text-primary' : 'bg-gray-100 text-gray-ink'}`}>
              Step {n}
            </span>
          ))}
        </div>

        {step === 1 ? (
          <form className="flex flex-col gap-4" onSubmit={handleNext}>
            <h1 className="text-xl font-bold">Business details</h1>
            <Field label="Business / property name" htmlFor="businessName">
              <TextInput
                id="businessName"
                required
                value={form.businessName}
                onChange={(e) => set('businessName', e.target.value)}
              />
            </Field>
            <Field label="Contact number" htmlFor="contactNumber">
              <TextInput
                id="contactNumber"
                type="tel"
                required
                value={form.contactNumber}
                onChange={(e) => set('contactNumber', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" htmlFor="city">
                <TextInput
                  id="city"
                  required
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </Field>
              <Field label="Province" htmlFor="province">
                <TextInput
                  id="province"
                  required
                  value={form.province}
                  onChange={(e) => set('province', e.target.value)}
                />
              </Field>
            </div>
            <Button type="submit">Continue</Button>
          </form>
        ) : step === 2 ? (
          <form className="flex flex-col gap-4" onSubmit={handleNext}>
            <h1 className="text-xl font-bold">About your property</h1>
            <Field label="Tell boarders about your property" htmlFor="bio">
              <TextArea
                id="bio"
                rows={4}
                required
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
              />
            </Field>
            <div className="flex justify-between">
              <Button className="border border-gray-300 bg-white text-gray-ink hover:bg-gray-50" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit">Continue</Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold">You're all set!</h1>
            <p className="text-gray-ink">
              Your onboarding details are stored locally in this form. Saving them to your profile
              will be wired once the landlord profile endpoints are finalized.
            </p>
            <div className="rounded-md bg-cream p-3 text-sm">
              <p className="font-medium">{form.businessName}</p>
              <p className="text-gray-ink">{form.contactNumber}</p>
              <p className="text-gray-ink">
                {form.city}, {form.province}
              </p>
            </div>
            <Button onClick={() => setStep(1)}>Start over</Button>
          </div>
        )}
      </Card>
    </RoleShell>
  );
}
