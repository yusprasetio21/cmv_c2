-- =====================================================
-- Migration Script: Segregasi Anggota Warga per RT
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Tambah Kolom RT/RW ke Users Table
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS rt_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rw_number TEXT;

-- =====================================================
-- STEP 2: Create Indexes untuk Performa
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_rt_number ON users(rt_number);
CREATE INDEX IF NOT EXISTS idx_users_rw_number ON users(rw_number);
CREATE INDEX IF NOT EXISTS idx_users_rt_org ON users(rt_number, organization_id);
CREATE INDEX IF NOT EXISTS idx_users_rw_org ON users(rw_number, organization_id);

-- =====================================================
-- STEP 3: Populate Data Lama (Jika Ada)
-- =====================================================

-- Jika rumah sudah punya informasi RT, copy ke users
UPDATE users 
SET rt_number = h.blok
FROM houses h 
WHERE (
  users.rumah_id = h.id::text
  OR users.rumah_id = h.nomor_rumah
)
  AND users.rt_number IS NULL;

-- Alternative: Set RT berdasarkan house blok (jika blok = RT)
-- UPDATE users 
-- SET rt_number = h.blok
-- FROM houses h
-- WHERE users.rumah_id = h.nomor_rumah
--   AND users.rt_number IS NULL;

-- =====================================================
-- STEP 4: Data Validation Queries
-- =====================================================

-- Cek berapa user sudah punya RT
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN rt_number IS NOT NULL THEN 1 END) as users_dengan_rt,
  COUNT(CASE WHEN rt_number IS NULL THEN 1 END) as users_tanpa_rt
FROM users;

-- Cek distribusi user per RT
SELECT 
  rt_number,
  COUNT(*) as jumlah_user,
  COUNT(CASE WHEN role = 'ketua_rt' THEN 1 END) as ketua_rt,
  COUNT(CASE WHEN role = 'warga' THEN 1 END) as warga,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin
FROM users
WHERE rt_number IS NOT NULL
GROUP BY rt_number
ORDER BY rt_number;

-- Cek ketua_rt duplikat dalam RT yang sama (error condition)
SELECT 
  rt_number,
  COUNT(*) as jumlah_ketua_rt
FROM users
WHERE role = 'ketua_rt'
GROUP BY rt_number
HAVING COUNT(*) > 1;

-- Cek user tanpa RT (anomali - perlu di-set)
SELECT 
  id,
  username,
  nama_lengkap,
  role,
  rumah_id
FROM users
WHERE rt_number IS NULL 
  AND role IN ('warga', 'ketua_rt')
ORDER BY nama_lengkap;

-- =====================================================
-- STEP 5: Role-Based Access Control (RLS) - Optional
-- =====================================================

-- Note: Sangat recommended untuk production
-- Enable RLS pada users table

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Admin dapat akses semua
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'users'
      AND policyname = 'admin_can_access_all_users'
  ) THEN
    CREATE POLICY "admin_can_access_all_users" ON users
      FOR SELECT
      USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      );
  END IF;
END $$;

-- Policy: Ketua RT hanya bisa lihat warga RT-nya sendiri
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'users'
      AND policyname = 'ketua_rt_can_view_own_rt_residents'
  ) THEN
    CREATE POLICY "ketua_rt_can_view_own_rt_residents" ON users
      FOR SELECT
      USING (
        auth.uid() = id 
        OR (
          (SELECT role FROM users WHERE id = auth.uid()) = 'ketua_rt'
          AND (SELECT rt_number FROM users WHERE id = auth.uid()) = rt_number
          AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
        )
      );
  END IF;
END $$;

-- Policy: Warga hanya bisa lihat profil sendiri
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'users'
      AND policyname = 'warga_can_view_own_profile'
  ) THEN
    CREATE POLICY "warga_can_view_own_profile" ON users
      FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

-- =====================================================
-- STEP 6: Backup & Reset (Jika Diperlukan)
-- =====================================================

-- BACKUP: Simpan data lama sebelum modifikasi (optional)
-- CREATE TABLE users_backup AS SELECT * FROM users;

