-- ============================================================================
-- MULTI-TENANT MIGRATION: RT Management App
-- ============================================================================
-- Converts single-tenant schema to multi-tenant with organizations table,
-- organization_id on all tables, storage buckets, and RLS policies.
--
-- Run order:
--   1. Create organizations table
--   2. Add organization_id to all existing tables
--   3. Create storage buckets
--   4. Enable RLS and create policies
--   5. Create indexes
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL,                              -- e.g. "RT Ciapus Mountain View"
    slug          text NOT NULL UNIQUE,                       -- e.g. "cmv" or "pasireurihkaum"
    description   text,                                       -- optional description
    province      text NOT NULL,                              -- e.g. "Jawa Barat"
    kabupaten     text NOT NULL,                              -- e.g. "Kabupaten Bogor"
    kecamatan     text NOT NULL,                              -- e.g. "Ciomas"
    kelurahan     text NOT NULL,                              -- e.g. "Ciapus"
    rt_number     text NOT NULL,                              -- e.g. "002"
    rw_number     text NOT NULL,                              -- e.g. "013"
    address_full  text NOT NULL,                              -- complete formatted address
    ketua_rt_name text NOT NULL,                              -- chairman name
    logo_url      text,                                       -- storage path or public URL
    stamp_url     text,                                       -- stamp image path
    signature_url text,                                       -- digital signature path
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Slug index for fast lookups (unique constraint already creates one, explicit for clarity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- STEP 2: ADD organization_id TO ALL EXISTING TABLES
-- ============================================================================
-- Strategy:
--   a) Add nullable column first (no data loss risk)
--   b) Create FK constraint with ON DELETE CASCADE
--   c) Backfill with default org (manual — see Step 6 notes)
--   d) After backfill, ALTER to SET NOT NULL (manual — see Step 6 notes)
-- ============================================================================

-- 2a. users
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS fk_users_organization;

ALTER TABLE public.users
    ADD CONSTRAINT fk_users_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
        ON DELETE CASCADE;

-- 2b. houses
ALTER TABLE public.houses
    ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.houses
    DROP CONSTRAINT IF EXISTS fk_houses_organization;

ALTER TABLE public.houses
    ADD CONSTRAINT fk_houses_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
        ON DELETE CASCADE;

-- 2c. announcements
ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.announcements
    DROP CONSTRAINT IF EXISTS fk_announcements_organization;

ALTER TABLE public.announcements
    ADD CONSTRAINT fk_announcements_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
        ON DELETE CASCADE;

-- 2d. payments
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.payments
    DROP CONSTRAINT IF EXISTS fk_payments_organization;

ALTER TABLE public.payments
    ADD CONSTRAINT fk_payments_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
        ON DELETE CASCADE;

-- 2e. letters
ALTER TABLE public.letters
    ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.letters
    DROP CONSTRAINT IF EXISTS fk_letters_organization;

ALTER TABLE public.letters
    ADD CONSTRAINT fk_letters_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
        ON DELETE CASCADE;

-- 2f. families
ALTER TABLE public.families
    ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.families
    DROP CONSTRAINT IF EXISTS fk_families_organization;

ALTER TABLE public.families
    ADD CONSTRAINT fk_families_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
        ON DELETE CASCADE;

-- 2g. notifications
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS fk_notifications_organization;

ALTER TABLE public.notifications
    ADD CONSTRAINT fk_notifications_organization
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
        ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: CREATE SUPABASE STORAGE BUCKETS
