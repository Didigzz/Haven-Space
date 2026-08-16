import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { listPublicRooms } from '../../lib/api/public';
import type { PublicListingsFilters, PublicListingsResponse } from '../../lib/types';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Spinner } from '../ui/Spinner';
import { PropertySearchFilters } from './PropertySearchFilters';
import { RoomCard } from './RoomCard';

const DEFAULT_FILTERS: PublicListingsFilters = { sort_by: 'newest', limit: 20, offset: 0 };

export function FindARoomContent({
  initialData,
  detailTo = '/rooms/$id',
}: {
  initialData?: PublicListingsResponse;
  detailTo?: string;
}) {
  const [filters, setFilters] = useState<PublicListingsFilters>(DEFAULT_FILTERS);

  const query = useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => listPublicRooms(filters),
    initialData,
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 rounded-2xl bg-mint px-6 py-8">
        <h1 className="text-3xl font-bold text-ink">Find a room</h1>
        <p className="mt-1 text-gray-ink">
          Browse verified boarding houses and rooms near you.
        </p>
      </div>
      <PropertySearchFilters value={filters} onChange={setFilters} />
      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorState message={query.error.message} />
      ) : query.data && query.data.data.total_count === 0 ? (
        <EmptyState title="No rooms found" description="Try widening your search." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data?.data.properties.map((property) => (
            <RoomCard key={property.id} property={property} detailTo={detailTo} />
          ))}
        </ul>
      )}
    </main>
  );
}
