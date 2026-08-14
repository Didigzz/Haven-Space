import { getApiBaseUrl } from '../config';
import type {
  ListingDetailResponse,
  PopularLocationsResponse,
  PublicListingsFilters,
  PublicListingsResponse,
  SimilarPropertiesResponse,
} from '../types';
import { apiFetch } from './http';

export function listPublicRooms(
  filters: PublicListingsFilters = {},
  baseUrl: string = getApiBaseUrl()
): Promise<PublicListingsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.price_min != null) params.set('price_min', String(filters.price_min));
  if (filters.price_max != null) params.set('price_max', String(filters.price_max));
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null) params.set('offset', String(filters.offset));

  const qs = params.toString();
  return apiFetch<PublicListingsResponse>(baseUrl, `/api/rooms/public${qs ? `?${qs}` : ''}`);
}

export function getRoomDetail(
  id: number,
  baseUrl: string = getApiBaseUrl()
): Promise<ListingDetailResponse> {
  return apiFetch<ListingDetailResponse>(baseUrl, `/api/rooms/detail?id=${encodeURIComponent(id)}`);
}

export function getSimilarRooms(
  id: number,
  limit = 3,
  baseUrl: string = getApiBaseUrl()
): Promise<SimilarPropertiesResponse> {
  return apiFetch<SimilarPropertiesResponse>(
    baseUrl,
    `/api/rooms/similar?id=${encodeURIComponent(id)}&limit=${limit}`
  );
}

export function getPopularLocations(
  limit = 6,
  baseUrl: string = getApiBaseUrl()
): Promise<PopularLocationsResponse> {
  return apiFetch<PopularLocationsResponse>(baseUrl, `/api/rooms/popular-locations?limit=${limit}`);
}
