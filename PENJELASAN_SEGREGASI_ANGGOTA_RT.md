# Penjelasan: Segregasi Anggota Warga Berdasarkan RT

## ❌ Masalah Saat Ini

Berdasarkan analisis kode Anda, saat ini:

1. **Anggota warga tercampur dalam satu table `users`** tanpa pemisahan berdasarkan RT
2. **Ketua RT tidak memiliki filter RT** - mereka dapat melihat semua warga di sistem
3. **Tidak ada field `rt_id` atau `rw_id`** di table users untuk menentukan RT/RW mereka
4. **Query API tidak memfilter berdasarkan RT** - GET `/api/users` mengembalikan semua users tanpa pembatasan

### Struktur Saat Ini:
```
users table:
├── id
├── username
├── nama_lengkap
├── role (admin, ketua_rt, warga)
├── rumah_id (link ke houses)
├── organization_id (untuk multi-tenant)
└── ... (tanpa rt_id, rw_id)

houses table:
├── id
├── nomor_rumah
├── blok
├── status_rumah
├── organization_id
└── ... (tanpa explicit rt_id)
```

---

## ✅ Solusi: Segregasi Anggota Per RT

### **Langkah 1: Tambahkan Field RT/RW ke Table Users**

Di Supabase SQL:
```sql
-- Tambahkan kolom RT dan RW ke users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS rt_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rw_number TEXT;

-- Tambahkan index untuk performa query
CREATE INDEX IF NOT EXISTS idx_users_rt ON users(rt_number, organization_id);
CREATE INDEX IF NOT EXISTS idx_users_rw ON users(rw_number, organization_id);
```

**Penjelasan:**
- `rt_number`: Menyimpan nomor RT (contoh: '002', '003')
- `rw_number`: Menyimpan nomor RW (contoh: '013')
- Index membantu query cepat saat filter berdasarkan RT

### **Langkah 2: Ubah API Users untuk Filter per RT**

**File:** `src/app/api/users/route.ts`

**Ubah GET request untuk menambahkan filter RT:**

```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const rtNumber = searchParams.get('rt_number') // ← TAMBAHKAN
    const rwNumber = searchParams.get('rw_number') // ← TAMBAHKAN
    const currentUserRole = searchParams.get('currentUserRole') // ← TAMBAHKAN
    const currentUserRt = searchParams.get('currentUserRt') // ← TAMBAHKAN

    let query = supabase
      .from('users')
      .select('id, username, nama_lengkap, role, rumah_id, rt_number, rw_number, created_at') // ← TAMBAHKAN rt_number, rw_number
      .order('created_at', { ascending: false })

    // Jika user adalah KETUA_RT, hanya tampilkan anggota RT-nya
    if (currentUserRole === 'ketua_rt' && currentUserRt) {
      query = query.eq('rt_number', currentUserRt)
    }

    // Filter tambahan
    if (role) {
      query = query.eq('role', role)
    }

    if (rtNumber) {
      query = query.eq('rt_number', rtNumber)
    }

    if (rwNumber) {
      query = query.eq('rw_number', rwNumber)
    }

    if (search) {
      query = query.or(`nama_lengkap.ilike.%${search}%,username.ilike.%${search}%`)
    }

    const { data: users, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ... rest of the code
    
    const result = users.map((u: any) => ({
      id: u.id,
      username: u.username,
      namaLengkap: u.nama_lengkap,
      role: u.role,
      rumahId: u.rumah_id,
      rtNumber: u.rt_number,     // ← TAMBAHKAN
      rwNumber: u.rw_number,     // ← TAMBAHKAN
      house: u.rumah_id ? houseMap.get(u.rumah_id) || null : null,
      createdAt: u.created_at,
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
```

### **Langkah 3: Ubah POST Users untuk Set RT/RW Otomatis**

**File:** `src/app/api/users/route.ts` (bagian POST)

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      username, 
      password, 
      nama_lengkap, 
      namaLengkap, 
      role, 
      rumah_id, 
      rumahId,
      rt_number,  // ← TAMBAHKAN
      rw_number   // ← TAMBAHKAN
    } = body

    const nama = namaLengkap || nama_lengkap
    const houseId = rumahId || rumah_id

    if (!username || !password || !nama || !role) {
      return NextResponse.json({ error: 'Username, password, nama lengkap, dan role wajib diisi' }, { status: 400 })
    }

    // Validasi: Ketua RT wajib memiliki rt_number
    if (role === 'ketua_rt' && !rt_number) {
      return NextResponse.json({ error: 'Ketua RT harus memiliki nomor RT' }, { status: 400 })
    }

    // ... existing checks ...

    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password,
        nama_lengkap: nama,
        role,
        rumah_id: houseId || null,
        rt_number: rt_number || null,  // ← TAMBAHKAN
        rw_number: rw_number || null,  // ← TAMBAHKAN
      })
      .select('id, username, nama_lengkap, role, rumah_id, rt_number, rw_number, created_at')
      .single()

    // ... rest of code
  }
}
```

### **Langkah 4: Tambahkan Endpoint Khusus untuk Filter Warga Berdasarkan RT**

**File baru:** `src/app/api/residents/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rtNumber = searchParams.get('rt_number')
    const organizationId = searchParams.get('organization_id')

    if (!rtNumber) {
      return NextResponse.json({ error: 'rt_number diperlukan' }, { status: 400 })
    }

    let query = supabase
      .from('users')
      .select(`
        id,
        username,
        nama_lengkap,
        role,
        rt_number,
        rw_number,
        rumah_id,
        families!left(
          id,
          nama_kk,
          members
        )
      `)
      .eq('rt_number', rtNumber)
      .eq('organization_id', organizationId)
      .order('nama_lengkap', { ascending: true })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
