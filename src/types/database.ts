export type AppRole = "admin" | "user" | "business";
export type VerificationStatus = "pending" | "verified" | "rejected" | "unverified";
export type RecordStatus = "pending" | "approved" | "rejected" | "published";
export type ReviewStatus = "pending" | "published" | "hidden" | "flagged";

export interface Profile {
    id: string;
    full_name: string;
    role: AppRole;
    avatar_url: string;
    phone: string;
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    created_at: string;
}

export interface Business {
    id: string;
    import_key?: string | null;
    name: string;
    slug: string;
    category_id?: string | null;
    owner_id?: string | null;
    address: string;
    county: string;
    town: string;
    phone: string;
    public_email: string | null;
    website_url: string | null;
    latitude: number | null;
    longitude: number | null;
    source: string;
    verification_status: VerificationStatus;
    record_status: RecordStatus;
    is_published: boolean;
    created_at: string;
    updated_at: string;
    // Join extensions
    category?: Category;
    healthcare_facility_details?: HealthcareFacilityDetails;
    distance_km?: number;
    average_rating?: number;
    review_count?: number;
}

export interface HealthcareFacilityDetails {
    business_id: string;
    facility_type: string | null;
    services_raw: string | null;
    opening_hours_raw: string | null;
    services: string[] | null;
    opening_hours: Record<string, string> | null;
    emergency_services: boolean | null;
    registration_number: string | null;
    additional_notes: string | null;
}

export interface Staff {
    id: string;
    full_name: string;
    profession: string | null;
    business_id: string | null;
    country?: string | null;
    county: string | null;
    town: string | null;
    phone: string | null;
    public_email: string | null;
    years_of_experience: number | null;
    is_published: boolean;
}

export interface Review {
    id: string;
    business_id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    is_anonymous: boolean;
    status: ReviewStatus;
    created_at: string;
    updated_at: string;
    profile?: Profile;
}

export interface Message {
    id: string;
    user_id: string;
    business_id: string;
    subject: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export interface BusinessDocument {
    id: string;
    business_id: string;
    document_type: string;
    storage_path: string;
    status: string
    created_at: string;
}

export interface AuditLog {
    id: string;
    actor_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
}