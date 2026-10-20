-- Liberia Service Directory and Review: public schema
-- Project: spbrsszzhnnbgjismuhr (Postgres 17)
-- Reconstructed from catalog introspection. Review before running anywhere.
-- Extensions in use: postgis, pg_trgm, pgcrypto, uuid-ossp, vector, supabase_vault, pg_stat_statements

------------------------------------------------------------
-- ENUMS
------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('user', 'business_owner', 'admin');
CREATE TYPE public.business_source AS ENUM ('initial_dataset', 'business_registration', 'admin_added');
CREATE TYPE public.business_verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE public.business_record_status AS ENUM ('pending', 'published', 'rejected', 'suspended');
CREATE TYPE public.document_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.review_status AS ENUM ('pending', 'published', 'hidden', 'rejected');

------------------------------------------------------------
-- TABLES
------------------------------------------------------------
CREATE TABLE public.profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users (id),
    full_name   text,
    phone       text,
    avatar_url  text,
    role        public.app_role NOT NULL DEFAULT 'user',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL UNIQUE,
    slug        text NOT NULL UNIQUE,
    description text,
    icon        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.businesses (
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

CREATE TABLE public.healthcare_facility_details (
    business_id        uuid PRIMARY KEY REFERENCES public.businesses (id),
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

CREATE TABLE public.staff (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name            text NOT NULL,
    profession           text,
    business_id          uuid REFERENCES public.businesses (id),
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

CREATE TABLE public.reviews (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  uuid NOT NULL REFERENCES public.businesses (id),
    user_id      uuid NOT NULL REFERENCES public.profiles (id),
    rating       integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment      text,
    is_anonymous boolean NOT NULL DEFAULT false,
    status       public.review_status NOT NULL DEFAULT 'pending',
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_business_review UNIQUE (user_id, business_id)
);

CREATE TABLE public.follows (
    user_id     uuid NOT NULL REFERENCES public.profiles (id),
    business_id uuid NOT NULL REFERENCES public.businesses (id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, business_id)
);

CREATE TABLE public.messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles (id),
    business_id uuid NOT NULL REFERENCES public.businesses (id),
    subject     text,
    message     text NOT NULL,
    is_read     boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_photos (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  uuid NOT NULL REFERENCES public.businesses (id),
    storage_path text NOT NULL,
    caption      text,
    uploaded_by  uuid REFERENCES public.profiles (id),
    is_primary   boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_documents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   uuid NOT NULL REFERENCES public.businesses (id),
    document_type text NOT NULL,
    storage_path  text NOT NULL,
    status        public.document_status NOT NULL DEFAULT 'pending',
    reviewed_by   uuid REFERENCES public.profiles (id),
    reviewed_at   timestamptz,
    review_notes  text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    uuid REFERENCES public.profiles (id),
    action      text NOT NULL,
    entity_type text NOT NULL,
    entity_id   uuid,
    details     jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Staging tables (no PKs, leftovers from the initial import)
CREATE TABLE public.import_facilities_staging (
    import_key text, name text, facility_type text, county text, town text,
    address text, phone text, public_email text, website_url text,
    opening_hours_raw text, services_raw text, geocode_query text,
    latitude double precision, longitude double precision,
    geocode_status text, geocode_precision text, geocode_provider text,
    geocoded_at timestamptz, source text, verification_status text,
    record_status text, is_published boolean, owner_id uuid
);

CREATE TABLE public.import_staff_staging (
    full_name text, profession text, source_facility_name text,
    facility_import_key text, county text, town text, phone text,
    public_email text, years_of_experience integer, source text,
    is_published boolean
);

------------------------------------------------------------
-- INDEXES (beyond PKs / unique constraints above)
------------------------------------------------------------
CREATE INDEX business_photos_business_idx ON public.business_photos (business_id);
CREATE INDEX businesses_category_idx      ON public.businesses (category_id);
CREATE INDEX businesses_county_idx        ON public.businesses (county);
CREATE INDEX businesses_location_idx      ON public.businesses USING gist (location);
CREATE INDEX businesses_name_search_idx   ON public.businesses USING gin (name gin_trgm_ops);
CREATE INDEX businesses_owner_idx         ON public.businesses (owner_id);
CREATE INDEX businesses_published_idx     ON public.businesses (is_published);
CREATE INDEX businesses_status_idx        ON public.businesses (record_status, verification_status);
CREATE INDEX businesses_town_idx          ON public.businesses (town);
CREATE INDEX follows_business_idx         ON public.follows (business_id);
CREATE INDEX messages_business_idx        ON public.messages (business_id);
CREATE INDEX reviews_business_idx         ON public.reviews (business_id);
CREATE INDEX reviews_created_at_idx       ON public.reviews (created_at);
CREATE INDEX staff_business_idx           ON public.staff (business_id);
CREATE INDEX staff_county_idx             ON public.staff (county);
CREATE INDEX staff_profession_idx         ON public.staff (profession);

------------------------------------------------------------
-- FUNCTIONS
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url');
    RETURN NEW;
END;
$$;

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

------------------------------------------------------------
-- TRIGGERS
------------------------------------------------------------
CREATE TRIGGER businesses_updated_at          BEFORE UPDATE ON public.businesses                  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER facility_details_updated_at    BEFORE UPDATE ON public.healthcare_facility_details FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at            BEFORE UPDATE ON public.profiles                    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER reviews_updated_at             BEFORE UPDATE ON public.reviews                     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER staff_updated_at               BEFORE UPDATE ON public.staff                       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sync_business_location_trigger BEFORE INSERT OR UPDATE OF latitude, longitude ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.sync_business_location();

-- NOTE: handle_new_user() is presumably attached to auth.users (AFTER INSERT).
-- That trigger lives in the auth schema and was not part of this export.

------------------------------------------------------------
-- ROW LEVEL SECURITY
------------------------------------------------------------
ALTER TABLE public.profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healthcare_facility_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_photos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_facilities_staging   ENABLE ROW LEVEL SECURITY;  -- no policies
ALTER TABLE public.import_staff_staging        ENABLE ROW LEVEL SECURITY;  -- no policies

-- profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

-- categories
CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- businesses
CREATE POLICY "Anyone can view published businesses" ON public.businesses
    FOR SELECT TO anon, authenticated
    USING ((is_published = true AND record_status = 'published'::business_record_status)
           OR owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "Business owners can register businesses" ON public.businesses
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = (SELECT auth.uid()) AND source = 'business_registration'::business_source);
CREATE POLICY "Owners can update their own businesses" ON public.businesses
    FOR UPDATE TO authenticated
    USING (owner_id = (SELECT auth.uid()) OR is_admin())
    WITH CHECK (owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "Admins can delete businesses" ON public.businesses
    FOR DELETE TO authenticated USING (is_admin());

-- healthcare_facility_details
CREATE POLICY "Anyone can view details of visible businesses" ON public.healthcare_facility_details
    FOR SELECT TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM businesses b
                   WHERE b.id = healthcare_facility_details.business_id
                     AND ((b.is_published = true AND b.record_status = 'published'::business_record_status)
                          OR b.owner_id = (SELECT auth.uid()) OR is_admin())));
CREATE POLICY "Owners and admins can manage facility details" ON public.healthcare_facility_details
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM businesses b
                   WHERE b.id = healthcare_facility_details.business_id
                     AND (b.owner_id = (SELECT auth.uid()) OR is_admin())))
    WITH CHECK (EXISTS (SELECT 1 FROM businesses b
                        WHERE b.id = healthcare_facility_details.business_id
                          AND (b.owner_id = (SELECT auth.uid()) OR is_admin())));

-- staff
CREATE POLICY "Anyone can view published staff" ON public.staff
    FOR SELECT TO anon, authenticated USING (is_published = true OR is_admin());
CREATE POLICY "Admins can manage staff" ON public.staff
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- reviews
CREATE POLICY "Users can view published reviews" ON public.reviews
    FOR SELECT TO anon, authenticated
    USING (status = 'published'::review_status OR user_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "Authenticated users can submit reviews" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid())
                AND EXISTS (SELECT 1 FROM businesses b
                            WHERE b.id = reviews.business_id
                              AND b.is_published = true
                              AND b.record_status = 'published'::business_record_status));
CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()) OR is_admin())
    WITH CHECK (user_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin());

-- follows
CREATE POLICY "Users can view their own follows" ON public.follows
    FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "Users can follow businesses" ON public.follows
    FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can unfollow businesses" ON public.follows
    FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- messages
CREATE POLICY "Users and business owners can view related messages" ON public.messages
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid())
           OR EXISTS (SELECT 1 FROM businesses b
                      WHERE b.id = messages.business_id AND b.owner_id = (SELECT auth.uid()))
           OR is_admin());
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Admins can manage messages" ON public.messages
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- business_photos
CREATE POLICY "Anyone can view photos of visible businesses" ON public.business_photos
    FOR SELECT TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM businesses b
                   WHERE b.id = business_photos.business_id
                     AND ((b.is_published = true AND b.record_status = 'published'::business_record_status)
                          OR b.owner_id = (SELECT auth.uid()) OR is_admin())));
CREATE POLICY "Owners can manage their business photos" ON public.business_photos
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM businesses b
                   WHERE b.id = business_photos.business_id
                     AND (b.owner_id = (SELECT auth.uid()) OR is_admin())))
    WITH CHECK (EXISTS (SELECT 1 FROM businesses b
                        WHERE b.id = business_photos.business_id
                          AND (b.owner_id = (SELECT auth.uid()) OR is_admin())));

-- business_documents
CREATE POLICY "Owners and admins can view business documents" ON public.business_documents
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM businesses b
                   WHERE b.id = business_documents.business_id
                     AND (b.owner_id = (SELECT auth.uid()) OR is_admin())));
CREATE POLICY "Owners and admins can submit business documents" ON public.business_documents
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM businesses b
                        WHERE b.id = business_documents.business_id
                          AND (b.owner_id = (SELECT auth.uid()) OR is_admin())));
CREATE POLICY "Admins can update business documents" ON public.business_documents
    FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete business documents" ON public.business_documents
    FOR DELETE TO authenticated USING (is_admin());

-- audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can create audit logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (is_admin());