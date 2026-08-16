import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Field, SelectInput, TextArea, TextInput } from '../../../../components/ui/Field';
import { Spinner } from '../../../../components/ui/Spinner';
import { ApiRequestError } from '../../../../lib/api/http';
import { getProperty, updateListing, uploadPropertyPhotos } from '../../../../lib/api/landlord';
import { useAuth } from '../../../../lib/auth-context';

export const Route = createFileRoute('/landlord/listings/$id/edit')({
  component: EditListingPage,
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

function EditListingPage() {
  const { id } = Route.useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

  const propertyId = Number(id);

  const property = useQuery({
    queryKey: ['landlord-property', propertyId],
    queryFn: () => getProperty(token!, propertyId),
    enabled: Boolean(token),
  });

  const [form, setForm] = useState({
    name: '',
    type: 'boarding-house',
    gender_preference: 'any',
    description: '',
    price: '',
    deposit: '',
    min_stay: '1-month',
    address: '',
    city: '',
    province: '',
    status: 'available',
    total_rooms: '1',
    capacity: '1',
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Seed the form once the property detail loads.
  const detail = property.data?.data as Record<string, unknown> | undefined;
  if (detail && !seeded) {
    const totalRooms = Number(detail.total_rooms ?? detail.rooms ?? 1);
    const capacity = Number(detail.capacity ?? 1);
    setForm({
      name: String(detail.name ?? ''),
      type: String(detail.type ?? 'boarding-house'),
      gender_preference: String(detail.gender_preference ?? 'any'),
      description: String(detail.description ?? ''),
      price: String(Number(detail.monthlyPayment ?? detail.price ?? 0)),
      deposit: String(Number(detail.monthlyDeposit ?? detail.deposit ?? 0)),
      min_stay: String(detail.min_stay ?? '1-month'),
      address: String(detail.address ?? ''),
      city: String(detail.city ?? ''),
      province: String(detail.province ?? ''),
      status: String(detail.status ?? 'available'),
      total_rooms: String(Math.max(totalRooms, 1)),
      capacity: String(Math.max(capacity, 1)),
    });
    setAmenities(
      Array.isArray(detail.amenities)
        ? detail.amenities.map((a) => String(a)).filter((a) => AMENITY_OPTIONS.includes(a))
        : []
    );
    setSeeded(true);
  }

  const photos: string[] = Array.isArray(detail?.photos) ? detail.photos.map((p) => String(p)) : [];

  const submit = useMutation({
    mutationFn: () =>
      updateListing(token!, propertyId, {
        ...form,
        price: Number(form.price),
        deposit: Number(form.deposit),
        total_rooms: Number(form.total_rooms),
        capacity: Number(form.capacity),
        amenities,
        photos_to_delete: photosToDelete,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
      void navigate({ to: '/landlord/listings' });
    },
    onError: (err) =>
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update listing.'),
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAmenity(amenity: string) {
    setAmenities((list) =>
      list.includes(amenity) ? list.filter((a) => a !== amenity) : [...list, amenity]
    );
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPhotoError(null);
    setUploading(true);
    uploadPropertyPhotos(token!, propertyId, files)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['landlord-property', propertyId] });
      })
      .catch((err) =>
        setPhotoError(err instanceof ApiRequestError ? err.message : 'Failed to upload photos.')
      )
      .finally(() => setUploading(false));
    e.target.value = '';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    submit.mutate();
  }

  if (property.isLoading) return <Spinner />;
  if (property.error) return <ErrorState message={property.error.message} />;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/landlord/listings"
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← Back to listings
      </Link>
      <h1 className="text-2xl font-bold">Edit listing</h1>

      {error ? (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Property name" htmlFor="name">
          <TextInput id="name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Property type" htmlFor="type">
            <SelectInput id="type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="boarding-house">Boarding house</option>
              <option value="apartment">Apartment</option>
              <option value="dormitory">Dormitory</option>
            </SelectInput>
          </Field>
          <Field label="Gender preference" htmlFor="gender_preference">
            <SelectInput
              id="gender_preference"
              value={form.gender_preference}
              onChange={(e) => set('gender_preference', e.target.value)}
            >
              <option value="any">Any</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </SelectInput>
          </Field>
        </div>

        <Field label="Description" htmlFor="description">
          <TextArea
            id="description"
            rows={4}
            required
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly rent (₱)" htmlFor="price">
            <TextInput
              id="price"
              type="number"
              min={0}
              required
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
            />
          </Field>
          <Field label="Deposit (₱)" htmlFor="deposit">
            <TextInput
              id="deposit"
              type="number"
              min={0}
              required
              value={form.deposit}
              onChange={(e) => set('deposit', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Number of rooms" htmlFor="total_rooms">
            <TextInput
              id="total_rooms"
              type="number"
              min={1}
              required
              value={form.total_rooms}
              onChange={(e) => set('total_rooms', e.target.value)}
            />
          </Field>
          <Field label="Capacity per room" htmlFor="capacity">
            <TextInput
              id="capacity"
              type="number"
              min={1}
              required
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
            />
          </Field>
          <Field label="Status" htmlFor="status">
            <SelectInput id="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="available">Active</option>
              <option value="hidden">Inactive</option>
            </SelectInput>
          </Field>
        </div>

        <Field label="Street address" htmlFor="address">
          <TextInput
            id="address"
            required
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" htmlFor="city">
            <TextInput id="city" required value={form.city} onChange={(e) => set('city', e.target.value)} />
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

        <div>
          <p className="mb-2 text-sm font-medium">Amenities</p>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((amenity) => (
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
          {submit.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Photos</h2>
        {photoError ? (
          <div className="mt-2">
            <ErrorState message={photoError} />
          </div>
        ) : null}
        <label className="mt-3 block cursor-pointer rounded-md border border-dashed border-gray-300 p-4 text-center text-sm hover:bg-gray-50">
          {uploading ? 'Uploading…' : 'Choose photos to upload (jpg/png/webp/gif, max 5 MB each)'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
        </label>
        {photos.length > 0 ? (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <li key={photo} className="relative overflow-hidden rounded-md border border-gray-200">
                <img src={photo} alt="" className="h-24 w-full object-cover" />
                {photosToDelete.includes(photo) ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
                    Will delete
                  </span>
                ) : (
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs"
                    onClick={() => setPhotosToDelete((list) => [...list, photo])}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
