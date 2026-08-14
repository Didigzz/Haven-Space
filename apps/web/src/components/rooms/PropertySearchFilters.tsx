import type { PublicListingsFilters } from '../../lib/types';
import { SelectInput, TextInput } from '../ui/Field';

export function PropertySearchFilters({
  value,
  onChange,
}: {
  value: PublicListingsFilters;
  onChange: (next: PublicListingsFilters) => void;
}) {
  return (
    <form className="mb-6 flex flex-wrap gap-3" onSubmit={(e) => e.preventDefault()}>
      <TextInput
        type="search"
        placeholder="Search by city, address, or title"
        value={value.search ?? ''}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
      />
      <TextInput
        type="number"
        placeholder="Max price"
        min={0}
        value={value.price_max ?? ''}
        onChange={(e) =>
          onChange({ ...value, price_max: e.target.value ? Number(e.target.value) : undefined })
        }
      />
      <SelectInput
        value={value.sort_by ?? 'newest'}
        onChange={(e) => onChange({ ...value, sort_by: e.target.value })}
      >
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </SelectInput>
    </form>
  );
}
