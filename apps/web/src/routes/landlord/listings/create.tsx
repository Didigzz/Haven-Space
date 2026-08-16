import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { ApiRequestError } from '../../../lib/api/http';
import { createListing } from '../../../lib/api/landlord';
import { useAuth } from '../../../lib/auth-context';
import { setPendingToast } from '../../../lib/toast';

export const Route = createFileRoute('/landlord/listings/create')({
  component: CreateListingPage,
});

const AMENITY_OPTIONS = [
  'WiFi',
  'Air conditioning',
  'Kitchen',
  'Laundry',
  'Parking',
  'CCTV',
  'Furnished',
  'Study area',
];

function CreateListingPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    propertyName: '',
    propertyType: 'boarding-house',
    genderPreference: 'any',
    propertyDescription: '',
    propertyPrice: '',
    propertyDeposit: '',
    propertyRooms: '1',
    propertyCapacity: '1',
    propertyAddress: '',
    propertyCity: '',
    propertyProvince: '',
    propertyMinStay: '1-month',
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      createListing(token!, {
        ...form,
        propertyPrice: Number(form.propertyPrice),
        propertyDeposit: Number(form.propertyDeposit),
        propertyRooms: Number(form.propertyRooms),
        propertyCapacity: Number(form.propertyCapacity),
        amenities,
      }),
    onSuccess: () => {
      setPendingToast('success', 'Listing created!');
      void navigate({ to: '/landlord/listings' });
    },
    onError: err =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create listing.'),
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleAmenity(amenity: string) {
    setAmenities(list =>
      list.includes(amenity) ? list.filter(a => a !== amenity) : [...list, amenity]
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    submit.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/landlord/listings"
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← Back to listings
      </Link>
      <div className="mb-5 flex items-center gap-3">
        <Icon name="list" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-ink">Create listing</h1>
          <p className="text-sm text-gray-ink">Tell boarders about your property.</p>
        </div>
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <Card>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="Property name" htmlFor="propertyName">
            <TextInput
              id="propertyName"
              required
              value={form.propertyName}
              onChange={e => set('propertyName', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Property type" htmlFor="propertyType">
              <SelectInput
                id="propertyType"
                value={form.propertyType}
                onChange={e => set('propertyType', e.target.value)}
              >
                <option value="boarding-house">Boarding house</option>
                <option value="apartment">Apartment</option>
                <option value="dormitory">Dormitory</option>
              </SelectInput>
            </Field>
            <Field label="Gender preference" htmlFor="genderPreference">
              <SelectInput
                id="genderPreference"
                value={form.genderPreference}
                onChange={e => set('genderPreference', e.target.value)}
              >
                <option value="any">Any</option>
                <option value="male">Male only</option>
                <option value="female">Female only</option>
              </SelectInput>
            </Field>
          </div>

          <Field label="Description" htmlFor="propertyDescription">
            <TextArea
              id="propertyDescription"
              rows={4}
              required
              value={form.propertyDescription}
              onChange={e => set('propertyDescription', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly rent (₱)" htmlFor="propertyPrice">
              <TextInput
                id="propertyPrice"
                type="number"
                min={0}
                required
                value={form.propertyPrice}
                onChange={e => set('propertyPrice', e.target.value)}
              />
            </Field>
            <Field label="Deposit (₱)" htmlFor="propertyDeposit">
              <TextInput
                id="propertyDeposit"
                type="number"
                min={0}
                required
                value={form.propertyDeposit}
                onChange={e => set('propertyDeposit', e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Number of rooms" htmlFor="propertyRooms">
              <TextInput
                id="propertyRooms"
                type="number"
                min={1}
                required
                value={form.propertyRooms}
                onChange={e => set('propertyRooms', e.target.value)}
              />
            </Field>
            <Field label="Capacity per room" htmlFor="propertyCapacity">
              <TextInput
                id="propertyCapacity"
                type="number"
                min={1}
                required
                value={form.propertyCapacity}
                onChange={e => set('propertyCapacity', e.target.value)}
              />
            </Field>
            <Field label="Minimum stay" htmlFor="propertyMinStay">
              <SelectInput
                id="propertyMinStay"
                value={form.propertyMinStay}
                onChange={e => set('propertyMinStay', e.target.value)}
              >
                <option value="no-minimum">No minimum</option>
                <option value="1-month">1 month</option>
                <option value="3-months">3 months</option>
                <option value="6-months">6 months</option>
                <option value="1-year">1 year</option>
              </SelectInput>
            </Field>
          </div>

          <Field label="Street address" htmlFor="propertyAddress">
            <TextInput
              id="propertyAddress"
              required
              value={form.propertyAddress}
              onChange={e => set('propertyAddress', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" htmlFor="propertyCity">
              <TextInput
                id="propertyCity"
                required
                value={form.propertyCity}
                onChange={e => set('propertyCity', e.target.value)}
              />
            </Field>
            <Field label="Province" htmlFor="propertyProvince">
              <TextInput
                id="propertyProvince"
                required
                value={form.propertyProvince}
                onChange={e => set('propertyProvince', e.target.value)}
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    amenities.includes(amenity)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-ink hover:bg-gray-200'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? 'Creating…' : 'Create listing'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