-- RESET: Hapus RT data (gunakan saat testing ulang)
-- UPDATE users SET rt_number = NULL, rw_number = NULL;

-- =====================================================
-- STEP 7: Reporting Queries
-- =====================================================

-- Report: Warga per RT dengan detail
SELECT 
  u.rt_number,
  u.rw_number,
  u.role,
  u.username,
  u.nama_lengkap,
  h.nomor_rumah,
  h.blok,
  f.nama_kk
FROM users u
LEFT JOIN houses h ON u.rumah_id = h.id::text
LEFT JOIN families f ON u.id = f.user_id
WHERE u.organization_id = '00000000-0000-0000-0000-000000000001'
ORDER BY u.rt_number, u.nama_lengkap;

-- Report: Statistik lengkap RT
SELECT 
  rt_number,
  rw_number,
  COUNT(*) as total_warga,
  COUNT(DISTINCT rumah_id) as rumah_terisi,
  COUNT(CASE WHEN role = 'ketua_rt' THEN 1 END) as ketua_rt_count,
  MAX(created_at) as last_update
FROM users
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
GROUP BY rt_number, rw_number
ORDER BY rt_number, rw_number;

-- Report: Anggota keluarga per RT
SELECT 
  u.rt_number,
  u.nama_lengkap as kepala_keluarga,
  COALESCE(jsonb_array_length(f.members), 0) as jumlah_anggota_keluarga
FROM users u
LEFT JOIN families f ON u.id = f.user_id
WHERE u.organization_id = '00000000-0000-0000-0000-000000000001'
  AND u.role IN ('warga', 'ketua_rt')
ORDER BY u.rt_number, u.nama_lengkap;

-- =====================================================
-- STEP 8: Cleanup & Optimization (Setelah Migration)
-- =====================================================

-- NOTE: Supabase SQL Editor menjalankan script dalam transaction block.
-- VACUUM dan REINDEX tidak dapat dijalankan di dalam transaction block.
-- Jalankan perintah ini secara terpisah di console database jika diperlukan.
-- VACUUM ANALYZE users;
-- REINDEX TABLE users;

-- =====================================================
-- FREQUENTLY USED QUERIES AFTER MIGRATION
-- =====================================================

-- Query: Ambil semua warga RT 002 RW 013
SELECT * FROM users 
WHERE rt_number = '002' 
  AND rw_number = '013'
  AND organization_id = '00000000-0000-0000-0000-000000000001'
ORDER BY nama_lengkap;

-- Query: Ambil ketua RT RT 002
SELECT * FROM users
WHERE rt_number = '002'
  AND role = 'ketua_rt'
  AND organization_id = '00000000-0000-0000-0000-000000000001';

-- Query: List semua ketua RT dalam suatu organization
SELECT rt_number, rw_number, nama_lengkap, username FROM users
WHERE role = 'ketua_rt'
  AND organization_id = '00000000-0000-0000-0000-000000000001'
ORDER BY rt_number;

-- Query: Anggota RT tertentu dengan info rumah
SELECT 
  u.id,
  u.username,
  u.nama_lengkap,
  u.role,
  h.nomor_rumah,
  h.blok
FROM users u
LEFT JOIN houses h ON u.rumah_id = h.id::text
WHERE u.rt_number = '002'
  AND u.organization_id = '00000000-0000-0000-0000-000000000001'
ORDER BY h.nomor_rumah;

-- =====================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================

-- Cek user dengan rumah_id invalid
SELECT u.id, u.username, u.rumah_id 
FROM users u
LEFT JOIN houses h ON u.rumah_id = h.id::text
WHERE u.rumah_id IS NOT NULL 
  AND h.id IS NULL;

-- Cek duplikat username dalam RT yang sama
SELECT rt_number, username, COUNT(*) 
FROM users 
GROUP BY rt_number, username 
HAVING COUNT(*) > 1;

-- Cek user yang sudah di-delete tapi masih ada reference
SELECT * FROM families 
WHERE user_id NOT IN (SELECT id FROM users);
