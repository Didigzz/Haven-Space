export interface RoomSummary {
  id: number;
  room_number: string;
  room_name: string;
  type: string;
  capacity: number;
  status: string;
  availability: string;
  description: string;
  price: number;
  photos: string[];
  image: string;
}

export interface PublicProperty {
  id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  province: string;
  price: number;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviews: number;
  roomTypes: string;
  availableRooms: number;
  totalRooms: number;
  capacity: string;
  minStay: string;
  availability: string;
  amenities: string[];
  image: string;
  images: string[];
  badges: string[];
  rooms: RoomSummary[];
  landlord: { id: number; name: string };
  createdAt: string | null;
}

export interface PublicListingsResponse {
  data: {
    properties: PublicProperty[];
    total_count: number;
    limit: number;
    offset: number;
  };
}

export interface RoomDetail {
  id: number;
  roomNumber: string;
  roomType: string;
  price: number;
  deposit: number;
  status: string;
  capacity: number;
  description: string;
  size: number | null;
  images: string[];
  furnishing: string;
}

export interface ListingDetail {
  id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  province: string;
  price: number;
  latitude: number | null;
  longitude: number | null;
  propertyType: string;
  deposit: string;
  advance: string;
  minStay: string;
  capacity: string;
  availabilityStatus: string;
  rating: number;
  reviews: number;
  roomTypes: string;
  availability: string;
  availableRooms: number;
  totalRooms: number;
  amenities: string[];
  houseRules: string[];
  genderPreference: string;
  propertyRules: string;
  images: string[];
  coverImage: string;
  badges: string[];
  rooms: RoomDetail[];
  landlord: { id: number; name: string; properties: number; rating: number };
  createdAt: string | null;
}

export interface ListingDetailResponse {
  data: ListingDetail;
}

export interface PublicListingsFilters {
  search?: string;
  price_min?: number;
  price_max?: number;
  sort_by?: string;
  limit?: number;
  offset?: number;
}

export interface AuthUser {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'boarder' | 'landlord' | 'admin';
  is_verified: boolean;
  email_verified: boolean;
  account_status: string;
  avatar_url: string | null;
  phone_number: string | null;
  verification_status: string | null;
  boarder_status?: string;
}

export interface LoginResponse {
  success: true;
  access_token: string;
  user: AuthUser;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'boarder' | 'landlord';
  businessName?: string;
  businessDescription?: string;
  city?: string;
  province?: string;
  phoneNumber?: string;
  idType?: string;
  idNumber?: string;
}

export interface RegisterResponse {
  success: true;
  message: string;
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  nextSteps: string[];
}

export interface SavedStatusResponse {
  success: true;
  is_saved: boolean;
  saved_at: string | null;
}

export interface SaveListingResponse {
  success: true;
  message: string;
  data: { id: number; property_id: number; room_id: number | null; saved_at: string };
}

export interface DeleteSavedListingResponse {
  success: true;
  message: string;
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
}

export interface SimilarProperty {
  id: number;
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  province: string;
  rating: number;
  reviewCount: number;
  coverImage: string;
}

export interface SimilarPropertiesResponse {
  data: SimilarProperty[];
}

export interface PopularLocation {
  name: string;
  search_value: string;
  property_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_range: string;
}

export interface PopularLocationsResponse {
  data: { locations: PopularLocation[] };
}

export interface CheckEmailResponse {
  exists: boolean;
  is_google_account: boolean;
}

export interface MeResponse {
  success: true;
  user: AuthUser;
}

export interface ResetResponse {
  success?: boolean;
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
  request_id?: number;
  is_google_user?: boolean;
  action?: string;
}

export interface VerifyResetCodeResponse {
  message: string;
  valid: boolean;
  user_id?: number;
  request_id?: number;
}

export interface ProfileResponse {
  user: AuthUser & Record<string, unknown>;
  message?: string;
  avatar_url?: string;
}

export interface UpdateProfileInput {
  first_name: string;
  last_name: string;
  phone_number: string | null;
}

