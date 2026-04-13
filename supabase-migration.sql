-- =====================================================
-- RT Digital SaaS - Multi-Tenant Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  province TEXT NOT NULL DEFAULT '',
  kabupaten TEXT NOT NULL DEFAULT '',
  kecamatan TEXT NOT NULL DEFAULT '',
  kelurahan TEXT NOT NULL DEFAULT '',
  rt_number TEXT NOT NULL DEFAULT '',
  rw_number TEXT NOT NULL DEFAULT '',
  address_full TEXT NOT NULL DEFAULT '',
  ketua_rt_name TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  stamp_url TEXT,
  signature_url TEXT,
  iuran_nominal INTEGER DEFAULT 150000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add organization_id to all existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add gambar_url to announcements if not exists
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS gambar_url TEXT;

-- 3. Create indexes for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_houses_org ON houses(organization_id);
CREATE INDEX IF NOT EXISTS idx_announcements_org ON announcements(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_letters_org ON letters(organization_id);
CREATE INDEX IF NOT EXISTS idx_families_org ON families(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- 4. Disable RLS temporarily for setup (re-enable later)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - allow all for anon (we handle auth in app)
CREATE POLICY "Allow all operations on organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on houses" ON houses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on announcements" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on letters" ON letters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on families" ON families FOR ALL USING (true) WITH CHECK (true);

-- 6. Insert default organization for existing data
INSERT INTO organizations (id, name, slug, province, kabupaten, kecamatan, kelurahan, rt_number, rw_number, address_full, ketua_rt_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'RT Ciapus Mountain View',
  'cmv',
  'Jawa Barat',
  'Kabupaten Bogor',
  'Tamansari',
  'Pasireurih',
  '002',
  '013',
  'Perumahan Ciapus Mountain View RT 002 RW 013 Desa Pasireurih Kecamatan Tamansari Kabupaten Bogor',
  'Ketua RT'
) ON CONFLICT (slug) DO NOTHING;

-- 7. Assign existing data to default organization
UPDATE users SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE houses SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE announcements SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE payments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE letters SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE families SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- 8. Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stamps', 'stamps', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true) ON CONFLICT (id) DO NOTHING;

-- 9. Storage policies - allow public read, authenticated upload
CREATE POLICY "Public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Public read stamps" ON storage.objects FOR SELECT USING (bucket_id = 'stamps');
CREATE POLICY "Public read signatures" ON storage.objects FOR SELECT USING (bucket_id = 'signatures');
CREATE POLICY "Public read banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Public read payment-proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs');

CREATE POLICY "Allow insert logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Allow insert stamps" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stamps');
CREATE POLICY "Allow insert signatures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'signatures');
CREATE POLICY "Allow insert banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners');
CREATE POLICY "Allow insert payment-proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Allow update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');
CREATE POLICY "Allow update stamps" ON storage.objects FOR UPDATE USING (bucket_id = 'stamps');
CREATE POLICY "Allow update signatures" ON storage.objects FOR UPDATE USING (bucket_id = 'signatures');
CREATE POLICY "Allow update banners" ON storage.objects FOR UPDATE USING (bucket_id = 'banners');

CREATE POLICY "Allow delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos');
CREATE POLICY "Allow delete stamps" ON storage.objects FOR DELETE USING (bucket_id = 'stamps');
CREATE POLICY "Allow delete signatures" ON storage.objects FOR DELETE USING (bucket_id = 'signatures');
CREATE POLICY "Allow delete banners" ON storage.objects FOR DELETE USING (bucket_id = 'banners');
