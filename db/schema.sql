-- Enable PostGIS for geospatial support
CREATE EXTENSION IF NOT EXISTS postgis;
-- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------
-- 1. Users & Authentication
-- ------------------------------

-- Custom authentication using public.users only (no dependency on auth.users).

CREATE TABLE IF NOT EXISTS public.users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT     UNIQUE      NOT NULL,
  password_hash    TEXT                 NOT NULL,
  role             TEXT                 NOT NULL
                                        CHECK (role IN ('donor','hospital','blood-bank','ngo')),
  name             TEXT                 NOT NULL, -- donors: full name; hospital: hospital name; blood-bank: blood bank name; ngo: organization name
  blood_type       TEXT
                                        CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  -- Either set latitude/longitude or location geography; triggers keep them in sync
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  location         GEOGRAPHY(POINT,4326),  -- PostGIS geography column
  phone            TEXT,
  address          TEXT,
  last_donation    TIMESTAMPTZ,
  eligible_date    TIMESTAMPTZ,
  donation_count   INTEGER DEFAULT 0,
  is_available     BOOLEAN DEFAULT TRUE,
  expo_push_token  TEXT,                    -- For mobile notifications
  last_login       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for fast proximity queries
CREATE INDEX IF NOT EXISTS users_location_idx ON public.users USING GIST(location);

-- ------------------------------
-- 2. Blood Inventory
-- ------------------------------

CREATE TABLE IF NOT EXISTS public.blood_inventory (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_bank_id    UUID        NOT NULL REFERENCES public.users(id),
  blood_type       TEXT        NOT NULL
                                  CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  quantity         INTEGER     NOT NULL CHECK (quantity >= 0),
  expiry_date      DATE        NOT NULL,
  location         GEOGRAPHY(POINT,4326),
  last_updated     TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blood_inventory_location_idx ON public.blood_inventory USING GIST(location);

-- Composite index for fast lookups by bank and blood type (backed by unique constraint)
CREATE INDEX IF NOT EXISTS blood_inventory_bank_type_idx ON public.blood_inventory (blood_bank_id, blood_type);

-- Ensure upsert key for inventory (one row per bank+blood_type)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blood_inventory_bank_type_unique'
  ) THEN
    ALTER TABLE public.blood_inventory
      ADD CONSTRAINT blood_inventory_bank_type_unique UNIQUE (blood_bank_id, blood_type);
  END IF;
END $$;

-- Ensure legacy databases also have approval and acknowledgment workflow columns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='emergency_requests' AND column_name='approved_by'
  ) THEN
    ALTER TABLE public.emergency_requests ADD COLUMN approved_by UUID REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='emergency_requests' AND column_name='approved_at'
  ) THEN
    ALTER TABLE public.emergency_requests ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='emergency_requests' AND column_name='hospital_acknowledged_at'
  ) THEN
    ALTER TABLE public.emergency_requests ADD COLUMN hospital_acknowledged_at TIMESTAMPTZ;
  END IF;
END $$;

-- Ensure legacy databases also have fulfillment tracking columns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='emergency_requests' AND column_name='fulfilled_by'
  ) THEN
    ALTER TABLE public.emergency_requests ADD COLUMN fulfilled_by UUID REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='emergency_requests' AND column_name='fulfilled_at'
  ) THEN
    ALTER TABLE public.emergency_requests ADD COLUMN fulfilled_at TIMESTAMPTZ;
  END IF;
END $$;
-- Atomic inventory decrement helper
-- Returns true if decrement succeeded (enough stock), false otherwise
CREATE OR REPLACE FUNCTION public.decrement_inventory(
  p_bank_id UUID,
  p_blood_type TEXT,
  p_units INTEGER
) RETURNS BOOLEAN AS $$
DECLARE updated_row RECORD;
BEGIN
  IF p_units IS NULL OR p_units <= 0 THEN
    RETURN FALSE;
  END IF;
  UPDATE public.blood_inventory
  SET quantity = quantity - p_units,
      last_updated = NOW()
  WHERE blood_bank_id = p_bank_id
    AND blood_type = p_blood_type
    AND quantity >= p_units
  RETURNING * INTO updated_row;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------
-- 3. Emergency Requests
-- ------------------------------

CREATE TABLE IF NOT EXISTS public.emergency_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID        NOT NULL REFERENCES public.users(id),
  blood_type       TEXT        NOT NULL
                                  CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_needed     INTEGER     NOT NULL CHECK (units_needed > 0),
  units_fulfilled  INTEGER     NOT NULL DEFAULT 0 CHECK (units_fulfilled >= 0),
  urgency          TEXT        NOT NULL
                                  CHECK (urgency IN ('critical','urgent','normal')),
  location         GEOGRAPHY(POINT,4326),
  address          TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','fulfilled','cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_by     UUID        REFERENCES public.users(id),
  fulfilled_at     TIMESTAMPTZ,
  -- Approval & acknowledgment workflow
  approved_by      UUID        REFERENCES public.users(id),
  approved_at      TIMESTAMPTZ,
  hospital_acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS emergency_requests_location_idx ON public.emergency_requests USING GIST(location);

-- Ensure legacy databases also have 'address' column on emergency_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='emergency_requests' AND column_name='address'
  ) THEN
    ALTER TABLE public.emergency_requests ADD COLUMN address TEXT;
  END IF;
END $$;

-- Ensure legacy databases also have 'units_fulfilled' column and constraint within bounds
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='emergency_requests' AND column_name='units_fulfilled'
  ) THEN
    ALTER TABLE public.emergency_requests ADD COLUMN units_fulfilled INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Optional: enforce units_fulfilled <= units_needed via constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emreq_units_fulfilled_le_needed_chk'
  ) THEN
    ALTER TABLE public.emergency_requests
      ADD CONSTRAINT emreq_units_fulfilled_le_needed_chk CHECK (units_fulfilled <= units_needed);
  END IF;
END $$;

-- ------------------------------
-- 4. Donation History
-- ------------------------------

CREATE TABLE IF NOT EXISTS public.donation_history (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id         UUID        REFERENCES public.users(id),
  blood_bank_id    UUID        NOT NULL REFERENCES public.users(id),
  hospital_id      UUID        REFERENCES public.users(id),
  request_id       UUID        REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
  donation_date    TIMESTAMPTZ DEFAULT NOW(),
  blood_type       TEXT        NOT NULL
                                  CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_contributed INTEGER    NOT NULL CHECK (units_contributed > 0),
  source           TEXT        NOT NULL DEFAULT 'donor'
                                  CHECK (source IN ('donor','bank_delivery')),
  certificate_url  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure legacy databases have expected columns on donation_history
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='donation_history' AND column_name='hospital_id'
  ) THEN
    ALTER TABLE public.donation_history ADD COLUMN hospital_id UUID REFERENCES public.users(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='donation_history' AND column_name='request_id'
  ) THEN
    ALTER TABLE public.donation_history ADD COLUMN request_id UUID REFERENCES public.emergency_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index to speed up donor-based aggregations (leaderboard)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_donation_history_donor_id' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_donation_history_donor_id ON public.donation_history(donor_id);
  END IF;
