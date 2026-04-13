# 🚀 QUICK START GUIDE - SEGREGASI ANGGOTA WARGA PER RT

**Estimasi waktu:** 30-40 menit untuk quick setup

---

## ⚡ TL;DR (The Essentials)

Jika Anda ingin langsung implementasi tanpa baca dokumentasi panjang:

### **Langkah 1: Database (5 menit)**
```bash
# 1. Buka Supabase Dashboard
# 2. SQL Editor → New Query
# 3. Copy & Paste dari: MIGRATION_SEGREGASI_ANGGOTA_RT.sql
# 4. Run
```

### **Langkah 2: Backend (10 menit)**
```bash
# 1. Copy file: src/app/api/residents/route.ts (dari hasil generate)
# 2. Copy file: src/lib/access-control.ts (dari hasil generate)
# 3. Deploy atau test locally
```

### **Langkah 3: Frontend (10 menit)**
```bash
# 1. Copy file: src/hooks/use-residents.ts
# 2. Copy file: src/components/rt/ResidentsManagementPage.tsx
# 3. Import & gunakan di page Anda
```

### **Langkah 4: Test (10 menit)**
```bash
# 1. Test GET /api/residents?rt_number=002
# 2. Test POST tambah warga
# 3. Test delete warga
```

---

## 📂 FILES LOCATION

Semua file sudah dibuat di workspace Anda. Lokasinya:

```
✅ DOKUMENTASI (Read):
   ├── PENJELASAN_SEGREGASI_ANGGOTA_RT.md
   ├── IMPLEMENTASI_STEP_BY_STEP.md
   ├── RINGKASAN_SOLUSI.md
   └── QUICK_START_GUIDE.md (file ini)

✅ DATABASE:
   └── MIGRATION_SEGREGASI_ANGGOTA_RT.sql

✅ BACKEND CODE:
   ├── src/app/api/residents/route.ts (NEW)
   ├── src/lib/access-control.ts (NEW)
   └── src/app/api/users/route.ts (MODIFY - optional)

✅ FRONTEND CODE:
   ├── src/hooks/use-residents.ts (NEW)
   └── src/components/rt/ResidentsManagementPage.tsx (NEW)
```

---

## 🎬 START HERE: 5-STEP QUICK START

### **STEP 1️⃣: Setup Database (Supabase)**

Open Supabase SQL Editor:
```sql
-- Copy dari MIGRATION_SEGREGASI_ANGGOTA_RT.sql
-- Paste di SQL Editor → RUN

-- Hasil: Tambah kolom rt_number, rw_number ke users table
```

**Verify:**
```sql
-- Jalankan query ini untuk cek
SELECT column_name FROM information_schema.columns 
WHERE table_name='users' AND column_name IN ('rt_number', 'rw_number');

-- Expected: 2 rows ✅
```

---

### **STEP 2️⃣: Setup Backend API**

Copy 2 file ke project Anda:

1. **`src/app/api/residents/route.ts`** (dibuat sudah)
2. **`src/lib/access-control.ts`** (dibuat sudah)

**Test API:**
```bash
# Terminal
curl "http://localhost:3000/api/residents?rt_number=002&organization_id=org-id&currentUserRole=admin&currentUserRt="

# Expected: JSON array with residents ✅
```

---

### **STEP 3️⃣: Setup Frontend Components**

Copy 2 file ke project Anda:

1. **`src/hooks/use-residents.ts`** (dibuat sudah)
2. **`src/components/rt/ResidentsManagementPage.tsx`** (dibuat sudah)

**Integrate ke page Anda:**
```typescript
import { ResidentsManagementPage } from '@/components/rt/ResidentsManagementPage'

export default function ResidentsPage() {
  const currentUser = {
    id: 'user-123',
    role: 'ketua_rt',
    rtNumber: '002',
    rwNumber: '013',
    organizationId: 'org-123'
  }

  return <ResidentsManagementPage currentUser={currentUser} />
}
```

---

### **STEP 4️⃣: Setup Data (Populate RT)**

Jika ada existing users tanpa rt_number:

