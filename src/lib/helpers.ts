export function formatCurrency(n: number): string {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(n).replace(/,/g, '.')
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateLong(d: string | null | undefined): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function getMonthName(m: number): string {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return months[(m - 1)] || '-'
}

export function getRomanMonth(m: number): string {
  const r = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  return r[(m - 1)] || '-'
}

export function calculateAge(dob: string | null | undefined): string {
  if (!dob) return '-'
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)).toString()
}

export function truncateText(text: string, len: number): string {
  return text && text.length > len ? text.substring(0, len) + '...' : text || ''
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'approved': return 'bg-emerald-100 text-emerald-700'
    case 'rejected': return 'bg-red-100 text-red-700'
    default: return 'bg-amber-100 text-amber-700'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'approved': return 'Disetujui'
    case 'rejected': return 'Ditolak'
    default: return 'Pending'
  }
}