END $$;

-- Helper function for top donors by total donations
CREATE OR REPLACE FUNCTION public.get_top_donors(p_limit integer)
RETURNS TABLE (
  donor_id uuid,
  donations_count integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT dh.donor_id, COUNT(*)::int AS donations_count
  FROM public.donation_history AS dh
  WHERE dh.donor_id IS NOT NULL
  GROUP BY dh.donor_id
  ORDER BY COUNT(*) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
$$;

-- ------------------------------
-- 4.1 Donor-reported Donation Submissions (awaiting bank review)
-- ------------------------------

CREATE TABLE IF NOT EXISTS public.donation_submissions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id         UUID        NOT NULL REFERENCES public.users(id),
  blood_bank_id    UUID        NOT NULL REFERENCES public.users(id),
  blood_type       TEXT        NOT NULL
                                  CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units            INTEGER     NOT NULL CHECK (units > 0 AND units <= 10),
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status           TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','accepted','declined')),
  reviewed_by      UUID        REFERENCES public.users(id),
  reviewed_at      TIMESTAMPTZ,
  note             TEXT
);

CREATE INDEX IF NOT EXISTS donation_submissions_bank_status_idx ON public.donation_submissions (blood_bank_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS donation_submissions_donor_idx ON public.donation_submissions (donor_id, submitted_at DESC);

-- Enable RLS (policies can be expanded as needed)
ALTER TABLE public.donation_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='donation_submissions' AND policyname='DonationSubmissions: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "DonationSubmissions: SELECT" ON public.donation_submissions FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='donation_submissions' AND policyname='DonationSubmissions: INSERT donor'
  ) THEN
    EXECUTE 'CREATE POLICY "DonationSubmissions: INSERT donor" ON public.donation_submissions FOR INSERT WITH CHECK (auth.uid() = donor_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='donation_submissions' AND policyname='DonationSubmissions: UPDATE bank'
  ) THEN
    EXECUTE 'CREATE POLICY "DonationSubmissions: UPDATE bank" ON public.donation_submissions FOR UPDATE USING (auth.uid() = blood_bank_id) WITH CHECK (auth.uid() = blood_bank_id)';
  END IF;
END $$;

-- ------------------------------
-- 4.3 Unified Activity History (donor donating, bank fulfillment, hospital request)
-- ------------------------------

-- Ensure legacy databases have `source` on donation_history
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='donation_history' AND column_name='source'
  ) THEN
    ALTER TABLE public.donation_history ADD COLUMN source TEXT;
    -- Backfill default and enforce constraints
    EXECUTE 'UPDATE public.donation_history SET source = COALESCE(source, ''donor'')';
    ALTER TABLE public.donation_history ALTER COLUMN source SET DEFAULT 'donor';
    ALTER TABLE public.donation_history ALTER COLUMN source SET NOT NULL;
    -- Add check constraint if it does not exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'donation_history_source_check'
    ) THEN
      ALTER TABLE public.donation_history
        ADD CONSTRAINT donation_history_source_check CHECK (source IN ('donor','bank_delivery'));
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.activity_history (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        TEXT        NOT NULL
                                   CHECK (event_type IN ('donor_donation','bank_fulfillment','hospital_request')),
  actor_id          UUID        REFERENCES public.users(id),
  actor_role        TEXT,
  actor_name        TEXT,
  target_id         UUID        REFERENCES public.users(id),
  target_role       TEXT,
  target_name       TEXT,
  related_request_id UUID       REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
  blood_type        TEXT        CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units             INTEGER     CHECK (units >= 0),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_history_created_idx ON public.activity_history(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_history_actor_idx ON public.activity_history(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_history_target_idx ON public.activity_history(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_history_type_idx ON public.activity_history(event_type, created_at DESC);

-- Ensure FK has ON DELETE behavior if table already exists (idempotent rebind)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'activity_history'
      AND tc.constraint_name = 'activity_history_related_request_id_fkey'
  ) THEN
    -- Drop and recreate with ON DELETE SET NULL if needed
    EXECUTE 'ALTER TABLE public.activity_history DROP CONSTRAINT activity_history_related_request_id_fkey';
  END IF;
  -- Recreate the FK with desired ON DELETE action (safe if it already matches)
  EXECUTE 'ALTER TABLE public.activity_history
           ADD CONSTRAINT activity_history_related_request_id_fkey
           FOREIGN KEY (related_request_id)
           REFERENCES public.emergency_requests(id)
           ON DELETE SET NULL';
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already defined with correct action; ignore
  NULL;
END $$;

-- Ensure activity_history.target_id has ON DELETE SET NULL behavior
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'activity_history'
      AND tc.constraint_name = 'activity_history_target_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.activity_history DROP CONSTRAINT activity_history_target_id_fkey';
  END IF;
  BEGIN
    EXECUTE 'ALTER TABLE public.activity_history
             ADD CONSTRAINT activity_history_target_id_fkey
             FOREIGN KEY (target_id)
             REFERENCES public.users(id)
             ON DELETE SET NULL';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Ensure activity_history.actor_id has ON DELETE SET NULL behavior
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'activity_history'
      AND tc.constraint_name = 'activity_history_actor_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.activity_history DROP CONSTRAINT activity_history_actor_id_fkey';
  END IF;
  BEGIN
    EXECUTE 'ALTER TABLE public.activity_history
             ADD CONSTRAINT activity_history_actor_id_fkey
             FOREIGN KEY (actor_id)
             REFERENCES public.users(id)
             ON DELETE SET NULL';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ------------------------------
-- 4.2 Donor Verifications (BloodBank -> Donor)
-- ------------------------------

CREATE TABLE IF NOT EXISTS public.donor_verifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_bank_id  UUID NOT NULL REFERENCES public.users(id),
  donor_id       UUID NOT NULL REFERENCES public.users(id),
  verified       BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at    TIMESTAMPTZ DEFAULT NOW(),
  notes          TEXT,
  CONSTRAINT donor_verifications_bank_donor_unique UNIQUE (blood_bank_id, donor_id)
);

CREATE INDEX IF NOT EXISTS donor_verifications_bank_idx ON public.donor_verifications(blood_bank_id, verified_at DESC);
CREATE INDEX IF NOT EXISTS donor_verifications_donor_idx ON public.donor_verifications(donor_id);

-- ------------------------------
-- 4.1 Request Fulfillments (Bank -> Hospital)
-- ------------------------------

CREATE TABLE IF NOT EXISTS public.request_fulfillments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  hospital_id    UUID NOT NULL REFERENCES public.users(id),
  blood_bank_id  UUID NOT NULL REFERENCES public.users(id),
  blood_type     TEXT NOT NULL
                     CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units          INTEGER NOT NULL CHECK (units > 0),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS request_fulfillments_bank_idx ON public.request_fulfillments(blood_bank_id, created_at DESC);
CREATE INDEX IF NOT EXISTS request_fulfillments_hosp_idx ON public.request_fulfillments(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS request_fulfillments_req_idx ON public.request_fulfillments(request_id);

-- Extend request_fulfillments with acceptance/delivery tracking (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='request_fulfillments' AND column_name='accepted_by_hospital'
  ) THEN
    ALTER TABLE public.request_fulfillments ADD COLUMN accepted_by_hospital BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='request_fulfillments' AND column_name='accepted_at'
  ) THEN
    ALTER TABLE public.request_fulfillments ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='request_fulfillments' AND column_name='delivered'
  ) THEN
    ALTER TABLE public.request_fulfillments ADD COLUMN delivered BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='request_fulfillments' AND column_name='delivered_at'
  ) THEN
    ALTER TABLE public.request_fulfillments ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='request_fulfillments' AND column_name='recorded_in_history'
  ) THEN
    ALTER TABLE public.request_fulfillments ADD COLUMN recorded_in_history BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- ------------------------------
