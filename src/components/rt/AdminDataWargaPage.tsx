"use client";

import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  Baby,
  Search,
  ChevronRight,
  User,
} from "lucide-react";
import { formatDateLong, calculateAge } from "@/lib/helpers";

interface FamilyMember {
  namaLengkap: string;
  hubungan: string;
  tempatLahir?: string;
  tanggalLahir: string;
  pekerjaanSekolah: string;
  nik?: string;
}

interface FamilyData {
  id: string;
  userId: string;
  userName: string;
  namaKk: string;
  nik?: string;
  nikAnggota?: string[];
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  agama: string;
  pekerjaan: string;
  noHp: string;
  members: FamilyMember[];
  rumah?: string;
  blok?: string;
}

interface AgeCategory {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  range: [number, number];
  count: number;
  data: {
    name: string;
    age: string;
    hubungan: string;
    nik?: string;
    rumah?: string;
    blok?: string;
  }[];
}

function getAge(tanggalLahir: string): number {
  if (!tanggalLahir) return 0;
  const diff = Date.now() - new Date(tanggalLahir).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default function AdminDataWargaPage() {
  const { setPage, organization } = useAppStore();
  const [families, setFamilies] = useState<FamilyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailMember, setDetailMember] = useState<{
    name: string;
    age: string;
    hubungan: string;
    nik?: string;
    tempatLahir?: string;
    tanggalLahir?: string;
    pekerjaanSekolah?: string;
    rumah?: string;
    blok?: string;
  } | null>(null);

  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all users to get IDs and names
      const orgId = organization?.id;
      const usersRes = await fetch(`/api/users?organization_id=${orgId || ""}`);
      if (!usersRes.ok) return;
      const users = await usersRes.json();

      // Buat map user -> rumah
      const userHouseMap = new Map<
        string,
        { nomorRumah: string; blok: string }
      >();
      users.forEach(
        (u: {
          id: string;
          house: { nomorRumah: string; blok: string } | null;
        }) => {
          if (u.house) {
            userHouseMap.set(u.id, {
              nomorRumah: u.house.nomorRumah,
              blok: u.house.blok,
            });
          }
        },
      );

      // Fetch family data for each user
      const familyPromises = users.map(
        async (u: {
          id: string;
          namaLengkap: string;
          house: { nomorRumah: string; blok: string } | null;
        }) => {
          try {
            const res = await fetch(`/api/family?userId=${u.id}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (!data) return null;
            return {
              ...data,
              userId: u.id,
              userName: u.namaLengkap,
              rumah: u.house?.nomorRumah || null,
              blok: u.house?.blok || null,
              members: (data.members || []).map((m: FamilyMember) => ({
                ...m,
                nik: m.nik || "",
              })),
            } as FamilyData;
          } catch {
            return null;
          }
        },
      );

      const results = (await Promise.all(familyPromises)).filter(
        Boolean,
      ) as FamilyData[];
      setFamilies(results);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  // Collect all individuals (KK + members) for age categorization
  const allIndividuals: {
    name: string;
    tanggalLahir: string;
    hubungan: string;
    nik?: string;
    tempatLahir?: string;
    pekerjaanSekolah?: string;
    rumah?: string;
    blok?: string;
  }[] = [];
  families.forEach((f) => {
    // Kepala Keluarga
    allIndividuals.push({
      name: f.namaKk,
      tanggalLahir: f.tanggalLahir,
      hubungan: "Kepala Keluarga",
      nik: f.nik,
      tempatLahir: f.tempatLahir,
      pekerjaanSekolah: f.pekerjaan,
      rumah: f.rumah,
      blok: f.blok,
    });
    // Anggota
    f.members.forEach((m) => {
      allIndividuals.push({
        name: m.namaLengkap,
        tanggalLahir: m.tanggalLahir,
        hubungan: m.hubungan,
        nik: m.nik,
        tempatLahir: m.tempatLahir,
        pekerjaanSekolah: m.pekerjaanSekolah,
        rumah: f.rumah,
        blok: f.blok,
      });
    });
  });

  const ageCategories: AgeCategory[] = [
    {
      label: "Balita (0-5)",
      icon: <Baby className="w-5 h-5" />,
      color: "text-pink-600",
      bg: "bg-pink-100",
      range: [0, 5],
      count: 0,
      data: [],
    },
    {
      label: "Anak-anak (6-12)",
      icon: <Baby className="w-5 h-5" />,
      color: "text-orange-600",
      bg: "bg-orange-100",
      range: [6, 12],
      count: 0,
      data: [],
    },
    {
      label: "Remaja (13-17)",
      icon: <Users className="w-5 h-5" />,
      color: "text-amber-600",
      bg: "bg-amber-100",
      range: [13, 17],
      count: 0,
      data: [],
    },
    {
      label: "Dewasa (18-59)",
      icon: <Users className="w-5 h-5" />,
      color: "text-blue-600",
      bg: "bg-blue-100",
      range: [18, 59],
      count: 0,
      data: [],
    },
    {
      label: "Lansia (60+)",
      icon: <Users className="w-5 h-5" />,
      color: "text-purple-600",
      bg: "bg-purple-100",
      range: [60, 999],
      count: 0,
      data: [],
    },
  ];

  // Populate categories
  allIndividuals.forEach((ind) => {
    const age = getAge(ind.tanggalLahir);
    for (const cat of ageCategories) {
      if (age >= cat.range[0] && age <= cat.range[1]) {
        cat.count++;
        cat.data.push({
          name: ind.name,
          age: ind.tanggalLahir ? `${age} thn` : "-",
          hubungan: ind.hubungan,
          nik: ind.nik,
          rumah: ind.rumah,
          blok: ind.blok,
        });
        break;
      }
    }
  });

  // Individuals without age data
  const noAgeData = allIndividuals.filter((ind) => !ind.tanggalLahir);

  // Filter data for selected category
  const selectedCategoryData = selectedCategory
    ? ageCategories.find((c) => c.label === selectedCategory)?.data || []
    : [];

  const filteredDetailData = selectedCategoryData.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalJiwa = allIndividuals.length;
  const totalKK = families.length;

  return (
    <div className="px-5 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setPage("account")}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">Data Warga</h2>
          <p className="text-sm text-slate-500">
            {totalKK} KK, {totalJiwa} jiwa
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchData}
          className="rounded-xl"
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">Memuat data warga...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Total Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
              <p className="text-3xl font-bold text-teal-600">{totalKK}</p>
              <p className="text-xs text-slate-500 mt-1">Kepala Keluarga</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
              <p className="text-3xl font-bold text-teal-600">{totalJiwa}</p>
              <p className="text-xs text-slate-500 mt-1">Total Jiwa</p>
            </div>
          </div>

          {/* Age Categories */}
          <div className="grid grid-cols-1 gap-3">
            {ageCategories.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.label)}
                className={`w-full text-left bg-white rounded-2xl p-4 border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  selectedCategory === cat.label
                    ? "border-teal-400 ring-2 ring-teal-100"
                    : "border-slate-100"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 ${cat.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <span className={cat.color}>{cat.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{cat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-0.5">
                      {cat.count} orang
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </button>
            ))}
          </div>

          {/* No Age Data Alert */}
          {noAgeData.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-700">
                ⚠️ {noAgeData.length} warga belum mengisi tanggal lahir
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Data usia tidak akurat. Arahkan warga untuk melengkapi data
                keluarga.
              </p>
            </div>
          )}

          {/* Category Detail Table */}
          {selectedCategory && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    {selectedCategory}
                  </h3>
                  <span className="text-sm text-slate-500">
                    {filteredDetailData.length} orang
                  </span>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama..."
                    className="pl-9 py-2 bg-slate-50 border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <ScrollArea className="max-h-80">
                {filteredDetailData.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    Tidak ada data
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredDetailData.map((d, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          setDetailMember({
                            name: d.name,
                            age: d.age,
                            hubungan: d.hubungan,
                            nik: d.nik,
                            rumah: d.rumah,
                            blok: d.blok,
                          })
                        }
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3"
                      >
                        <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">
                            {d.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">
                              {d.hubungan}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">
                              {d.age}
                            </span>
                            {d.rumah && (
                              <>
                                <span className="text-xs text-slate-400">
                                  •
                                </span>
                                <span className="text-xs text-slate-500">
                                  {d.blok
                                    ? `Blok ${d.blok} - ${d.rumah}`
                                    : d.rumah}
                                </span>
                              </>
                            )}
                            {d.nik && (
                              <>
                                <span className="text-xs text-slate-400">
                                  •
                                </span>
                                <span className="text-xs text-slate-500">
                                  NIK: {d.nik}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Family List Summary */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">
              Daftar Keluarga ({totalKK})
            </h3>
            <div className="space-y-2">
              {families.length === 0 ? (
                <p className="text-center text-slate-500 py-4 text-sm">
                  Belum ada data keluarga. Arahkan warga untuk mengisi data
                  keluarga di menu Akun.
                </p>
              ) : (
                families.map((f, i) => (
                  <div
                    key={f.id || i}
                    className="bg-white rounded-xl p-4 border border-slate-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">
                          {f.namaKk}
                        </p>
                        <p className="text-xs text-slate-500">
                          {f.userName} • {f.members.length + 1} anggota
                          {f.nik && ` • NIK: ${f.nik}`}
                        </p>
                      </div>
                    </div>
                    {f.members.length > 0 && (
                      <div className="mt-2 pl-[52px] space-y-1">
                        {f.members.map((m, j) => (
                          <div
                            key={j}
                            className="text-xs text-slate-600 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                            <span className="font-medium">{m.namaLengkap}</span>
                            <Badge className="bg-slate-100 text-slate-600 text-[10px]">
                              {m.hubungan}
                            </Badge>
                            {m.nik && (
                              <span className="text-slate-400">
                                NIK: {m.nik}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Member Modal */}
      <Dialog open={!!detailMember} onOpenChange={() => setDetailMember(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Detail Warga</DialogTitle>
          </DialogHeader>
          {detailMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center">
                  <User className="w-7 h-7 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">
                    {detailMember.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {detailMember.hubungan}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Usia</span>
                  <span className="font-medium">{detailMember.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hubungan</span>
                  <span className="font-medium">{detailMember.hubungan}</span>
                </div>
                {detailMember.rumah && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rumah</span>
                    <span className="font-medium">
                      {detailMember.blok
                        ? `Blok ${detailMember.blok} - ${detailMember.rumah}`
                        : detailMember.rumah}
                    </span>
                  </div>
                )}
                {detailMember.nik && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">NIK</span>
                    <span className="font-medium font-mono text-sm">
                      {detailMember.nik}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