export interface SavedListingsResponse {
  success: true;
  data: unknown[];
  count: number;
}

export interface ApplicationSummary {
  id: number;
  room_id: number;
  landlord_id: number;
  property_id?: number;
  status: string;
  message: string;
  created_at: string;
  room?: { room_number: string; price: number; title?: string };
  property?: { title: string; address: string; city: string; image: string };
  landlord?: { first_name: string; last_name: string };
  boarder?: { first_name: string; last_name: string; email: string };
}

export interface ApplicationsResponse {
  data: ApplicationSummary[];
}

export interface ApplicationDetailResponse {
  data: ApplicationSummary;
  success?: boolean;
  message?: string;
}

export interface CreateApplicationInput {
  room_id: number;
  landlord_id: number;
  message: string;
}

export interface TenancyResponse {
  success: true;
  data: Record<string, unknown> | null;
  message?: string;
}

export interface LeaveRequestInput {
  reason: string;
  leave_date: string;
  message: string;
}

export interface OnboardingStatusResponse {
  data: Record<string, unknown>;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  category: string;
  priority: string;
  property_id: number | null;
  created_at: string;
  is_viewed?: boolean;
}

export interface BoarderAnnouncementsResponse {
  success: true;
  data: { announcements: Announcement[]; total_count: number };
}

export interface AcceptedApplicationsResponse {
  data: Array<Record<string, unknown>>;
}

export interface DashboardStatsResponse {
  data: { occupancy: number; revenue: number; renewals: number; payment_alerts: number };
}

export interface LandlordProperty {
  id: number;
  name: string;
  type: string;
  description: string;
  address: string;
  city: string;
  province: string;
  price: number;
  status: string;
  total_rooms: number;
  occupied_rooms: number;
  monthly_revenue: number;
  created_at: string;
  amenities: string[];
  photos: string[];
  pending_applications: number;
}

export interface LandlordPropertiesResponse {
  data: { properties: LandlordProperty[]; total_count: number };
}

export interface LandlordPropertyDetailResponse {
  data: Record<string, unknown>;
}

export interface LandlordRoom {
  id: number;
  property_id: number;
  room_number: string;
  room_type: string | null;
  description: string | null;
  price: number;
  deposit: number;
  status: string;
  capacity: number;
  size: number | null;
  cover_photo: string | null;
  photos: Array<{ id: number; photo_url: string; is_cover: boolean; display_order: number }>;
  created_at: string | null;
}

export interface LandlordRoomListResponse {
  data: {
    property: {
      id: number;
      name: string;
      status: string;
      total_rooms: number;
      occupied_rooms: number;
    };
    rooms: LandlordRoom[];
  };
}

export interface RoomMutationResponse {
  success: boolean;
  message: string;
  data: LandlordRoom;
}

export interface UploadPhotosResponse {
  message?: string;
  success?: boolean;
  data: { urls?: string[]; photos?: Array<Record<string, unknown>>; errors?: string[] };
}

export interface BoardersResponse {
  success: true;
  data: { boarders: Array<Record<string, unknown>>; total_count: number };
}

export interface BoarderMutationResponse {
  success: boolean;
  data: { message: string; boarder_id?: number };
}

export interface LandlordApplicationsResponse {
  data: ApplicationSummary[];
}

export interface LandlordAnnouncementsResponse {
  success: true;
  data: { announcements: Announcement[]; total_count: number };
}

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  unread_count: number;
}

export interface UnreadCountResponse {
  data: { unread_count: number };
}

export interface AdminSummaryResponse {
  data: Record<string, unknown>;
}

export interface AdminUsersResponse {
  data: Array<Record<string, unknown>>;
}

export interface AdminPropertiesResponse {
  data: Array<Record<string, unknown>>;
}

export interface AdminApplicationsResponse {
  data: Array<Record<string, unknown>>;
}

export interface AdminSettingsResponse {
  data: Record<string, unknown>;
}