-- 5. Notifications
-- ------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id),
  title            TEXT        NOT NULL,
  message          TEXT        NOT NULL,
  type             TEXT        NOT NULL,
  data             JSONB,
  read             BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure notifications.user_id has desired ON DELETE behavior (cascade deletes when a user is removed)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'notifications'
      AND tc.constraint_name = 'notifications_user_id_fkey'
  ) THEN
    -- Drop and recreate with ON DELETE CASCADE if needed
    EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey';
  END IF;
  -- Recreate the FK with ON DELETE CASCADE (no-op if already correct)
  BEGIN
    EXECUTE 'ALTER TABLE public.notifications
             ADD CONSTRAINT notifications_user_id_fkey
             FOREIGN KEY (user_id)
             REFERENCES public.users(id)
             ON DELETE CASCADE';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ------------------------------
-- 6. Blood Donation Camps
-- ------------------------------

CREATE TABLE IF NOT EXISTS public.blood_camps (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id     UUID        NOT NULL REFERENCES public.users(id),
  name             TEXT        NOT NULL,
  description      TEXT,
  -- Camps now also track latitude/longitude; triggers keep in sync with geography
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  location         GEOGRAPHY(POINT,4326),
  address          TEXT        NOT NULL,
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ NOT NULL,
  banner_url       TEXT,
  contact_phone    TEXT,
  contact_email    TEXT,
  capacity_target  INTEGER,
  registered_count INTEGER DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'planned'
                                   CHECK (status IN ('planned','ongoing','completed','cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure blood_camps.organizer_id has desired ON DELETE behavior (cascade when organizer is removed)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'blood_camps'
      AND tc.constraint_name = 'blood_camps_organizer_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.blood_camps DROP CONSTRAINT blood_camps_organizer_id_fkey';
  END IF;
  BEGIN
    EXECUTE 'ALTER TABLE public.blood_camps
             ADD CONSTRAINT blood_camps_organizer_id_fkey
             FOREIGN KEY (organizer_id)
             REFERENCES public.users(id)
             ON DELETE CASCADE';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS blood_camps_location_idx ON public.blood_camps USING GIST(location);
CREATE INDEX IF NOT EXISTS blood_camps_start_date_idx ON public.blood_camps(start_date);

-- Ensure legacy databases also have latitude/longitude columns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='blood_camps' AND column_name='latitude'
  ) THEN
    ALTER TABLE public.blood_camps ADD COLUMN latitude DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='blood_camps' AND column_name='longitude'
  ) THEN
    ALTER TABLE public.blood_camps ADD COLUMN longitude DOUBLE PRECISION;
  END IF;
END $$;

-- Ensure start_date <= end_date
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blood_camps_start_before_end_chk'
  ) THEN
    ALTER TABLE public.blood_camps
      ADD CONSTRAINT blood_camps_start_before_end_chk CHECK (start_date <= end_date);
  END IF;
END $$;

-- Registrations for blood camps
CREATE TABLE IF NOT EXISTS public.blood_camp_registrations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id        UUID NOT NULL REFERENCES public.blood_camps(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  registered_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(camp_id, email)
);

-- ------------------------------
-- 7. PostGIS Geospatial Functions
-- ------------------------------

-- Nearby donors function
CREATE OR REPLACE FUNCTION public.nearby_donors(
  lat FLOAT, long FLOAT,
  req_blood_type TEXT,
  max_distance_meters FLOAT DEFAULT 5000
) RETURNS TABLE (
  id UUID, name TEXT, blood_type TEXT,
  phone TEXT, distance FLOAT,
  latitude FLOAT, longitude FLOAT,
  last_donation TIMESTAMPTZ,
  eligible_date TIMESTAMPTZ,
  is_available BOOLEAN
) AS $$
  SELECT
    p.id, p.name, p.blood_type, p.phone,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(long,lat),4326)::geography) AS distance,
    ST_Y(p.location::geometry), ST_X(p.location::geometry),
    p.last_donation, p.eligible_date, p.is_available
  FROM public.users p
  WHERE p.role='donor'
    AND p.blood_type = req_blood_type
    AND p.is_available=TRUE
    AND (p.eligible_date IS NULL OR p.eligible_date <= NOW())
    AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(long,lat),4326)::geography, max_distance_meters)
  ORDER BY p.location <-> ST_SetSRID(ST_MakePoint(long,lat),4326)::geography;
$$ LANGUAGE SQL;

-- Nearby blood banks function
CREATE OR REPLACE FUNCTION public.nearby_blood_banks(
  lat FLOAT, long FLOAT,
  req_blood_type TEXT,
  max_distance_meters FLOAT DEFAULT 10000
) RETURNS TABLE (
  id UUID, name TEXT, address TEXT,
  phone TEXT, total_quantity INTEGER,
  distance FLOAT, latitude FLOAT, longitude FLOAT
) AS $$
  SELECT
    p.id, p.name, p.address, p.phone,
    COALESCE(SUM(bi.quantity),0)::INTEGER AS total_quantity,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(long,lat),4326)::geography) AS distance,
    ST_Y(p.location::geometry), ST_X(p.location::geometry)
  FROM public.users p
  LEFT JOIN public.blood_inventory bi
    ON bi.blood_bank_id=p.id AND bi.blood_type=req_blood_type
  WHERE p.role='blood-bank'
    AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(long,lat),4326)::geography, max_distance_meters)
  GROUP BY p.id;
$$ LANGUAGE SQL;