```

### **Langkah 5: Implementasi Role-Based Access Control (RBAC)**

**File:** `src/app/api/middleware.ts` atau `src/lib/auth-helpers.ts` (buat jika belum ada)

```typescript
// Helper untuk validasi akses berdasarkan RT
export const canAccessRT = (
  userRole: string,
  userRT: string | null,
  targetRT: string,
  userOrganization: string,
  targetOrganization: string
): boolean => {
  // Admin dan RW Manager dapat akses semua
  if (userRole === 'admin' || userRole === 'rw_manager') {
    return userOrganization === targetOrganization
  }

  // Ketua RT hanya dapat akses RT-nya sendiri
  if (userRole === 'ketua_rt') {
    return userRT === targetRT && userOrganization === targetOrganization
  }

  // Warga tidak dapat akses data RT lain
  if (userRole === 'warga') {
    return userRT === targetRT
  }

  return false
}
```

### **Langkah 6: Update Component untuk Menampilkan Filter RT**

**File:** `src/components/rt/ResidentsPage.tsx` (contoh)

```typescript
// Ketika user adalah ketua_rt, auto-filter warganya
useEffect(() => {
  const fetchResidents = async () => {
    // Jika user adalah ketua_rt, hanya ambil warga RT-nya
    const params = new URLSearchParams()
    
    if (currentUser?.role === 'ketua_rt') {
      params.append('rt_number', currentUser.rtNumber)
    }
    
    params.append('organization_id', organizationId)
    
    const response = await fetch(`/api/residents?${params}`)
    const data = await response.json()
    setResidents(data)
  }

  fetchResidents()
}, [currentUser, organizationId])
```

---

## 📊 Struktur Data Baru

### Setelah Implementasi:

```
users table (UPDATED):
├── id
├── username
├── nama_lengkap
├── role (admin, ketua_rt, rw_manager, warga)
├── rumah_id (link ke houses)
├── rt_number (002, 003, dll)  ← BARU
├── rw_number (013, dll)       ← BARU
├── organization_id
└── created_at

families table:
├── id
├── user_id (FK ke users)
├── nama_kk
├── members (JSON)
├── organization_id
└── ...
```

---

## 🔐 Matrix Akses Berdasarkan Role

| Role | Bisa Lihat | Bisa Edit | Catatan |
|------|-----------|----------|--------|
| **admin** | Semua RT | Semua | Full access |
| **rw_manager** | Semua RT dalam RW | Semua | Multi-RT di 1 RW |
| **ketua_rt** | Hanya RT-nya | Hanya RT-nya | **PEMBATASAN UTAMA** |
| **warga** | Hanya profile sendiri | Profile sendiri | Data pribadi saja |

---

## 🛠️ Checklist Implementasi

- [ ] **1. Database**: Tambahkan kolom `rt_number` dan `rw_number` ke users table
- [ ] **2. API Users**: Update GET/POST untuk filter dan set RT
- [ ] **3. API Residents**: Buat endpoint baru untuk query warga per RT
- [ ] **4. Auth Helper**: Buat fungsi `canAccessRT()` untuk validasi akses
- [ ] **5. Components**: Update UI untuk tampilin filter RT
- [ ] **6. Existing Data**: Migrate data lama ke set rt_number/rw_number
- [ ] **7. Testing**: Test akses ketua_rt vs admin
- [ ] **8. UI Validation**: Validasi di form ketua_rt tidak bisa keluar dari RT-nya

---

## ⚠️ Catatan Penting

1. **Migrasi Data Lama**: Jika sudah ada data users lama, perlu set rt_number/rw_number mereka terlebih dahulu
2. **RLS (Row Level Security)**: Untuk keamanan tambahan, aktifkan RLS di Supabase untuk enforce pembatasan ini
3. **Caching**: Jika menggunakan caching, invalidate saat ada perubahan RT/RW
4. **Audit Log**: Pertimbangkan log saat admin mengakses data RT yang bukan miliknya

---

## 📝 Contoh Query SQL untuk Validasi

```sql
-- Cek berapa banyak anggota per RT
SELECT 
  rt_number, 
  COUNT(*) as jumlah_anggota,
  COUNT(CASE WHEN role = 'ketua_rt' THEN 1 END) as jumlah_ketua_rt
FROM users
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
GROUP BY rt_number
ORDER BY rt_number;

-- Cek user yang belum punya RT (anomali)
SELECT id, username, nama_lengkap, role
FROM users
WHERE rt_number IS NULL 
  AND role IN ('warga', 'ketua_rt')
  AND organization_id = '00000000-0000-0000-0000-000000000001';
```

---

## 🎯 Manfaat Perubahan Ini

✅ **Segregasi Data**: Anggota RT terpisah dengan jelas
✅ **Privacy**: Ketua RT hanya lihat warganya, tidak bisa lihat RT lain
✅ **Scalability**: Bisa punya banyak RT di 1 organization
✅ **Security**: RBAC yang lebih ketat
✅ **Audit**: Mudah track siapa akses data apa

