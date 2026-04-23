"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import HomePage from "@/components/rt/HomePage";

export default function RTDigitalApp() {
  const { setOrgSlug, setOrganization, organization } = useAppStore();
  const [slugFromUrl, setSlugFromUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session dari localStorage langsung (tanpa nunggu fetch org)
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    // Cek session dulu
    const stored = localStorage.getItem("rtdigital_session");
    const storedOrgId = localStorage.getItem("rtdigital_org_id");
    const path = window.location.pathname;
    const slug = path.split("/").filter(Boolean)[0];

    if (stored && storedOrgId && slug && slug !== "api" && slug !== "_next") {
      try {
        const userData = JSON.parse(stored);
        // Login dulu dengan data session yang ada
        // Organization akan diisi setelah fetch selesai
        login(userData);
        setSlugFromUrl(slug);
        setOrgSlug(slug);
      } catch {
        /* ignore */
      }
    }

    // Fetch org dari slug URL
    if (slug && slug !== "api" && slug !== "_next") {
      fetch(`/api/organizations?slug=${slug}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((org) => {
          if (org) {
            setOrganization(org);
            setOrgSlug(org.slug);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
          setSessionRestored(true);
        });
    } else {
      setLoading(false);
      setSessionRestored(true);
    }
  }, []);

  if (loading || !sessionRestored) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-teal-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Memuat RT Digital...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <HomePage />
    </div>
  );
}
