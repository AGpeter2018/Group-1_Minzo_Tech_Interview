-- Baseline Schema Migration reconstructed from dataShema.md
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

------------------------------------------------------------
-- ENUMS
------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('user', 'business_owner', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_source') THEN
        CREATE TYPE public.business_source AS ENUM ('initial_dataset', 'business_registration', 'admin_added');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_verification_status') THEN
        CREATE TYPE public.business_verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_record_status') THEN
        CREATE TYPE public.business_record_status AS ENUM ('pending', 'published', 'rejected', 'suspended');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE public.document_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE public.review_status AS ENUM ('pending', 'published', 'hidden', 'rejected');
    END IF;
END $$;

------------------------------------------------------------
-- TABLES
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    full_name   text,
    phone       text,
    avatar_url  text,
    role        public.app_role NOT NULL DEFAULT 'user',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL UNIQUE,
    slug        text NOT NULL UNIQUE,
    description text,
    icon        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.businesses (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    import_key          text UNIQUE,
    name                text NOT NULL,
    slug                text NOT NULL UNIQUE,
    category_id         uuid REFERENCES public.categories (id),
    owner_id            uuid REFERENCES public.profiles (id),
    address             text,
    county              text,
    town                text,
    phone               text,
    public_email        text,
    website_url         text,
    latitude            double precision,
    longitude           double precision,
    location            extensions.geography,
    source              public.business_source NOT NULL DEFAULT 'business_registration',
    verification_status public.business_verification_status NOT NULL DEFAULT 'pending',
    record_status       public.business_record_status NOT NULL DEFAULT 'pending',
    is_published        boolean NOT NULL DEFAULT false,
    geocode_status      text,
    geocode_precision   text,
    geocode_provider    text,
    geocoded_at         timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT valid_latitude  CHECK (latitude  IS NULL OR (latitude  >= -90  AND latitude  <= 90)),
    CONSTRAINT valid_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

CREATE TABLE IF NOT EXISTS public.healthcare_facility_details (
    business_id        uuid PRIMARY KEY REFERENCES public.businesses (id) ON DELETE CASCADE,
    facility_type      text,
    services_raw       text,
    opening_hours_raw  text,
    services           text[],
    opening_hours      jsonb,
    emergency_services boolean,
    registration_number text,
    additional_notes   text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name            text NOT NULL,
    profession           text,
    business_id          uuid REFERENCES public.businesses (id) ON DELETE CASCADE,
    source_facility_name text,
    facility_import_key  text,
    county               text,
    town                 text,
    phone                text,
    public_email         text,
    years_of_experience  integer,
    source               text NOT NULL DEFAULT 'initial_dataset',
    is_published         boolean NOT NULL DEFAULT false,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT valid_years_of_experience CHECK (years_of_experience IS NULL OR years_of_experience >= 0)
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
    user_id      uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    rating       integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment      text,
    is_anonymous boolean NOT NULL DEFAULT false,
    status       public.review_status NOT NULL DEFAULT 'pending',
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_business_review UNIQUE (user_id, business_id)
);

CREATE TABLE IF NOT EXISTS public.follows (
    user_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, business_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
    subject     text,
    message     text NOT NULL,
    is_read     boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_photos (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
    storage_path text NOT NULL,
    caption      text,
    uploaded_by  uuid REFERENCES public.profiles (id),
    is_primary   boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_documents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
    document_type text NOT NULL,
    storage_path  text NOT NULL,
    status        public.document_status NOT NULL DEFAULT 'pending',
    reviewed_by   uuid REFERENCES public.profiles (id),
    reviewed_at   timestamptz,
    review_notes  text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    uuid REFERENCES public.profiles (id),
    action      text NOT NULL,
    entity_type text NOT NULL,
    entity_id   uuid,
    details     jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- FUNCTIONS
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'::public.app_role
    );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_business_location()
RETURNS trigger LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := extensions.ST_SetSRID(
            extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326
        )::extensions.geography;
    ELSE
        NEW.location := NULL;
    END IF;
    RETURN NEW;
END;
$$;

