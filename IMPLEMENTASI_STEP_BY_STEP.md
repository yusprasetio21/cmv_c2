# 📋 PANDUAN IMPLEMENTASI STEP-BY-STEP
## Segregasi Anggota Warga Berdasarkan RT

---

## 🎯 OVERVIEW SOLUSI

### Problem:
- ❌ Anggota warga tercampur di satu table tanpa pemisahan RT
- ❌ Ketua RT bisa melihat semua warga (seharusnya hanya RT-nya)
- ❌ Tidak ada field RT/RW untuk segregasi data

### Solution:
- ✅ Tambah field `rt_number` dan `rw_number` ke table users
- ✅ Implementasi RBAC (Role-Based Access Control) 
- ✅ Filter otomatis berdasarkan role ketua_rt
- ✅ Endpoint API khusus untuk residents management

---

## 🚀 LANGKAH IMPLEMENTASI

### **FASE 1: PERSIAPAN DATABASE** (30 menit)

#### 1.1 Backup Database (CRITICAL)
```bash
# Download backup dari Supabase dashboard
# Settings → Database → Backups → Download
```

#### 1.2 Buka Supabase SQL Editor
- Login ke [supabase.com](https://supabase.com)
- Pilih project Anda (RT Digital)
- Klik "SQL Editor" → "New Query"

#### 1.3 Jalankan Migration Script
```sql
-- Copy semua isi file: MIGRATION_SEGREGASI_ANGGOTA_RT.sql
-- Paste di SQL Editor → Run
```

**Yang dilakukan:**
```sql
-- 1. Tambah kolom
ALTER TABLE users ADD COLUMN IF NOT EXISTS rt_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rw_number TEXT;

-- 2. Buat index untuk performa
CREATE INDEX IF NOT EXISTS idx_users_rt_number ON users(rt_number);
```

#### 1.4 Validasi Database
```sql
-- Jalankan query untuk cek
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN rt_number IS NOT NULL THEN 1 END) as users_dengan_rt
FROM users;
```

✅ Harusnya menunjukkan table berhasil di-update

---

### **FASE 2: IMPLEMENTASI BACKEND** (1 jam)

#### 2.1 Buat File Baru: Access Control Helper

**File:** `src/lib/access-control.ts` 
- ✅ Sudah dibuat di langkah sebelumnya
- Contains: `canAccessRT()`, `canEditResident()`, `canDeleteResident()`
- Usage: Untuk validasi permission di setiap API endpoint

#### 2.2 Buat File Baru: Residents API Endpoint

**File:** `src/app/api/residents/route.ts`
- ✅ Sudah dibuat di langkah sebelumnya
- Implements:
  - **GET** `/api/residents?rt_number=002` → Ambil warga per RT
  - **POST** `/api/residents` → Tambah warga baru
  - **PUT** `/api/residents/[id]` → Update warga
  - **DELETE** `/api/residents/[id]` → Hapus warga

**Key Features:**
```typescript
// Filter otomatis untuk ketua_rt
if (currentUserRole === 'ketua_rt' && currentUserRt) {
  query = query.eq('rt_number', currentUserRt)  // ← Hanya RT-nya
}

// Validasi edit
if (currentUserRole === 'ketua_rt' && rtNumber !== currentUserRt) {
  return 403 // Forbidden - tidak boleh ubah RT
}
```

#### 2.3 Update File: Users API
**File:** `src/app/api/users/route.ts`

Add ke response:
```typescript
// Tambahkan kolom ini ke SELECT
.select('id, username, nama_lengkap, role, rumah_id, rt_number, rw_number, created_at')

// Tambahkan ke mapping response
rtNumber: u.rt_number,
rwNumber: u.rw_number,
```

---

### **FASE 3: IMPLEMENTASI FRONTEND** (1 jam)

#### 3.1 Buat Hook untuk Manage Residents
**File:** `src/hooks/use-residents.ts`
- ✅ Sudah dibuat
- Implements:
  - `useResidents()` → Hook utama untuk CRUD residents
  - `useResidentFilter()` → Hook untuk filtering/search

**Usage di Component:**
```typescript
import { useResidents } from '@/hooks/use-residents'

export function ResidentsPage() {
  const { residents, loading, error } = useResidents({
    organizationId: 'org-id',
    currentUserRole: currentUser.role,
    currentUserRt: currentUser.rtNumber, // Auto-filter jika ketua_rt
  })
  
  return (
    <div>
      {residents.map(r => (
        <div key={r.id}>{r.namaLengkap} - {r.rtNumber}</div>
      ))}
    </div>
  )
}
```

#### 3.2 Update Component: Tampilkan Filter RT
Lokasi: `src/components/rt/` atau folder components lainnya

**Changes:**
```typescript
// Sebelum
<button onClick={() => fetchUsers()}>Lihat Semua</button>

// Sesudah
<select onChange={(e) => {
  if (currentUser.role === 'ketua_rt') {
    // Auto-set ke RT ketua_rt, tidak bisa ubah
    setSelectedRT(currentUser.rtNumber)
  } else if (currentUser.role === 'admin') {
    // Admin bisa pilih RT
    setSelectedRT(e.target.value)
  }
}}>
  <option value={currentUser.rtNumber}>
    RT {currentUser.rtNumber}
  </option>
</select>
```

#### 3.3 Update Component: Create User Form
**Validation baru:**
```typescript
// Ketika form untuk tambah warga
if (currentUser.role === 'ketua_rt') {
  // Set RT otomatis, disabled
  rtNumberField.value = currentUser.rtNumber
  rtNumberField.disabled = true
  
  // Prevent submit jika coba ubah RT
  if (formData.rtNumber !== currentUser.rtNumber) {
    showError("Anda hanya bisa tambah warga untuk RT Anda sendiri")
    return
  }
}
```

---

### **FASE 4: TESTING & VALIDATION** (1 jam)

#### 4.1 Test Access Control

**Test Case 1: Ketua RT melihat warga**
```
User: ketua_rt (RT 002)
Request: GET /api/residents?rt_number=002
Expected: ✅ Return warga RT 002
```

```
User: ketua_rt (RT 002)
Request: GET /api/residents?rt_number=003
Expected: ❌ 403 Forbidden
Error: "Anda tidak memiliki akses untuk melihat warga RT lain"
```

**Test Case 2: Admin melihat warga**
```
User: admin
Request: GET /api/residents?rt_number=002
Expected: ✅ Return semua warga RT 002 (no filter)
```

**Test Case 3: Ketua RT tambah warga**
```
User: ketua_rt (RT 002)
Body: { rtNumber: "002", ... }
Expected: ✅ Created
```

```
User: ketua_rt (RT 002)
Body: { rtNumber: "003", ... }
Expected: ❌ 403 Forbidden
Error: "Ketua RT hanya dapat tambah warga untuk RT-nya"
```

#### 4.2 Test Database Constraints

```sql
-- Jalankan query validation
SELECT rt_number, COUNT(*) FROM users WHERE role = 'ketua_rt'
GROUP BY rt_number HAVING COUNT(*) > 1;

-- Harusnya: 0 rows (tidak ada duplikat ketua_rt)
```

#### 4.3 Test Performance

```sql
-- Cek query plan
EXPLAIN ANALYZE
SELECT * FROM users 
WHERE rt_number = '002' 
  AND organization_id = 'xxx'
ORDER BY nama_lengkap;

-- Harusnya gunakan index: idx_users_rt_org
```

---

### **FASE 5: DATA MIGRATION** (30 menit - sesuai data lama)

#### 5.1 Identify Missing RT Data

```sql
-- Cek user tanpa RT
SELECT id, username, nama_lengkap, rumah_id FROM users
WHERE rt_number IS NULL AND role IN ('warga', 'ketua_rt');
```

#### 5.2 Populate RT Data (Choose One)

**Option A: Auto-populate dari house blok**
```sql
UPDATE users 
SET rt_number = h.blok
FROM houses h 
WHERE users.rumah_id = h.id 
  AND users.rt_number IS NULL;
```

**Option B: Manual via UI**
- Create page: "Data Migration"
- List users tanpa RT
- Form untuk set RT
- Bulk update

**Option C: Import CSV**
```csv
user_id,rt_number,rw_number
user-123,002,013
user-456,003,013
```

#### 5.3 Verify Migration

```sql
-- Cek semua user sudah punya RT
SELECT COUNT(*) FROM users 
WHERE rt_number IS NULL 
  AND role IN ('warga', 'ketua_rt');

-- Harusnya: 0
```

---

### **FASE 6: DOCUMENTATION & DEPLOYMENT** (30 menit)

#### 6.1 Update API Documentation
**File:** `README.md` atau `API_DOCS.md`

```markdown
## Residents API

### GET /api/residents
Filter warga berdasarkan RT

**Query Parameters:**
- `rt_number` (required): Nomor RT
- `rw_number` (optional): Nomor RW
- `organization_id` (required): ID organisasi
- `currentUserRole`: Role user (auto-filter)
- `currentUserRt`: RT user (untuk validasi)

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "user-123",
      "namaLengkap": "John Doe",
      "role": "warga",
      "rtNumber": "002"
    }
  ]
}
```

**Permissions:**
- `admin`: Lihat semua RT
- `ketua_rt`: Hanya RT-nya sendiri
- `warga`: Error (tidak boleh akses endpoint ini)
```

#### 6.2 Create User Documentation
**File:** `DOKUMENTASI_USERS.md`

```markdown
## Panduan Ketua RT

### Melihat Warga RT Anda
1. Login sebagai Ketua RT
2. Buka menu "Data Warga"
3. Sistem otomatis menampilkan warga RT Anda saja

### Menambah Warga Baru
1. Klik "Tambah Warga"
2. Isi form:
   - Nama Lengkap
   - Username (unique)
   - Password
   - RT: Otomatis terisi RT Anda (tidak bisa ubah)
3. Klik "Simpan"

### Membatasan:
- ❌ Tidak bisa lihat warga RT lain
- ❌ Tidak bisa pindahkan warga ke RT lain
- ❌ Tidak bisa menghapus ketua_rt lain
```

#### 6.3 Push ke Production

**Checklist:**
- [ ] Database migration selesai
- [ ] Backend code deployed
- [ ] Frontend components updated
- [ ] Testing passed
- [ ] Data migration completed
- [ ] Documentation updated
- [ ] Ketua RT sudah punya RT assignment

**Deployment Command:**
```bash
# Commit changes
git add -A
git commit -m "feat: implement residents segregation per RT"

# Push ke repository
git push origin main

# Vercel auto-deploy atau manual:
# npm run build && npm start
```

---

## ✅ VERIFICATION CHECKLIST

Setelah implementasi, pastikan:

- [ ] Database columns sudah ada: `rt_number`, `rw_number`
- [ ] API endpoint `/api/residents` berfungsi
- [ ] Query GET `/api/residents?rt_number=002` return warga RT 002 saja
- [ ] Ketua RT tidak bisa query RT lain (403 error)
- [ ] Form create user auto-set RT jika ketua_rt
- [ ] Database indexes sudah ada: `idx_users_rt_org`
- [ ] All users sudah assigned RT
- [ ] Zero duplikat ketua_rt dalam satu RT
- [ ] Testing seluruh test cases passed
- [ ] Documentation updated

---

## 🆘 TROUBLESHOOTING

### Q: Setelah migration, ketua_rt masih bisa lihat semua warga?
**A:** 
1. Check apakah kolom `rt_number` sudah di-populate
2. Jalankan: `UPDATE users SET rt_number = '002' WHERE role = 'ketua_rt' AND rt_number IS NULL`
3. Clear browser cache & reload

### Q: Error "403 Forbidden" ketika ketua_rt melihat data?
**A:** 
1. Cek parameter `currentUserRt` dikirim dengan benar
2. Cek database: `SELECT rt_number FROM users WHERE id = 'ketua_rt_id'`
3. Jika NULL, set: `UPDATE users SET rt_number = '002' WHERE id = 'ketua_rt_id'`

### Q: Query slow saat ambil warga RT?
**A:**
1. Check index ada: `SELECT * FROM pg_indexes WHERE tablename = 'users'`
2. Jalankan: `REINDEX TABLE users`
3. Check query plan: `EXPLAIN ANALYZE SELECT ...`

### Q: Duplikat ketua_rt di RT yang sama
**A:**
1. Find duplicates: `SELECT rt_number FROM users WHERE role = 'ketua_rt' GROUP BY rt_number HAVING COUNT(*) > 1`
2. Delete duplikat atau ubah role ke 'warga'
3. Add constraint: Gunakan RLS policy atau trigger

---

## 📞 NEXT STEPS

1. **Implementasi RLS** (Optional tapi recommended)
   - File: `MIGRATION_SEGREGASI_ANGGOTA_RT.sql` → STEP 5
   - Enforce segregasi di database level

2. **Audit Log**
   - Track siapa akses data apa dan kapan
   - Untuk compliance & security

3. **Notification System**
   - Alert ketua_rt ketika ada warga baru
   - Alert admin ketika ada unusual access

4. **Dashboard Analytics**
   - Statistik warga per RT
   - Tracking iuran per RT
   - Performance metrics

---

**Last Updated:** April 2026
**Status:** Ready for Implementation
**Estimated Duration:** 2-3 jam