-- Nearby hospitals function
CREATE OR REPLACE FUNCTION public.nearby_hospitals(
  lat FLOAT, long FLOAT,
  max_distance_meters FLOAT DEFAULT 10000
) RETURNS TABLE (
  id UUID, name TEXT, address TEXT,
  phone TEXT, distance FLOAT, latitude FLOAT, longitude FLOAT
) AS $$
  SELECT
    p.id, p.name, p.address, p.phone,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(long,lat),4326)::geography) AS distance,
    ST_Y(p.location::geometry), ST_X(p.location::geometry)
  FROM public.users p
  WHERE p.role='hospital'
    AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(long,lat),4326)::geography, max_distance_meters);
$$ LANGUAGE SQL;

-- ------------------------------
-- 8. Triggers & Automations
-- ------------------------------

-- Update donor eligibility after donation
CREATE OR REPLACE FUNCTION public.update_eligibility() RETURNS TRIGGER AS $$
BEGIN
  -- Only update donor eligibility for actual donor donations
  IF NEW.donor_id IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    IF NEW.source IS NOT NULL AND NEW.source <> 'donor' THEN
      RETURN NEW;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    -- 'source' may not exist in legacy data
    NULL;
  END;
  UPDATE public.users
  SET last_donation = NEW.donation_date,
      eligible_date = NEW.donation_date + INTERVAL '90 days',
      donation_count = donation_count + 1,
      updated_at = NOW()
  WHERE id = NEW.donor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_eligibility'
  ) THEN
    CREATE TRIGGER trg_update_eligibility
    AFTER INSERT ON public.donation_history
    FOR EACH ROW EXECUTE FUNCTION public.update_eligibility();
  END IF;
END $$;

-- Log unified history when a donor donation is recorded
CREATE OR REPLACE FUNCTION public.log_history_on_donation() RETURNS TRIGGER AS $$
DECLARE donor_name TEXT; donor_role TEXT; bank_name TEXT; bank_role TEXT;
BEGIN
  -- Only log donor donation events for donor-sourced entries
  IF NEW.donor_id IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    IF NEW.source IS NOT NULL AND NEW.source <> 'donor' THEN
      RETURN NEW;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;
  SELECT name, role INTO donor_name, donor_role FROM public.users WHERE id = NEW.donor_id;
  SELECT name, role INTO bank_name, bank_role FROM public.users WHERE id = NEW.blood_bank_id;
  INSERT INTO public.activity_history(
    event_type, actor_id, actor_role, actor_name,
    target_id, target_role, target_name,
    blood_type, units, created_at
  ) VALUES (
    'donor_donation', NEW.donor_id, donor_role, donor_name,
    NEW.blood_bank_id, bank_role, bank_name,
    NEW.blood_type, NEW.units_contributed, COALESCE(NEW.donation_date, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_history_on_donation'
  ) THEN
    CREATE TRIGGER trg_log_history_on_donation
    AFTER INSERT ON public.donation_history
    FOR EACH ROW EXECUTE FUNCTION public.log_history_on_donation();
  END IF;
END $$;

-- Notify donors when emergency request created
-- Notify nearby blood banks when emergency request is created
CREATE OR REPLACE FUNCTION public.notify_blood_banks_on_request() RETURNS TRIGGER AS $$
DECLARE bank RECORD;
BEGIN
  FOR bank IN
    SELECT id, name
    FROM public.users
    WHERE role='blood-bank'
      AND ST_DWithin(location, NEW.location, 10000)
  LOOP
    INSERT INTO public.notifications(user_id,title,message,type,data,created_at)
    VALUES (
      bank.id,
      'New Emergency Request',
      NEW.urgency || ' request for ' || NEW.blood_type || ' units nearby',
      'emergency_request',
      jsonb_build_object('request_id',NEW.id,'blood_type',NEW.blood_type,'units_needed',NEW.units_needed),
      NOW()
    );

  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log unified history when a bank fulfills a hospital request
CREATE OR REPLACE FUNCTION public.log_history_on_fulfillment() RETURNS TRIGGER AS $$
DECLARE bank_name TEXT; bank_role TEXT; hosp_name TEXT; hosp_role TEXT;
BEGIN
  SELECT name, role INTO bank_name, bank_role FROM public.users WHERE id = NEW.blood_bank_id;
  SELECT name, role INTO hosp_name, hosp_role FROM public.users WHERE id = NEW.hospital_id;
  INSERT INTO public.activity_history(
    event_type, actor_id, actor_role, actor_name,
    target_id, target_role, target_name,
    related_request_id, blood_type, units, created_at
  ) VALUES (
    'bank_fulfillment', NEW.blood_bank_id, bank_role, bank_name,
    NEW.hospital_id, hosp_role, hosp_name,
    NEW.request_id, NEW.blood_type, NEW.units, COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_history_on_fulfillment'
  ) THEN
    CREATE TRIGGER trg_log_history_on_fulfillment
    AFTER INSERT ON public.request_fulfillments
    FOR EACH ROW EXECUTE FUNCTION public.log_history_on_fulfillment();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_banks_on_request'
  ) THEN
    CREATE TRIGGER trg_notify_banks_on_request
    AFTER INSERT ON public.emergency_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_blood_banks_on_request();
  END IF;
END $$;

-- Log unified history when a hospital creates a request
CREATE OR REPLACE FUNCTION public.log_history_on_request() RETURNS TRIGGER AS $$
DECLARE hosp_name TEXT; hosp_role TEXT;
BEGIN
  SELECT name, role INTO hosp_name, hosp_role FROM public.users WHERE id = NEW.hospital_id;
  INSERT INTO public.activity_history(
    event_type, actor_id, actor_role, actor_name,
    related_request_id, blood_type, units, created_at
  ) VALUES (
    'hospital_request', NEW.hospital_id, hosp_role, hosp_name,
    NEW.id, NEW.blood_type, NEW.units_needed, COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_history_on_request'
  ) THEN
    CREATE TRIGGER trg_log_history_on_request
    AFTER INSERT ON public.emergency_requests
    FOR EACH ROW EXECUTE FUNCTION public.log_history_on_request();
  END IF;
END $$;

-- Notify hospital when a bank posts a fulfillment (response)
CREATE OR REPLACE FUNCTION public.notify_hospital_on_fulfillment() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications(user_id,title,message,type,data,created_at)
  VALUES (
    NEW.hospital_id,
    'Bank responded to request',
    'A blood bank has offered ' || NEW.units || ' units of ' || NEW.blood_type || '.',
    'fulfillment_response',
    jsonb_build_object('request_id',NEW.request_id,'blood_bank_id',NEW.blood_bank_id,'units',NEW.units,'blood_type',NEW.blood_type),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_hospital_on_fulfillment'
  ) THEN
    CREATE TRIGGER trg_notify_hospital_on_fulfillment
    AFTER INSERT ON public.request_fulfillments
    FOR EACH ROW EXECUTE FUNCTION public.notify_hospital_on_fulfillment();
  END IF;
