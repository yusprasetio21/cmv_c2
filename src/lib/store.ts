import { create } from "zustand";

export interface User {
  id: string;
  username: string;
  namaLengkap: string;
  role: string;
  rumahId: string | null;
  house: { nomorRumah: string; blok: string; statusRumah: string } | null;
  organizationId: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  province: string;
  kabupaten: string;
  kecamatan: string;
  kelurahan: string;
  rtNumber: string;
  rwNumber: string;
  addressFull: string;
  ketuaRtName: string;
  logoUrl: string | null;
  stampUrl: string | null;
  signatureUrl: string | null;
  iuranNominal: number;
  createdAt: string;
}

export type PageName =
  | "dashboard"
  | "denah"
  | "iuran"
  | "surat"
  | "account"
  | "admin-warga"
  | "admin-edaran"
  | "admin-surat"
  | "admin-settings"
  | "admin-data-warga"
  | "login";

interface AppState {
  user: User | null;
  organization: Organization | null;
  currentPage: PageName;
  isLoading: boolean;
  showLogin: boolean;
  orgSlug: string | null;
  login: (user: User) => void;
  logout: () => void;
  setPage: (page: PageName) => void;
  setLoading: (loading: boolean) => void;
  setShowLogin: (show: boolean) => void;
  setOrganization: (org: Organization) => void;
  setOrgSlug: (slug: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  organization: null,
  currentPage: "dashboard",
  isLoading: true,
  showLogin: false,
  orgSlug: null,
  login: (user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rtdigital_session", JSON.stringify(user));
      if (user.organizationId) {
        localStorage.setItem("rtdigital_org_id", user.organizationId);
      }
      // Restore saved page if exists
      const savedPage = sessionStorage.getItem("rtdigital_page");
      if (savedPage) {
        sessionStorage.removeItem("rtdigital_page");
        set({ user, currentPage: savedPage as PageName, showLogin: false });
        return;
      }
    }
    set({ user, currentPage: "dashboard", showLogin: false });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("rtdigital_session");
      localStorage.removeItem("rtdigital_org_id");
      sessionStorage.removeItem("rtdigital_page");
    }
    set({ user: null, currentPage: "dashboard", showLogin: false });
  },
  setPage: (page) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("rtdigital_page", page);
    }
    set({ currentPage: page });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setShowLogin: (showLogin) => set({ showLogin }),
  setOrganization: (organization) => {
    if (typeof window !== "undefined" && organization?.id) {
      localStorage.setItem("rtdigital_org_id", organization.id);
    }
    set({ organization });
  },
  setOrgSlug: (orgSlug) => set({ orgSlug }),
}));