-- ============================================================================
-- Buckets: logos, stamps, signatures, banners, payment-proofs
-- All buckets are PRIVATE — access is controlled via storage policies.
-- File size limits: 2MB for images, 5MB for banners & payment-proofs.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('logos',          'logos',          false, 2097152, '{"image/png","image/jpeg","image/webp","image/svg+xml"}'),
    ('stamps',         'stamps',         false, 2097152, '{"image/png","image/jpeg","image/webp"}'),
    ('signatures',     'signatures',     false, 2097152, '{"image/png","image/jpeg","image/webp"}'),
    ('banners',        'banners',        false, 5242880, '{"image/png","image/jpeg","image/webp"}'),
    ('payment-proofs', 'payment-proofs', false, 5242880, '{"image/png","image/jpeg","image/webp","application/pdf"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 3b: STORAGE POLICIES
-- ============================================================================
-- Path convention: {bucket}/{organization_id}/{filename}
--   e.g. logos/550e8400-e29b-41d4-a716-446655440000/rt-logo.png
--
-- The first folder segment must match the user's organization_id.
-- Admin/ketua_rt can manage org assets (logos, stamps, signatures, banners).
-- All org members can upload payment proofs; only admin/ketua can delete them.
-- ============================================================================

-- --- LOGOS bucket ---
CREATE POLICY storage_logos_select ON storage.objects
    FOR SELECT USING (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY storage_logos_insert ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

CREATE POLICY storage_logos_update ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

CREATE POLICY storage_logos_delete ON storage.objects
    FOR DELETE USING (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

-- --- STAMPS bucket ---
CREATE POLICY storage_stamps_select ON storage.objects
    FOR SELECT USING (
        bucket_id = 'stamps'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY storage_stamps_insert ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'stamps'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

CREATE POLICY storage_stamps_update ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'stamps'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

CREATE POLICY storage_stamps_delete ON storage.objects
    FOR DELETE USING (
        bucket_id = 'stamps'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

-- --- SIGNATURES bucket ---
CREATE POLICY storage_signatures_select ON storage.objects
    FOR SELECT USING (
        bucket_id = 'signatures'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY storage_signatures_insert ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'signatures'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

CREATE POLICY storage_signatures_update ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'signatures'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

CREATE POLICY storage_signatures_delete ON storage.objects
    FOR DELETE USING (
        bucket_id = 'signatures'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

-- --- BANNERS bucket ---
CREATE POLICY storage_banners_select ON storage.objects
    FOR SELECT USING (
        bucket_id = 'banners'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY storage_banners_insert ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'banners'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

CREATE POLICY storage_banners_update ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'banners'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

CREATE POLICY storage_banners_delete ON storage.objects
    FOR DELETE USING (
        bucket_id = 'banners'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

-- --- PAYMENT-PROOFS bucket ---
-- All org members can upload; only admin/ketua can delete
CREATE POLICY storage_payment_proofs_select ON storage.objects
    FOR SELECT USING (
        bucket_id = 'payment-proofs'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY storage_payment_proofs_insert ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'payment-proofs'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY storage_payment_proofs_update ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'payment-proofs'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY storage_payment_proofs_delete ON storage.objects
    FOR DELETE USING (
        bucket_id = 'payment-proofs'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM public.users WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'ketua_rt')
        )
    );

-- ============================================================================
-- STEP 4: ENABLE RLS & CREATE ROW-LEVEL SECURITY POLICIES
-- ============================================================================
-- Core tenant isolation pattern:
--   Every row's organization_id must match the current user's organization_id.
--
-- Helper functions (SECURITY DEFINER) avoid repeating the subquery in every policy:
--   - current_user_org_id()  → resolves the auth user's org
--   - current_user_is_admin() → checks admin/ketua_rt role
--
-- Policy design per table:
--   SELECT  → org members see only their org's data
--   INSERT  → org_id must match current user's org; admins-only for sensitive tables
--   UPDATE  → can only update within own org; cannot change org_id (WITH CHECK)
--   DELETE  → admins/ketua only (except notifications — users can delete their own)
-- ============================================================================

-- Helper: get current user's organization_id
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- Helper: check if current user is admin or ketua_rt
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('admin', 'ketua_rt')
    );
$$;

-- ---------------------------------------------------------------------------
-- 4.1 organizations
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_organizations_select ON public.organizations
    FOR SELECT USING (id = public.current_user_org_id());

CREATE POLICY rls_organizations_update ON public.organizations
    FOR UPDATE USING (
        id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

-- No INSERT or DELETE via app — only superadmin / dashboard

-- ---------------------------------------------------------------------------
-- 4.2 users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_users_select ON public.users
    FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY rls_users_insert ON public.users
    FOR INSERT WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

CREATE POLICY rls_users_update ON public.users
    FOR UPDATE USING (organization_id = public.current_user_org_id())
    WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY rls_users_delete ON public.users
    FOR DELETE USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

-- ---------------------------------------------------------------------------
-- 4.3 houses
-- ---------------------------------------------------------------------------
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_houses_select ON public.houses
    FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY rls_houses_insert ON public.houses
    FOR INSERT WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

CREATE POLICY rls_houses_update ON public.houses
    FOR UPDATE USING (organization_id = public.current_user_org_id())
    WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY rls_houses_delete ON public.houses
    FOR DELETE USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

-- ---------------------------------------------------------------------------
-- 4.4 announcements
-- ---------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_announcements_select ON public.announcements
    FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY rls_announcements_insert ON public.announcements
    FOR INSERT WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

CREATE POLICY rls_announcements_update ON public.announcements
    FOR UPDATE USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    )
    WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY rls_announcements_delete ON public.announcements
    FOR DELETE USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

-- ---------------------------------------------------------------------------
-- 4.5 payments
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_payments_select ON public.payments
    FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY rls_payments_insert ON public.payments
    FOR INSERT WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY rls_payments_update ON public.payments
    FOR UPDATE USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    )
    WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY rls_payments_delete ON public.payments
    FOR DELETE USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

-- ---------------------------------------------------------------------------
-- 4.6 letters
-- ---------------------------------------------------------------------------
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_letters_select ON public.letters
    FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY rls_letters_insert ON public.letters
    FOR INSERT WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

CREATE POLICY rls_letters_update ON public.letters
    FOR UPDATE USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    )
    WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY rls_letters_delete ON public.letters
    FOR DELETE USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

-- ---------------------------------------------------------------------------
-- 4.7 families
-- ---------------------------------------------------------------------------
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_families_select ON public.families
    FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY rls_families_insert ON public.families
    FOR INSERT WITH CHECK (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

CREATE POLICY rls_families_update ON public.families
    FOR UPDATE USING (organization_id = public.current_user_org_id())
    WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY rls_families_delete ON public.families
    FOR DELETE USING (
        organization_id = public.current_user_org_id()
        AND public.current_user_is_admin()
    );

-- ---------------------------------------------------------------------------
-- 4.8 notifications
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_notifications_select ON public.notifications
    FOR SELECT USING (organization_id = public.current_user_org_id());

CREATE POLICY rls_notifications_insert ON public.notifications
    FOR INSERT WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY rls_notifications_update ON public.notifications
    FOR UPDATE USING (organization_id = public.current_user_org_id())
    WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY rls_notifications_delete ON public.notifications
    FOR DELETE USING (organization_id = public.current_user_org_id());

-- ============================================================================
-- STEP 5: CREATE PERFORMANCE INDEXES
-- ============================================================================
-- Indexes on organization_id for every tenant-scoped table.
-- CRITICAL for RLS performance — without these, Postgres does sequential scans
-- on every query because the RLS policy filters by organization_id.
-- ============================================================================

-- Core org_id indexes (covers most WHERE organization_id = ? queries)
CREATE INDEX IF NOT EXISTS idx_users_org             ON public.users           (organization_id);
CREATE INDEX IF NOT EXISTS idx_houses_org            ON public.houses          (organization_id);
CREATE INDEX IF NOT EXISTS idx_announcements_org     ON public.announcements   (organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org          ON public.payments        (organization_id);
CREATE INDEX IF NOT EXISTS idx_letters_org           ON public.letters         (organization_id);
CREATE INDEX IF NOT EXISTS idx_families_org          ON public.families        (organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org     ON public.notifications   (organization_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_houses_org_number     ON public.houses          (organization_id, house_number);
CREATE INDEX IF NOT EXISTS idx_payments_org_status   ON public.payments        (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_org_date     ON public.payments        (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_org_date ON public.announcements  (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON public.notifications  (organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_letters_org_type      ON public.letters         (organization_id, letter_type);
CREATE INDEX IF NOT EXISTS idx_users_org_role        ON public.users           (organization_id, role);

-- ============================================================================
-- STEP 6: POST-MIGRATION INSTRUCTIONS (RUN MANUALLY)
-- ============================================================================
--
-- 6.1  Create a default organization for existing data:
--
--      INSERT INTO public.organizations (name, slug, province, kabupaten, kecamatan, kelurahan, rt_number, rw_number, address_full, ketua_rt_name)
--      VALUES ('RT Default', 'default', 'Jawa Barat', 'Kabupaten Bogor', 'Ciomas', 'Ciapus', '002', '013', 'Default Address', 'Ketua RT');
--
-- 6.2  Backfill organization_id on all existing rows (replace <DEFAULT-ORG-UUID>):
--
--      UPDATE public.users           SET organization_id = '<DEFAULT-ORG-UUID>';
--      UPDATE public.houses          SET organization_id = '<DEFAULT-ORG-UUID>';
--      UPDATE public.announcements   SET organization_id = '<DEFAULT-ORG-UUID>';
--      UPDATE public.payments        SET organization_id = '<DEFAULT-ORG-UUID>';
--      UPDATE public.letters         SET organization_id = '<DEFAULT-ORG-UUID>';
--      UPDATE public.families        SET organization_id = '<DEFAULT-ORG-UUID>';
--      UPDATE public.notifications   SET organization_id = '<DEFAULT-ORG-UUID>';
--
-- 6.3  Make organization_id NOT NULL after backfill:
--
--      ALTER TABLE public.users           ALTER COLUMN organization_id SET NOT NULL;
--      ALTER TABLE public.houses          ALTER COLUMN organization_id SET NOT NULL;
--      ALTER TABLE public.announcements   ALTER COLUMN organization_id SET NOT NULL;
--      ALTER TABLE public.payments        ALTER COLUMN organization_id SET NOT NULL;
--      ALTER TABLE public.letters         ALTER COLUMN organization_id SET NOT NULL;
--      ALTER TABLE public.families        ALTER COLUMN organization_id SET NOT NULL;
--      ALTER TABLE public.notifications   ALTER COLUMN organization_id SET NOT NULL;
--
-- 6.4  Storage path convention:
--      Upload files to: {bucket}/{organization_id}/{filename}
--      Example: logos/550e8400-e29b-41d4-a716-446655440000/rt-logo.png
--      This ensures storage policies match the first folder to the user's org.
--
-- ============================================================================