END $$;

-- Notify bank when hospital accepts a fulfillment
CREATE OR REPLACE FUNCTION public.notify_bank_on_acceptance() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepted_by_hospital = TRUE AND COALESCE(OLD.accepted_by_hospital,FALSE) = FALSE THEN
    INSERT INTO public.notifications(user_id,title,message,type,data,created_at)
    VALUES (
      NEW.blood_bank_id,
      'Hospital accepted your response',
      'Your offered units have been accepted.',
      'fulfillment_accepted',
      jsonb_build_object('request_id',NEW.request_id,'hospital_id',NEW.hospital_id,'units',NEW.units,'blood_type',NEW.blood_type),
      NOW()
    );
    IF NEW.accepted_at IS NULL THEN
      UPDATE public.request_fulfillments SET accepted_at = NOW() WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_bank_on_acceptance'
  ) THEN
    CREATE TRIGGER trg_notify_bank_on_acceptance
    AFTER UPDATE ON public.request_fulfillments
    FOR EACH ROW EXECUTE FUNCTION public.notify_bank_on_acceptance();
  END IF;
END $$;

-- When a fulfillment is marked delivered, bump units_fulfilled on the request
CREATE OR REPLACE FUNCTION public.bump_request_on_delivery() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivered = TRUE AND COALESCE(OLD.delivered,FALSE) = FALSE THEN
    UPDATE public.emergency_requests
    SET units_fulfilled = LEAST(units_needed, COALESCE(units_fulfilled,0) + NEW.units)
    WHERE id = NEW.request_id;
    IF NEW.delivered_at IS NULL THEN
      UPDATE public.request_fulfillments SET delivered_at = NOW() WHERE id = NEW.id;
    END IF;

    -- If we've delivered all required units across fulfillments, mark request fulfilled
    PERFORM 1 FROM public.emergency_requests er WHERE er.id = NEW.request_id AND COALESCE(er.units_fulfilled,0) >= er.units_needed;
    IF FOUND THEN
      UPDATE public.emergency_requests
      SET status = 'fulfilled', fulfilled_by = NEW.blood_bank_id, fulfilled_at = NOW()
      WHERE id = NEW.request_id AND status = 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bump_request_on_delivery'
  ) THEN
    CREATE TRIGGER trg_bump_request_on_delivery
    AFTER UPDATE OF delivered ON public.request_fulfillments
    FOR EACH ROW EXECUTE FUNCTION public.bump_request_on_delivery();
  END IF;
END $$;

-- On hospital approval of a request, record delivered fulfillments into donation_history
CREATE OR REPLACE FUNCTION public.record_history_on_request_approval() RETURNS TRIGGER AS $$
DECLARE f RECORD;
BEGIN
  IF NEW.approved_at IS NOT NULL AND OLD.approved_at IS NULL THEN
    FOR f IN
      SELECT * FROM public.request_fulfillments
      WHERE request_id = NEW.id AND delivered = TRUE AND recorded_in_history = FALSE
    LOOP
      INSERT INTO public.donation_history(donor_id, blood_bank_id, hospital_id, request_id, donation_date, blood_type, units_contributed, source, created_at)
      VALUES (NULL, f.blood_bank_id, NEW.hospital_id, NEW.id, NEW.approved_at, f.blood_type, f.units, 'bank_delivery', NOW());
      UPDATE public.request_fulfillments SET recorded_in_history = TRUE WHERE id = f.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_record_history_on_request_approval'
  ) THEN
    CREATE TRIGGER trg_record_history_on_request_approval
    AFTER UPDATE ON public.emergency_requests
    FOR EACH ROW EXECUTE FUNCTION public.record_history_on_request_approval();
  END IF;
END $$;

-- Auto-updated updated_at columns
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keep latitude/longitude <-> location in sync
CREATE OR REPLACE FUNCTION public.sync_user_geography() RETURNS TRIGGER AS $$
BEGIN
  -- If latitude/longitude are present and location is null or changed, compute geography from lat/lng
  IF (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSIF (NEW.location IS NOT NULL) THEN
    -- If location provided without lat/lng, derive them
    NEW.latitude := ST_Y(NEW.location::geometry);
    NEW.longitude := ST_X(NEW.location::geometry);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
-- Low stock notification trigger for verified donors and NGOs
CREATE OR REPLACE FUNCTION public.notify_on_low_stock() RETURNS TRIGGER AS $$
DECLARE dv RECORD;
DECLARE ngo RECORD;
DECLARE threshold INTEGER := 12; -- critical threshold
BEGIN
  IF NEW.quantity < threshold THEN
    -- Notify verified donors of this bank
    FOR dv IN SELECT donor_id FROM public.donor_verifications WHERE blood_bank_id = NEW.blood_bank_id AND verified = TRUE LOOP
      INSERT INTO public.notifications(user_id,title,message,type,data,created_at)
      VALUES (
        dv.donor_id,
        'Low Stock Alert: ' || NEW.blood_type,
        'Your associated blood bank is low on ' || NEW.blood_type || '. Consider donating soon.',
        'inventory_alert',
        jsonb_build_object('blood_type',NEW.blood_type,'quantity',NEW.quantity),
        NOW()
      );
    END LOOP;
    -- Notify NGOs (broadcast)
    FOR ngo IN SELECT id FROM public.users WHERE role='ngo' LOOP
      INSERT INTO public.notifications(user_id,title,message,type,data,created_at)
      VALUES (
        ngo.id,
        'Low Stock in Network: ' || NEW.blood_type,
        'A partner blood bank is low on ' || NEW.blood_type || '. Can you help coordinate donors?',
        'inventory_alert',
        jsonb_build_object('blood_type',NEW.blood_type,'quantity',NEW.quantity,'blood_bank_id',NEW.blood_bank_id),
        NOW()
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_on_low_stock'
  ) THEN
    CREATE TRIGGER trg_notify_on_low_stock
    AFTER INSERT OR UPDATE OF quantity ON public.blood_inventory
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_low_stock();
  END IF;
END $$;

-- Notify donors when a new blood camp is created (nearby & available)
CREATE OR REPLACE FUNCTION public.notify_donors_on_camp() RETURNS TRIGGER AS $$
DECLARE donor RECORD;
BEGIN
  FOR donor IN
    SELECT id, name
    FROM public.users
    WHERE role='donor'
      AND is_available = TRUE
      AND (eligible_date IS NULL OR eligible_date <= NOW())
      AND ST_DWithin(location, NEW.location, 15000)
  LOOP
    INSERT INTO public.notifications(user_id,title,message,type,data,created_at)
    VALUES (
      donor.id,
      'Upcoming Donation Drive',
      NEW.name || ' at ' || COALESCE(NEW.address,'nearby') || ' is scheduled soon.',
      'status_update',
      jsonb_build_object('camp_id',NEW.id,'start_date',NEW.start_date,'end_date',NEW.end_date),
      NOW()
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_donors_on_camp'
  ) THEN
    CREATE TRIGGER trg_notify_donors_on_camp
    AFTER INSERT ON public.blood_camps
    FOR EACH ROW EXECUTE FUNCTION public.notify_donors_on_camp();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_sync_geography_ins'
  ) THEN
    CREATE TRIGGER trg_users_sync_geography_ins
    BEFORE INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_geography();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_sync_geography_upd'
  ) THEN
    CREATE TRIGGER trg_users_sync_geography_upd
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_geography();
  END IF;
