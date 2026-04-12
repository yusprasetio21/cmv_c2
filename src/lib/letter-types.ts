export interface LetterField {
  field: string
  label: string
  type: 'text' | 'date' | 'select' | 'textarea' | 'number'
  options?: string[]
  required: boolean
  rows?: number
}

export interface LetterType {
  id: string
  name: string
  icon: string
  color: string
}

export const LETTER_TYPES: LetterType[] = [
  { id: 'domisili', name: 'Domisili', icon: '🏠', color: 'blue' },
  { id: 'nikah', name: 'Nikah', icon: '💒', color: 'pink' },
  { id: 'sekolah', name: 'Sekolah', icon: '📚', color: 'emerald' },
  { id: 'beasiswa', name: 'Beasiswa', icon: '🎓', color: 'amber' },
  { id: 'kepolisian', name: 'SKCK', icon: '🛡️', color: 'violet' },
  { id: 'mutasi', name: 'Mutasi', icon: '🔄', color: 'cyan' },
]

export const LETTER_FIELDS: Record<string, LetterField[]> = {
  domisili: [
    { field: 'namaLengkap', label: 'Nama Lengkap', type: 'text', required: true },
    { field: 'tempatLahir', label: 'Tempat Lahir', type: 'text', required: true },
    { field: 'tanggalLahir', label: 'Tanggal Lahir', type: 'date', required: true },
    { field: 'jenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'], required: true },
    { field: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: true },
    { field: 'agama', label: 'Agama', type: 'select', options: ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'], required: true },
    { field: 'statusPerkawinan', label: 'Status Perkawinan', type: 'select', options: ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'], required: true },
    { field: 'kewarganegaraan', label: 'Kewarganegaraan', type: 'text', required: true },
    { field: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, rows: 3 },
  ],
  nikah: [
    { field: 'namaLengkap', label: 'Nama Lengkap', type: 'text', required: true },
    { field: 'tempatLahir', label: 'Tempat Lahir', type: 'text', required: true },
    { field: 'tanggalLahir', label: 'Tanggal Lahir', type: 'date', required: true },
    { field: 'jenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'], required: true },
    { field: 'agama', label: 'Agama', type: 'select', options: ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha'], required: true },
    { field: 'statusPerkawinan', label: 'Status Perkawinan', type: 'select', options: ['Belum Pernah Kawin', 'Janda', 'Duda'], required: true },
    { field: 'namaCalon', label: 'Nama Calon Pasangan', type: 'text', required: true },
    { field: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, rows: 3 },
  ],
  sekolah: [
    { field: 'namaLengkap', label: 'Nama Siswa', type: 'text', required: true },
    { field: 'tempatLahir', label: 'Tempat Lahir', type: 'text', required: true },
    { field: 'tanggalLahir', label: 'Tanggal Lahir', type: 'date', required: true },
    { field: 'jenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'], required: true },
    { field: 'agama', label: 'Agama', type: 'select', options: ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha'], required: true },
    { field: 'namaOrangTua', label: 'Nama Orang Tua/Wali', type: 'text', required: true },
    { field: 'namaSekolah', label: 'Nama Sekolah Tujuan', type: 'text', required: true },
    { field: 'kelas', label: 'Kelas yang Dilamar', type: 'text', required: true },
    { field: 'keperluan', label: 'Catatan Tambahan', type: 'textarea', required: false, rows: 2 },
  ],
  beasiswa: [
    { field: 'namaLengkap', label: 'Nama Lengkap', type: 'text', required: true },
    { field: 'tempatLahir', label: 'Tempat Lahir', type: 'text', required: true },
    { field: 'tanggalLahir', label: 'Tanggal Lahir', type: 'date', required: true },
    { field: 'jenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'], required: true },
    { field: 'pendidikanTerakhir', label: 'Pendidikan Terakhir', type: 'text', required: true },
    { field: 'institusi', label: 'Nama Institusi', type: 'text', required: true },
    { field: 'programBeasiswa', label: 'Program Beasiswa', type: 'text', required: true },
    { field: 'keperluan', label: 'Alasan Permohonan', type: 'textarea', required: true, rows: 3 },
  ],
  kepolisian: [
    { field: 'namaLengkap', label: 'Nama Lengkap', type: 'text', required: true },
    { field: 'tempatLahir', label: 'Tempat Lahir', type: 'text', required: true },
    { field: 'tanggalLahir', label: 'Tanggal Lahir', type: 'date', required: true },
    { field: 'jenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'], required: true },
    { field: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: true },
    { field: 'agama', label: 'Agama', type: 'select', options: ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha'], required: true },
    { field: 'statusPerkawinan', label: 'Status Perkawinan', type: 'select', options: ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'], required: true },
    { field: 'keperluan', label: 'Keperluan SKCK', type: 'textarea', required: true, rows: 3 },
  ],
  mutasi: [
    { field: 'namaKK', label: 'Nama Kepala Keluarga', type: 'text', required: true },
    { field: 'jumlahAnggota', label: 'Jumlah Anggota', type: 'number', required: true },
    { field: 'alamatAsal', label: 'Alamat Asal (Lengkap)', type: 'textarea', required: true, rows: 2 },
    { field: 'rtAsal', label: 'RT Asal', type: 'text', required: true },
    { field: 'rwAsal', label: 'RW Asal', type: 'text', required: true },
    { field: 'alamatTujuan', label: 'Alamat Tujuan', type: 'textarea', required: true, rows: 2 },
    { field: 'alasanMutasi', label: 'Alasan Mutasi', type: 'textarea', required: true, rows: 3 },
  ],
}
