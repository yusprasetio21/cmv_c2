/**
 * Helper functions untuk Role-Based Access Control (RBAC)
 * Mengontrol akses data berdasarkan role dan RT user
 */

export type UserRole = 'admin' | 'rw_manager' | 'ketua_rt' | 'warga' | 'guest'

export interface AccessControlParams {
  userRole: UserRole
  userRt: string | null
  userRw: string | null
  userOrganization: string
  targetRt: string
  targetRw: string
  targetOrganization: string
}

/**
 * Validasi apakah user dapat akses data RT tertentu
 * 
 * Rules:
 * - admin: dapat akses semua RT di organization-nya
 * - rw_manager: dapat akses semua RT dalam RW-nya
 * - ketua_rt: hanya dapat akses RT-nya sendiri
 * - warga: hanya dapat akses data pribadi
 * 
 * @param params Parameter akses kontrol
 * @returns true jika user berhak akses, false sebaliknya
 */
export const canAccessRT = (params: AccessControlParams): boolean => {
  const {
    userRole,
    userRt,
    userRw,
    userOrganization,
    targetRt,
    targetRw,
    targetOrganization,
  } = params

  // Organisasi harus sama
  if (userOrganization !== targetOrganization) {
    return false
  }

  switch (userRole) {
    case 'admin':
      // Admin dapat akses semua RT di organization-nya
      return true

    case 'rw_manager':
      // RW Manager dapat akses semua RT dalam RW-nya
      return userRw === targetRw

    case 'ketua_rt':
      // Ketua RT hanya dapat akses RT-nya sendiri
      return userRt === targetRt

    case 'warga':
      // Warga hanya dapat akses data pribadi (tidak digunakan di endpoint group)
      return false

    default:
      return false
  }
}

/**
 * Validasi apakah user dapat mengedit data warga tertentu
 * 
 * @param params Parameter akses kontrol
 * @returns true jika user berhak edit, false sebaliknya
 */
export const canEditResident = (params: AccessControlParams): boolean => {
  // Edit sama dengan read untuk pengecekan dasar
  return canAccessRT(params)
}

/**
 * Validasi apakah user dapat menghapus warga tertentu
 * 
 * Rules:
 * - admin: dapat hapus siapa saja di organization-nya
 * - rw_manager: dapat hapus warga di RW-nya
 * - ketua_rt: dapat hapus warga di RT-nya (kecuali ketua_rt lain)
 * - warga: tidak dapat hapus siapa saja
 * 
 * @param params Parameter akses kontrol
 * @param targetUserRole Role dari user yang akan dihapus
 * @returns true jika user berhak hapus, false sebaliknya
 */
export const canDeleteResident = (
  params: AccessControlParams,
  targetUserRole: UserRole
): boolean => {
  const {
    userRole,
    userRt,
    userRw,
    userOrganization,
    targetRt,
    targetRw,
    targetOrganization,
  } = params

  if (userOrganization !== targetOrganization) {
    return false
  }

  switch (userRole) {
    case 'admin':
      // Admin dapat hapus siapa saja kecuali admin lain
      return targetUserRole !== 'admin'

    case 'rw_manager':
      // RW Manager dapat hapus warga di RW-nya, tapi tidak ketua_rt
      return userRw === targetRw && targetUserRole !== 'ketua_rt'

    case 'ketua_rt':
      // Ketua RT dapat hapus warga biasa di RT-nya, tapi tidak ketua_rt lain
      return (
        userRt === targetRt &&
        targetUserRole !== 'ketua_rt' &&
        targetUserRole !== 'admin'
      )

    default:
      return false
  }
}

/**
 * Build filter query untuk SQL berdasarkan role user
 * Digunakan untuk auto-filter ketika mengquery data
 * 
 * Contoh return:
 * { eq: { rt_number: '002' }, organization_id: 'org-id' }
 */
export const buildAccessFilter = (
  userRole: UserRole,
  userRt: string | null,
  userRw: string | null,
  organizationId: string
) => {
  return {
    organization_id: organizationId,
    ...(userRole === 'ketua_rt' && userRt ? { rt_number: userRt } : {}),
    ...(userRole === 'rw_manager' && userRw ? { rw_number: userRw } : {}),
  }
}

/**
 * Format pesan error berdasarkan akses yang ditolak
 */
export const getAccessDeniedMessage = (
  userRole: UserRole,
  action: 'read' | 'edit' | 'delete' = 'read'
): string => {
  const actionMap = {
    read: 'melihat',
    edit: 'mengedit',
    delete: 'menghapus',
  }

  const verb = actionMap[action]

  switch (userRole) {
    case 'ketua_rt':
      return `Anda hanya dapat ${verb} data warga di RT Anda sendiri`
    case 'rw_manager':
      return `Anda hanya dapat ${verb} data warga di RW Anda`
    case 'warga':
      return `Anda tidak memiliki izin untuk ${verb} data lain`
    default:
      return `Anda tidak memiliki izin untuk ${verb} data ini`
  }
}

/**
 * Validasi apakah user dapat membuat warga baru di RT tertentu
 */
export const canCreateResidentInRT = (
  userRole: UserRole,
  userRt: string | null,
  targetRt: string
): boolean => {
  if (userRole === 'admin') {
    return true
  }

  if (userRole === 'rw_manager') {
    // RW Manager dapat buat warga di RT manapun (lebih permisif)
    return true
  }

  if (userRole === 'ketua_rt') {
    // Ketua RT hanya dapat buat warga di RT-nya sendiri
    return userRt === targetRt
  }

  return false
}

/**
 * Validasi apakah user dapat mengubah RT warga
 * (memindahkan warga dari 1 RT ke RT lain)
 */
export const canChangeResidentRT = (
  userRole: UserRole,
  userRt: string | null
): boolean => {
  // Hanya admin dan rw_manager yang dapat pindahkan warga
  // Ketua RT tidak dapat pindahkan warga keluar dari RT-nya
  return userRole === 'admin' || userRole === 'rw_manager'
}

/**
 * Get readable role name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrator',
    rw_manager: 'Kepala RW',
    ketua_rt: 'Ketua RT',
    warga: 'Warga',
    guest: 'Guest',
  }
  return roleNames[role] || role
}

/**
 * Get role description
 */
export const getRoleDescription = (role: UserRole): string => {
  const descriptions: Record<UserRole, string> = {
    admin: 'Akses penuh ke semua data dan konfigurasi sistem',
    rw_manager: 'Dapat mengelola semua RT dalam RW-nya',
    ketua_rt: 'Dapat mengelola warga dan data RT-nya saja',
    warga: 'Dapat melihat dan mengedit profil pribadi',
    guest: 'Hanya melihat informasi publik',
  }
  return descriptions[role] || 'Role tidak dikenal'
}

/**
 * Validate role hierarchy
 * Admin > RW Manager > Ketua RT > Warga
 */
export const isRoleHigherOrEqual = (
  userRole: UserRole,
  targetRole: UserRole
): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    rw_manager: 3,
    ketua_rt: 2,
    warga: 1,
    guest: 0,
  }

  return roleHierarchy[userRole] >= roleHierarchy[targetRole]
}