END $$;

-- Keep latitude/longitude <-> location in sync for camps
CREATE OR REPLACE FUNCTION public.sync_camp_geography() RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSIF (NEW.location IS NOT NULL) THEN
    NEW.latitude := ST_Y(NEW.location::geometry);
    NEW.longitude := ST_X(NEW.location::geometry);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_camps_sync_geography_ins'
  ) THEN
    CREATE TRIGGER trg_camps_sync_geography_ins
    BEFORE INSERT ON public.blood_camps
    FOR EACH ROW EXECUTE FUNCTION public.sync_camp_geography();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_camps_sync_geography_upd'
  ) THEN
    CREATE TRIGGER trg_camps_sync_geography_upd
    BEFORE UPDATE ON public.blood_camps
    FOR EACH ROW EXECUTE FUNCTION public.sync_camp_geography();
  END IF;
END $$;

-- Maintain registered_count on camps
CREATE OR REPLACE FUNCTION public.bump_camp_registered(delta INT, camp UUID) RETURNS VOID AS $$
BEGIN
  UPDATE public.blood_camps SET registered_count = GREATEST(0, COALESCE(registered_count,0) + delta)
  WHERE id = camp;
END;
$$ LANGUAGE plpgsql;

-- Trigger functions to update registered_count after insert/delete
CREATE OR REPLACE FUNCTION public.camp_registrations_after_insert() RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.bump_camp_registered(1, NEW.camp_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.camp_registrations_after_delete() RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.bump_camp_registered(-1, OLD.camp_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_camp_registrations_ai'
  ) THEN
    CREATE TRIGGER trg_camp_registrations_ai
    AFTER INSERT ON public.blood_camp_registrations
    FOR EACH ROW EXECUTE FUNCTION public.camp_registrations_after_insert();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_camp_registrations_ad'
  ) THEN
    CREATE TRIGGER trg_camp_registrations_ad
    AFTER DELETE ON public.blood_camp_registrations
    FOR EACH ROW EXECUTE FUNCTION public.camp_registrations_after_delete();
  END IF;
END $$;

-- ------------------------------
-- 9. Row Level Security (RLS) Policies
-- ------------------------------

-- Enable RLS on all app tables
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_camps        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_camp_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_history  ENABLE ROW LEVEL SECURITY;

-- Users: users can view all, update own, insert own (when using JWT with sub=user id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Users: SELECT" ON public.users FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users: UPDATE own'
  ) THEN
    EXECUTE 'CREATE POLICY "Users: UPDATE own" ON public.users FOR UPDATE USING (auth.uid() = id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users: INSERT own'
  ) THEN
    EXECUTE 'CREATE POLICY "Users: INSERT own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- ------------------------------
-- 10. Forecasting (lightweight placeholder)
-- ------------------------------

-- Store forecasts per entity (hospital or blood bank) and blood type
CREATE TABLE IF NOT EXISTS public.demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.users(id),
  entity_role TEXT NOT NULL CHECK (entity_role IN ('hospital','blood-bank')),
  blood_type TEXT NOT NULL CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  horizon TEXT NOT NULL CHECK (horizon IN ('7d','30d')),
  units NUMERIC NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, entity_role, blood_type, horizon)
);

ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='demand_forecasts' AND policyname='Forecasts: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Forecasts: SELECT" ON public.demand_forecasts FOR SELECT USING (true)';
  END IF;
END $$;

-- Materialize forecasts with a very simple moving-average heuristic
-- In production, call out to a model server and upsert results here.
CREATE OR REPLACE FUNCTION public.materialize_simple_forecasts(p_entity UUID, p_role TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE bt TEXT;
DECLARE avg_daily NUMERIC;
DECLARE seven NUMERIC; DECLARE thirty NUMERIC;
BEGIN
  IF p_role = 'hospital' THEN
    -- Use emergency_requests created by this hospital in last 120 days
    FOR bt IN SELECT UNNEST(ARRAY['A+','A-','B+','B-','AB+','AB-','O+','O-']) LOOP
      SELECT COALESCE(AVG(daily_units),0) INTO avg_daily FROM (
        SELECT DATE_TRUNC('day', created_at) d, SUM(units_needed)::NUMERIC AS daily_units
        FROM public.emergency_requests
        WHERE hospital_id = p_entity AND blood_type = bt AND created_at >= NOW() - INTERVAL '120 days'
        GROUP BY 1
      ) t;
      seven := ROUND(avg_daily * 7);
      thirty := ROUND(avg_daily * 30);
      INSERT INTO public.demand_forecasts(entity_id, entity_role, blood_type, horizon, units, computed_at)
      VALUES (p_entity, 'hospital', bt, '7d', seven, NOW())
      ON CONFLICT (entity_id, entity_role, blood_type, horizon) DO UPDATE SET units=EXCLUDED.units, computed_at=NOW();
      INSERT INTO public.demand_forecasts(entity_id, entity_role, blood_type, horizon, units, computed_at)
      VALUES (p_entity, 'hospital', bt, '30d', thirty, NOW())
      ON CONFLICT (entity_id, entity_role, blood_type, horizon) DO UPDATE SET units=EXCLUDED.units, computed_at=NOW();
    END LOOP;
  ELSIF p_role = 'blood-bank' THEN
    -- Use request_fulfillments by this bank in last 120 days
    FOR bt IN SELECT UNNEST(ARRAY['A+','A-','B+','B-','AB+','AB-','O+','O-']) LOOP
      SELECT COALESCE(AVG(daily_units),0) INTO avg_daily FROM (
        SELECT DATE_TRUNC('day', created_at) d, SUM(units)::NUMERIC AS daily_units
        FROM public.request_fulfillments
        WHERE blood_bank_id = p_entity AND blood_type = bt AND created_at >= NOW() - INTERVAL '120 days'
        GROUP BY 1
      ) t;
      seven := ROUND(avg_daily * 7);
      thirty := ROUND(avg_daily * 30);
      INSERT INTO public.demand_forecasts(entity_id, entity_role, blood_type, horizon, units, computed_at)
      VALUES (p_entity, 'blood-bank', bt, '7d', seven, NOW())
      ON CONFLICT (entity_id, entity_role, blood_type, horizon) DO UPDATE SET units=EXCLUDED.units, computed_at=NOW();
      INSERT INTO public.demand_forecasts(entity_id, entity_role, blood_type, horizon, units, computed_at)
      VALUES (p_entity, 'blood-bank', bt, '30d', thirty, NOW())
      ON CONFLICT (entity_id, entity_role, blood_type, horizon) DO UPDATE SET units=EXCLUDED.units, computed_at=NOW();
    END LOOP;
  END IF;
END;
$$;

-- Donor verifications: everyone can read; writes via server
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'donor_verifications' AND policyname = 'DonorVerifications: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "DonorVerifications: SELECT" ON public.donor_verifications FOR SELECT USING (true)';
  END IF;
END $$;

-- Request fulfillments: everyone can read; inserts are handled by server
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'request_fulfillments' AND policyname = 'Fulfillments: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Fulfillments: SELECT" ON public.request_fulfillments FOR SELECT USING (true)';
  END IF;
END $$;

-- Activity history: open read (can tighten later)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_history' AND policyname = 'Activity: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Activity: SELECT" ON public.activity_history FOR SELECT USING (true)';
  END IF;
END $$;

-- Blood inventory: blood banks manage own inventory
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_inventory' AND policyname = 'Inventory: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Inventory: SELECT" ON public.blood_inventory FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_inventory' AND policyname = 'Inventory: MANAGE'
  ) THEN
    EXECUTE 'CREATE POLICY "Inventory: MANAGE" ON public.blood_inventory FOR ALL USING (auth.uid() = blood_bank_id) WITH CHECK (auth.uid() = blood_bank_id)';
  END IF;