```sql
-- SQL di Supabase → Run

-- Option A: Auto-populate dari house blok
UPDATE users 
SET rt_number = h.blok
FROM houses h 
WHERE users.rumah_id = h.id 
  AND users.rt_number IS NULL;

-- Option B: Manual set (jika tahu RT-nya)
UPDATE users SET rt_number = '002' WHERE username = 'ketua_rt_1';
UPDATE users SET rt_number = '003' WHERE username = 'ketua_rt_2';
```

**Verify:**
```sql
SELECT COUNT(*) FROM users 
WHERE rt_number IS NULL AND role IN ('warga', 'ketua_rt');

-- Expected: 0 (semua user sudah punya RT) ✅
```

---

### **STEP 5️⃣: Test & Validate**

**Test 1: API Filter**
```bash
# Ketua RT RT 002 query RT 002 (should work)
GET /api/residents?rt_number=002&currentUserRole=ketua_rt&currentUserRt=002
Expected: ✅ 200 OK

# Ketua RT RT 002 query RT 003 (should fail)
GET /api/residents?rt_number=003&currentUserRole=ketua_rt&currentUserRt=002
Expected: ❌ 403 Forbidden
```

**Test 2: UI Behavior**
- [ ] Ketua RT login → lihat warga RT-nya saja
- [ ] Admin login → bisa lihat semua RT
- [ ] Ketua RT tidak bisa ubah RT di form
- [ ] Tambah warga → otomatis set ke RT-nya

---

## 🔍 COMMON USE CASES

### **Use Case 1: Ketua RT Lihat Warga-nya**

```typescript
// Component
function MyResidentsPage() {
  const currentUser = useCurrentUser() // { role: 'ketua_rt', rtNumber: '002' }
  
  const { residents } = useResidents({
    organizationId: currentUser.organizationId,
    currentUserRole: currentUser.role,
    currentUserRt: currentUser.rtNumber,
    // rtNumber NOT provided → auto-use ketua_rt's RT
  })
  
  return <ResidentsList residents={residents} />
}
```

**Result:** ✅ Ketua RT RT 002 lihat warga RT 002 saja

---

### **Use Case 2: Admin Lihat Warga RT Tertentu**

```typescript
// Component
function AdminResidentsView({ rtNumber }) {
  const currentUser = { role: 'admin' }
  
  const { residents } = useResidents({
    organizationId: 'org-123',
    currentUserRole: 'admin',
    currentUserRt: undefined, // admin tidak ada RT
    rtNumber: rtNumber, // admin choose RT to view
  })
  
  return <ResidentsList residents={residents} />
}
```

**Result:** ✅ Admin lihat RT mana saja

---

### **Use Case 3: Tambah Warga Baru**

```typescript
const handleAddResident = async (data) => {
  // Validasi: ketua_rt hanya bisa ke RT-nya
  if (currentUser.role === 'ketua_rt' && data.rtNumber !== currentUser.rtNumber) {
    alert('Anda hanya bisa tambah warga untuk RT Anda sendiri')
    return
  }
  
  // Add resident via API
  const response = await fetch('/api/residents', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      organizationId: currentUser.organizationId
    })
  })
  
  // Result: ✅ Warga ditambahkan ke RT yang benar
}
```

---

## 🛠️ TROUBLESHOOTING

### ❓ Q: Ketua RT masih bisa lihat semua warga?
**A:** 
1. Check database: `SELECT rt_number FROM users WHERE id = 'ketua_rt_id'`
2. Jika NULL, update: `UPDATE users SET rt_number = '002' WHERE ...`
3. Clear browser cache & reload

