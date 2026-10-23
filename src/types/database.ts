// Postgres ENUM types matching live database
export type AppRole = "user" | "business_owner" | "admin" | "business";
export type BusinessSource = "initial_dataset" | "business_registration" | "admin_added";
export type BusinessVerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type VerificationStatus = BusinessVerificationStatus;
export type BusinessRecordStatus = "pending" | "published" | "rejected" | "suspended";
export type RecordStatus = BusinessRecordStatus | "approved";
export type ReviewStatus = "pending" | "published" | "hidden" | "rejected" | "flagged";
export type DocumentStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  import_key?: string | null;
  name: string;
  slug: string;
  category_id?: string | null;
  owner_id?: string | null;
  address?: string | null;
  county?: string | null;
  town?: string | null;
  phone?: string | null;
  public_email?: string | null;
  website_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: unknown;
  source: BusinessSource | string;
  verification_status: VerificationStatus;
  record_status: RecordStatus;
  is_published: boolean;
  geocode_status?: string | null;
  geocode_precision?: string | null;
  geocode_provider?: string | null;
  geocoded_at?: string | null;
  created_at: string;
  updated_at: string;
  // Join extensions
  category?: Category;
  healthcare_facility_details?: HealthcareFacilityDetails | HealthcareFacilityDetails[] | null;
  owner?: Profile | null;
  business_photos?: BusinessPhoto[];
  business_documents?: BusinessDocument[];
  distance_km?: number;
  average_rating?: number | null;
  review_count?: number;
}

export interface HealthcareFacilityDetails {
  business_id: string;
  facility_type?: string | null;
  services_raw?: string | null;
  opening_hours_raw?: string | null;
  services?: string[] | null;
  opening_hours?: Record<string, string> | string | null;
  emergency_services?: boolean | null;
  registration_number?: string | null;
  additional_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Optional compatibility fallbacks
  facility_level?: string | null;
  bed_count?: number | null;
  ambulance_available?: boolean | null;
}

export interface Staff {
  id: string;
  full_name: string;
  profession?: string | null;
  business_id?: string | null;
  source_facility_name?: string | null;
  facility_import_key?: string | null;
  county?: string | null;
  town?: string | null;
  phone?: string | null;
  public_email?: string | null;
  years_of_experience?: number | null;
  source?: string;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
  // Optional compatibility fallbacks
  specialty?: string | null;
  cadre?: string | null;
  license_number?: string | null;
  is_verified?: boolean;
}

export interface Review {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  status?: ReviewStatus;
  created_at: string;
  updated_at?: string;
  // Join extensions
  profiles?: Profile | Profile[] | null;
  businesses?: { id: string; name: string } | { id: string; name: string }[] | null;
  // Optional compatibility fallbacks
  reviewer_name_display?: string | null;
  profile?: Profile;
}

export interface Follow {
  user_id: string;
  business_id: string;
  created_at: string;
  // Join extensions
  businesses?: Business | Business[] | null;
  profiles?: Profile | Profile[] | null;
}

export interface Message {
  id: string;
  user_id: string;
  business_id: string;
  subject?: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  // Join extensions
  profiles?: Profile | Profile[] | null;
  businesses?: Business | Business[] | null;
  // Optional compatibility fallbacks
  sender_name?: string | null;
  sender_phone?: string | null;
  sender_email?: string | null;
  body?: string | null;
}

export interface BusinessPhoto {
  id: string;
  business_id: string;
  storage_path: string;
  caption?: string | null;
  uploaded_by?: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface BusinessDocument {
  id: string;
  business_id: string;
  document_type: string;
  storage_path: string;
  status: DocumentStatus | string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ImportFacilitiesStaging {
  import_key?: string | null;
  name?: string | null;
  facility_type?: string | null;
  county?: string | null;
  town?: string | null;
  address?: string | null;
  phone?: string | null;
  public_email?: string | null;
  website_url?: string | null;
  opening_hours_raw?: string | null;
  services_raw?: string | null;
  geocode_query?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocode_status?: string | null;
  geocode_precision?: string | null;
  geocode_provider?: string | null;
  geocoded_at?: string | null;
  source?: string | null;
  verification_status?: string | null;
  record_status?: string | null;
  is_published?: boolean | null;
  owner_id?: string | null;
}

export interface ImportStaffStaging {
  full_name?: string | null;
  profession?: string | null;
  source_facility_name?: string | null;
  facility_import_key?: string | null;
  county?: string | null;
  town?: string | null;
  phone?: string | null;
  public_email?: string | null;
  years_of_experience?: number | null;
  source?: string | null;
  is_published?: boolean | null;
}