END $$;

-- Registrations: users can insert/select their entries (optional: keep open for now)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_camp_registrations' AND policyname = 'CampReg: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "CampReg: SELECT" ON public.blood_camp_registrations FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_camp_registrations' AND policyname = 'CampReg: INSERT'
  ) THEN
    EXECUTE 'CREATE POLICY "CampReg: INSERT" ON public.blood_camp_registrations FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'emergency_requests' AND policyname = 'Requests: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Requests: SELECT" ON public.emergency_requests FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'emergency_requests' AND policyname = 'Requests: INSERT hospital'
  ) THEN
    EXECUTE 'CREATE POLICY "Requests: INSERT hospital" ON public.emergency_requests FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role=''hospital''))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'donation_history' AND policyname = 'History: SELECT own'
  ) THEN
    EXECUTE 'CREATE POLICY "History: SELECT own" ON public.donation_history FOR SELECT USING (auth.uid() = donor_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'donation_history' AND policyname = 'History: INSERT own'
  ) THEN
    EXECUTE 'CREATE POLICY "History: INSERT own" ON public.donation_history FOR INSERT WITH CHECK (auth.uid() = donor_id)';
  END IF;
END $$;

-- Notifications: users view own, mark read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Notifications: SELECT own'
  ) THEN
    EXECUTE 'CREATE POLICY "Notifications: SELECT own" ON public.notifications FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Notifications: UPDATE own'
  ) THEN
    EXECUTE 'CREATE POLICY "Notifications: UPDATE own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- Camps: view all, manage own
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_camps' AND policyname = 'Camps: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Camps: SELECT" ON public.blood_camps FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blood_camps' AND policyname = 'Camps: MANAGE own'
  ) THEN
    EXECUTE 'CREATE POLICY "Camps: MANAGE own" ON public.blood_camps FOR ALL USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id)';
  END IF;
END $$;

-- ------------------------------
-- 11. Community: Posts & Comments
-- ------------------------------

-- Posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id      UUID NOT NULL REFERENCES public.users(id),
  content        TEXT NOT NULL,
  media_url      TEXT,
  -- Optional geo-tagging
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  location       GEOGRAPHY(POINT,4326),
  -- Optional classification
  post_type      TEXT,
  blood_type     TEXT,
  visibility     TEXT NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public','donor','hospital','blood-bank','ngo')),
  comment_count  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure community_posts.author_id has desired ON DELETE behavior (cascade when author is removed)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'community_posts'
      AND tc.constraint_name = 'community_posts_author_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_author_id_fkey';
  END IF;
  BEGIN
    EXECUTE 'ALTER TABLE public.community_posts
             ADD CONSTRAINT community_posts_author_id_fkey
             FOREIGN KEY (author_id)
             REFERENCES public.users(id)
             ON DELETE CASCADE';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS community_posts_created_idx ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_author_idx ON public.community_posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_location_idx ON public.community_posts USING GIST(location);

-- Comments
CREATE TABLE IF NOT EXISTS public.community_comments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id      UUID NOT NULL REFERENCES public.users(id),
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_comments_post_idx ON public.community_comments(post_id, created_at DESC);

-- Ensure legacy databases have required columns on community_posts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_posts' AND column_name='comment_count'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;
    -- Backfill from existing comments
    UPDATE public.community_posts p
    SET comment_count = COALESCE(c.cnt, 0)
    FROM (
      SELECT post_id, COUNT(*) AS cnt
      FROM public.community_comments
      GROUP BY post_id
    ) c
    WHERE p.id = c.post_id;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_posts' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_posts' AND column_name='post_type'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN post_type TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_posts' AND column_name='blood_type'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN blood_type TEXT;
  END IF;
END $$;

