"use client";

import { useEffect, useState } from "react";
import { useAppStore, Organization } from "@/lib/store";
import RegisterPage from "@/components/rt/RegisterPage";
import LoginPage from "@/components/rt/LoginPage";
import OrgApp from "@/components/rt/OrgApp";
import {
  Mountain,
  Plus,
  Search,
  ArrowRight,
  Globe,
  Users,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type View = "home" | "register" | "login" | "org";

export default function HomePage() {
  const { setOrganization, setOrgSlug, login, organization } = useAppStore();
  const [view, setView] = useState<View>("home");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [searchSlug, setSearchSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<Organization | null>(null);
  const [slugInput, setSlugInput] = useState("");
  const [restoredSession, setRestoredSession] = useState(false);

  // Load organizations list
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          setOrgs(Array.isArray(data) ? data : []);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    load();
  }, []);

  // If organization loaded, show the org app
  if (organization) {
    return <OrgApp />;
  }

  // Cek session di localStorage dulu
  if (!restoredSession && typeof window !== "undefined") {
    const stored = localStorage.getItem("rtdigital_session");
    const storedOrgId = localStorage.getItem("rtdigital_org_id");
    const slug = window.location.pathname.split("/").filter(Boolean)[0];
    if (stored && storedOrgId && slug && slug !== "api" && slug !== "_next") {
      // Org belum di-fetch, tapi session cocok dengan slug di URL
      // Fetch org dulu
      setRestoredSession(true);
      fetch(`/api/organizations?slug=${slug}`)
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((org) => {
          if (org && org.id === storedOrgId) {
            setOrganization(org);
            setOrgSlug(org.slug);
          }
        });
    } else {
      setRestoredSession(true);
    }
  }

  if (!restoredSession) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-teal-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Memuat RT Digital...</p>
      </div>
    );
  }

  const handleGoToOrg = async () => {
    const slug = slugInput.toLowerCase().trim() || searchSlug;
    if (!slug) return;
    try {
      const res = await fetch(`/api/organizations?slug=${slug}`);
      if (res.ok) {
        const org = await res.json();
        setOrgData(org);
        setOrganization(org);
        setOrgSlug(org.slug);
      } else {
        alert("RT tidak ditemukan. Periksa kembali slug/URL.");
      }
    } catch {
      alert("Terjadi kesalahan");
    }
  };

  const handleRegisterSuccess = (
    org: Organization,
    user: {
      id: string;
      username: string;
      namaLengkap: string;
      role: string;
      organizationId: string;
    },
  ) => {
    setOrganization(org);
    setOrgSlug(org.slug);
    login({
      id: user.id,
      username: user.username,
      namaLengkap: user.namaLengkap,
      role: user.role,
      rumahId: null,
      house: null,
      organizationId: user.organizationId,
    });
  };

  // Register view
  if (view === "register") {
    return (
      <RegisterPage
        onBack={() => setView("home")}
        onSuccess={handleRegisterSuccess}
      />
    );
  }

  // Login view with org context
  if (view === "login") {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50">
        <LoginPage
          onBack={() => setView("home")}
          organizationId={orgData?.id}
          orgName={orgData?.name}
        />
      </div>
    );
  }

  // Home view
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 px-6 pt-12 pb-10 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-2xl mx-auto mb-5 flex items-center justify-center">
            <Mountain className="w-12 h-12 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">RT Digital</h1>
          <p className="text-teal-100 text-base mb-1">
            Sistem Manajemen RT Terpadu
          </p>
          <p className="text-teal-200/70 text-sm">
            Platform digital untuk pengelolaan RT/RW
          </p>
        </div>
      </div>

      <div className="px-5 -mt-6 relative z-10 space-y-6 pb-8">
        {/* Search / Enter Slug */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Search className="w-5 h-5 text-teal-600" />
            Masuk ke RT Anda
          </h3>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                rtdigital.vercel.app/
              </span>
              <Input
                value={slugInput}
                onChange={(e) =>
                  setSlugInput(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
                placeholder="slug-rt"
                className="pl-[130px] py-3 bg-slate-50 border-slate-200 rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGoToOrg();
                }}
              />
            </div>
            <Button
              onClick={handleGoToOrg}
              className="bg-teal-600 hover:bg-teal-700 rounded-xl px-4"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Masukkan slug RT Anda atau klik dari daftar di bawah
          </p>
        </div>

        {/* Register CTA */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Plus className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Daftarkan RT Anda</h3>
              <p className="text-emerald-100 text-sm mb-3">
                Buat akun RT Digital gratis untuk wilayah Anda. Dapatkan akses
                penuh dalam hitungan menit.
              </p>
              <Button
                onClick={() => setView("register")}
                className="bg-white text-teal-700 hover:bg-emerald-50 font-semibold rounded-xl"
              >
                Daftar RT Baru →
              </Button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div>
          <h3 className="font-semibold text-slate-800 mb-3">Fitur Utama</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: <Users className="w-5 h-5 text-blue-600" />,
                bg: "bg-blue-100",
                title: "Manajemen Warga",
                desc: "Data warga & keluarga",
              },
              {
                icon: <Building2 className="w-5 h-5 text-emerald-600" />,
                bg: "bg-emerald-100",
                title: "Iuran & Kas",
                desc: "Pembayaran IPL",
              },
              {
                icon: <Globe className="w-5 h-5 text-purple-600" />,
                bg: "bg-purple-100",
                title: "Surat Resmi",
                desc: "Surat keterangan RT",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 border border-slate-100 text-center"
              >
                <div
                  className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}
                >
                  {f.icon}
                </div>
                <p className="text-xs font-medium text-slate-800">{f.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Organization List */}
        {orgs.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">RT Terdaftar</h3>
            <div className="space-y-3">
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={async () => {
                    setOrgData(org);
                    setOrganization(org);
                    setOrgSlug(org.slug);
                  }}
                  className="w-full text-left bg-white rounded-xl p-4 border border-slate-100 hover:border-teal-200 transition-all flex items-center gap-3"
                >
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mountain className="w-6 h-6 text-teal-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">
                      {org.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      RT {org.rtNumber} RW {org.rwNumber} {org.kelurahan}
                    </p>
                    <p className="text-xs text-teal-600">/{org.slug}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Memuat...</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-2">
          <p className="text-xs text-slate-400">
            © 2025 RT Digital - Sistem Manajemen RT Terpadu
          </p>
          <p className="text-[10px] text-slate-300 mt-1">
            Platform SaaS untuk pengelolaan RT/RW se-Indonesia
          </p>
        </div>
      </div>
    </div>
  );
}