### ❓ Q: API return 403 error untuk ketua_rt?
**A:**
1. Check parameters dikirim:
   - `currentUserRole=ketua_rt`
   - `currentUserRt=002` (must match user's RT)
2. Check user di DB sudah punya RT

### ❓ Q: Form tidak auto-set RT untuk ketua_rt?
**A:**
1. Check komponennya pass `currentUser.rtNumber`
2. Check form field punya `disabled={currentUser.role === 'ketua_rt'}`

### ❓ Q: Bagaimana rollback jika ada masalah?
**A:**
```sql
-- Rollback: Drop kolom rt_number & rw_number
ALTER TABLE users DROP COLUMN rt_number;
ALTER TABLE users DROP COLUMN rw_number;

-- Or: Reset data
UPDATE users SET rt_number = NULL, rw_number = NULL;
```

---

## 📊 VALIDATION CHECKLIST

Sebelum consider done, pastikan:

- [ ] Database column `rt_number` exist
- [ ] Database column `rw_number` exist
- [ ] Index `idx_users_rt_org` exist
- [ ] API endpoint `/api/residents` callable
- [ ] Ketua RT tidak bisa query RT lain (403)
- [ ] Admin bisa query semua RT
- [ ] Form tambah warga work
- [ ] Delete warga work
- [ ] All users assigned RT (no NULL rt_number)
- [ ] No duplicate ketua_rt in same RT

---

## 🚀 PRODUCTION DEPLOYMENT

Ketika ready untuk production:

```bash
# 1. Backup database (CRITICAL!)
# Supabase Dashboard → Settings → Database → Backups → Download

# 2. Test semua di staging dulu
npm run build
npm run start

# 3. Monitor log setelah deploy
# Cek error log, akses log, dll

# 4. Validate data di production
# Run SQL validation queries

# 5. Communicate dengan users (Ketua RT)
# Explain perubahan, training, FAQ
```

---

## 💡 TIPS & TRICKS

**Tip 1: Debug Mode**
```typescript
// Di component, console log current state
console.log({
  currentUser,
  selectedRT,
  residents,
  loading,
  error
})
```

**Tip 2: Test dengan Different Users**
- Buka 2 browser tabs
- Tab 1: Login sebagai ketua_rt
- Tab 2: Login sebagai admin
- Compare behavior

**Tip 3: Database Query untuk Debug**
```sql
-- Cek warga yang mana punya issue
SELECT id, username, rt_number, role FROM users
WHERE organization_id = 'org-123'
ORDER BY rt_number, username;
```

**Tip 4: API Call Debugging**
```bash
# Coba pakai curl untuk test raw API
curl -X GET "http://localhost:3000/api/residents?rt_number=002&organization_id=org-123&currentUserRole=ketua_rt&currentUserRt=002"

# Format response
curl ... | jq .
```

---

## 📚 NEXT LEVEL (Optional)

Setelah basic implementation, bisa tambah:

1. **RLS (Row Level Security)** di Supabase
   - Enforce segregasi di database level
   - Lihat: MIGRATION_SEGREGASI_ANGGOTA_RT.sql → STEP 5

2. **Audit Log**
   - Track semua access & changes
   - Create table: `audit_logs`

3. **Notification System**
   - Alert ketua_rt ketika ada warga baru
   - Use Supabase Realtime

4. **Bulk Operations**
   - Import warga via CSV
   - Bulk assign RT

---

## 📞 QUICK LINKS

- 📖 **Full Documentation:** PENJELASAN_SEGREGASI_ANGGOTA_RT.md
- 🔧 **Implementation Guide:** IMPLEMENTASI_STEP_BY_STEP.md
- 📊 **Summary:** RINGKASAN_SOLUSI.md
- 🗄️ **Database Script:** MIGRATION_SEGREGASI_ANGGOTA_RT.sql
- 💻 **Code Files:**
  - `src/app/api/residents/route.ts`
  - `src/lib/access-control.ts`
  - `src/hooks/use-residents.ts`
  - `src/components/rt/ResidentsManagementPage.tsx`

---

## ✅ SUCCESS CRITERIA

Implementasi dianggap **SUCCESS** ketika:

1. ✅ Ketua RT RT 002 tidak bisa lihat warga RT 003
2. ✅ Admin bisa lihat semua RT
3. ✅ API endpoint `/api/residents` return data yang benar
4. ✅ Form create warga bekerja
5. ✅ All users sudah assign RT
6. ✅ No errors di console/logs
7. ✅ Database queries fast (< 100ms)

---

**Ready to implement? Start with STEP 1 above! 🚀**

**Need help? Check TROUBLESHOOTING section atau read full docs.**

---

*Last Updated: April 2026*
*Version: 1.0 Final*