-- Optional constraints for new columns (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_post_type_chk'
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_post_type_chk CHECK (post_type IS NULL OR post_type IN ('request','discussion','event_update'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_blood_type_chk'
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_blood_type_chk CHECK (blood_type IS NULL OR blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'));
  END IF;
END $$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_post_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_posts_updated_at'
  ) THEN
    CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON public.community_posts
    FOR EACH ROW EXECUTE FUNCTION public.set_post_updated_at();
  END IF;
END $$;

-- ------------------------------
-- 12. Donor Alerts & Engagement Metrics
-- ------------------------------

-- Alerts sent to donors for specific emergency requests
CREATE TABLE IF NOT EXISTS public.donor_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  donor_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- hospital or blood-bank
  status          TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','declined','timeout','cancelled')),
  channel         TEXT,
  meta            JSONB,
  notified_at     TIMESTAMPTZ DEFAULT NOW(),
  response_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS donor_alerts_request_idx ON public.donor_alerts(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS donor_alerts_donor_idx   ON public.donor_alerts(donor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS donor_alerts_creator_idx ON public.donor_alerts(creator_id, created_at DESC);

-- Only one active alert per request+donor; allow multiple over time if previous was cancelled/timeout by app logic
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'donor_alerts_unique_request_donor'
  ) THEN
    ALTER TABLE public.donor_alerts
      ADD CONSTRAINT donor_alerts_unique_request_donor UNIQUE (request_id, donor_id);
  END IF;
END $$;

ALTER TABLE public.donor_alerts ENABLE ROW LEVEL SECURITY;

-- RLS: donors can read their alerts; creators can read alerts they created
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='donor_alerts' AND policyname='Alerts: SELECT own or creator'
  ) THEN
    EXECUTE 'CREATE POLICY "Alerts: SELECT own or creator" ON public.donor_alerts FOR SELECT USING (auth.uid() = donor_id OR auth.uid() = creator_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='donor_alerts' AND policyname='Alerts: UPDATE by donor'
  ) THEN
    EXECUTE 'CREATE POLICY "Alerts: UPDATE by donor" ON public.donor_alerts FOR UPDATE USING (auth.uid() = donor_id) WITH CHECK (auth.uid() = donor_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='donor_alerts' AND policyname='Alerts: INSERT by creator'
  ) THEN
    EXECUTE 'CREATE POLICY "Alerts: INSERT by creator" ON public.donor_alerts FOR INSERT WITH CHECK (auth.uid() = creator_id)';
  END IF;
END $$;

-- Engagement metrics per donor (acceptance, declines, timeouts, response speed)
CREATE OR REPLACE VIEW public.donor_engagement_metrics AS
SELECT
  d.id AS donor_id,
  COALESCE(SUM(CASE WHEN da.status IS NOT NULL THEN 1 ELSE 0 END), 0)::INT AS alerts_total,
  COALESCE(SUM(CASE WHEN da.status = 'accepted' THEN 1 ELSE 0 END), 0)::INT AS accepts,
  COALESCE(SUM(CASE WHEN da.status = 'declined' THEN 1 ELSE 0 END), 0)::INT AS declines,
  COALESCE(SUM(CASE WHEN da.status = 'timeout'  THEN 1 ELSE 0 END), 0)::INT AS timeouts,
  COALESCE(AVG(EXTRACT(EPOCH FROM (da.response_at - da.notified_at))), NULL) AS avg_response_seconds,
  MAX(da.response_at) AS last_response_at,
  -- historical donation-based engagement
  COALESCE(SUM(CASE WHEN dh.id IS NOT NULL THEN 1 ELSE 0 END), 0)::INT AS donations_total_ever,
  COALESCE(SUM(CASE WHEN dh.donation_date >= NOW() - INTERVAL '365 days' THEN 1 ELSE 0 END), 0)::INT AS donations_last_12m
FROM public.users d
LEFT JOIN public.donor_alerts da ON da.donor_id = d.id
LEFT JOIN public.donation_history dh ON dh.donor_id = d.id
WHERE d.role = 'donor'
GROUP BY d.id;

-- Open read for metrics view
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='donor_engagement_metrics'
  ) THEN
    -- no-op placeholder to keep idempotency block style consistent
    NULL;
  END IF;
END $$;

-- Geo sync for posts
CREATE OR REPLACE FUNCTION public.sync_post_geography() RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSIF (NEW.location IS NOT NULL) THEN
    NEW.latitude := ST_Y(NEW.location::geometry);
    NEW.longitude := ST_X(NEW.location::geometry);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_posts_sync_geography_ins'
  ) THEN
    CREATE TRIGGER trg_posts_sync_geography_ins
    BEFORE INSERT ON public.community_posts
    FOR EACH ROW EXECUTE FUNCTION public.sync_post_geography();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_posts_sync_geography_upd'
  ) THEN
    CREATE TRIGGER trg_posts_sync_geography_upd
    BEFORE UPDATE ON public.community_posts
    FOR EACH ROW EXECUTE FUNCTION public.sync_post_geography();
  END IF;
END $$;

-- Comment counters and post activity bumpers
CREATE OR REPLACE FUNCTION public.bump_post_comment_count_after_insert() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_posts
    SET comment_count = COALESCE(comment_count,0) + 1,
        updated_at = NOW()
    WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.bump_post_comment_count_after_delete() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_posts
    SET comment_count = GREATEST(0, COALESCE(comment_count,0) - 1),
        updated_at = NOW()
    WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_comments_ai_bump_post'
  ) THEN
    CREATE TRIGGER trg_comments_ai_bump_post
    AFTER INSERT ON public.community_comments
    FOR EACH ROW EXECUTE FUNCTION public.bump_post_comment_count_after_insert();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_comments_ad_bump_post'
  ) THEN
    CREATE TRIGGER trg_comments_ad_bump_post
    AFTER DELETE ON public.community_comments
    FOR EACH ROW EXECUTE FUNCTION public.bump_post_comment_count_after_delete();
  END IF;
END $$;

-- Ensure posts updated_at trigger exists (for legacy DBs missing it)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_posts_updated_at'
  ) THEN
    CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON public.community_posts
    FOR EACH ROW EXECUTE FUNCTION public.set_post_updated_at();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- Posts RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='Posts: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Posts: SELECT" ON public.community_posts FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='Posts: INSERT own'
  ) THEN
    EXECUTE 'CREATE POLICY "Posts: INSERT own" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = author_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='Posts: UPDATE own'
  ) THEN
    EXECUTE 'CREATE POLICY "Posts: UPDATE own" ON public.community_posts FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='Posts: DELETE own'
  ) THEN
    EXECUTE 'CREATE POLICY "Posts: DELETE own" ON public.community_posts FOR DELETE USING (auth.uid() = author_id)';
  END IF;
END $$;

-- Comments RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND policyname='Comments: SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Comments: SELECT" ON public.community_comments FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND policyname='Comments: INSERT own'
  ) THEN
    EXECUTE 'CREATE POLICY "Comments: INSERT own" ON public.community_comments FOR INSERT WITH CHECK (auth.uid() = author_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND policyname='Comments: DELETE own'
  ) THEN
    EXECUTE 'CREATE POLICY "Comments: DELETE own" ON public.community_comments FOR DELETE USING (auth.uid() = author_id)';
  END IF;
END $$;

-- Ensure non-empty content constraints (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_content_nonempty_chk'
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_content_nonempty_chk CHECK (length(trim(content)) > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_comments_content_nonempty_chk'
  ) THEN
    ALTER TABLE public.community_comments
      ADD CONSTRAINT community_comments_content_nonempty_chk CHECK (length(trim(content)) > 0);
  END IF;
END $$;

-- Convenience views for community with author metadata
-- Drop then create to avoid column rename conflicts on CREATE OR REPLACE
DROP VIEW IF EXISTS public.v_community_posts;
CREATE VIEW public.v_community_posts AS
SELECT p.*,
       u.name AS author_name,
       u.role AS author_role
FROM public.community_posts p
JOIN public.users u ON u.id = p.author_id;

DROP VIEW IF EXISTS public.v_community_comments;
CREATE VIEW public.v_community_comments AS
SELECT c.*,
       u.name AS author_name,
       u.role AS author_role
FROM public.community_comments c
JOIN public.users u ON u.id = c.author_id;
