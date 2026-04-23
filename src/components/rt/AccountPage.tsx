"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Users,
  LogOut,
  Shield,
  FileText,
  CreditCard,
  Bell,
  Megaphone,
  Settings,
  ChevronRight,
  Mountain,
  Eye,
  FileSearch,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatDate,
  formatCurrency,
  getMonthName,
  getStatusBadgeClass,
  getStatusLabel,
  calculateAge,
  formatDateLong,
} from "@/lib/helpers";

interface FamilyMember {
  namaLengkap: string;
  hubungan: string;
  tempatLahir?: string;
  tanggalLahir: string;
  pekerjaanSekolah: string;
  nik?: string;
}

interface FamilyDataV2 {
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
}

interface FamilyData {
  id: string;
  namaKk: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  agama: string;
  pekerjaan: string;
  noHp: string;
  members: FamilyMember[];
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface PendingItem {
  id: string;
  type: "payment" | "letter";
  detail: string;
  status: string;
  createdAt: string;
  userId: string;
  userName: string;
  buktiName?: string | null;
  dataSurat?: Record<string, string>;
  jenisSurat?: string;
}

export default function AccountPage() {
  const { user, logout, setPage, organization } = useAppStore();
  const [familyOpen, setFamilyOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLetterOpen, setPreviewLetterOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<PendingItem | null>(
    null,
  );

  // Edit form state
  const [editNamaKk, setEditNamaKk] = useState("");
  const [editNik, setEditNik] = useState("");
  const [editTempatLahir, setEditTempatLahir] = useState("");
  const [editTanggalLahir, setEditTanggalLahir] = useState("");
  const [editJenisKelamin, setEditJenisKelamin] = useState("");
  const [editAgama, setEditAgama] = useState("");
  const [editPekerjaan, setEditPekerjaan] = useState("");
  const [editNoHp, setEditNoHp] = useState("");
  const [editMembers, setEditMembers] = useState<FamilyMember[]>([]);

  const loadFamilyDataRef = useRef(false);
  const fetchFamilyData = async () => {
    if (!user) return;
    const res = await fetch(`/api/family?userId=${user.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        const members =
          typeof data.members === "string"
            ? JSON.parse(data.members)
            : data.members || [];
        setFamilyData({ ...data, members });
        setEditNamaKk(data.namaKk || "");
        setEditNik(data.nik || "");
        setEditTempatLahir(data.tempatLahir || "");
        setEditTanggalLahir(data.tanggalLahir || "");
        setEditJenisKelamin(data.jenisKelamin || "");
        setEditAgama(data.agama || "");
        setEditPekerjaan(data.pekerjaan || "");
        setEditNoHp(data.noHp || "");
        setEditMembers(members);
      }
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const res = await fetch(`/api/notifications?userId=${user.id}`);
    if (res.ok) setNotifications(await res.json());
  };

  const fetchPendingItems = async () => {
    if (!user || user.role !== "admin") return;
    try {
      const [payRes, letRes] = await Promise.all([
        fetch("/api/payments"),
        fetch("/api/letters"),
      ]);

      interface PaymentType {
        id: string;
        tahun: number;
        bulan: number;
        nominal: number;
        status: string;
        createdAt: string;
        userId: string;
        user: { namaLengkap: string };
        buktiName: string | null;
      }

      interface LetterType {
        id: string;
        jenisSurat: string;
        status: string;
        createdAt: string;
        userId: string;
        user: { namaLengkap: string };
        dataSurat: string | Record<string, string>;
        keperluan?: string;
      }

      const payments = payRes.ok
        ? ((await payRes.json()) as PaymentType[])
        : [];
      const letters = letRes.ok ? ((await letRes.json()) as LetterType[]) : [];

      const items: PendingItem[] = [
        ...payments
          .filter((p: PaymentType) => p.status === "pending")
          .map((p: PaymentType) => ({
            id: p.id,
            type: "payment" as const,
            detail: `Iuran ${getMonthName(p.bulan)} ${p.tahun} - ${formatCurrency(p.nominal)}`,
            status: p.status,
            createdAt: p.createdAt,
            userId: p.userId,
            userName: p.user?.namaLengkap || "-",
            buktiName: p.buktiName,
          })),
        ...letters
          .filter((l: LetterType) => l.status === "pending")
          .map((l: LetterType) => ({
            id: l.id,
            type: "letter" as const,
            detail: `Surat ${l.jenisSurat}`,
            status: l.status,
            createdAt: l.createdAt,
            userId: l.userId,
            userName: l.user?.namaLengkap || "-",
            buktiName: null,
            dataSurat:
              typeof l.dataSurat === "string"
                ? JSON.parse(l.dataSurat)
                : l.dataSurat,
            jenisSurat: l.jenisSurat,
          })),
      ];
      setPendingItems(items);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (loadFamilyDataRef.current) return;
    loadFamilyDataRef.current = true;
    fetchNotifications();
    fetchPendingItems();
  }, []);

  const openFamilyModal = async () => {
    await fetchFamilyData();
    setIsEditing(false);
    setFamilyOpen(true);
  };

  const saveFamilyData = async () => {
    if (!user) return;
    try {
      const method = familyData ? "PUT" : "POST";
      const res = await fetch("/api/family", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          namaKk: editNamaKk,
          nik: editNik,
          nikAnggota: editMembers.map((m) => m.nik || ""),
          tempatLahir: editTempatLahir,
          tanggalLahir: editTanggalLahir,
          jenisKelamin: editJenisKelamin,
          agama: editAgama,
          pekerjaan: editPekerjaan,
          noHp: editNoHp,
          members: editMembers,
        }),
      });
      if (res.ok) {
        toast.success("Data keluarga berhasil disimpan!");
        setIsEditing(false);
        fetchFamilyData();
      } else {
        toast.error("Gagal menyimpan data");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleApprove = async (item: PendingItem) => {
    const endpoint =
      item.type === "payment"
        ? `/api/payments/${item.id}`
        : `/api/letters/${item.id}`;
    const body =
      item.type === "letter"
        ? {
            status: "approved",
            nomorSurat: `${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}/Sekrt-RT/${new Date().getFullYear()}`,
          }
        : { status: "approved" };
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success("Berhasil disetujui!");
      fetchPendingItems();
    }
  };

  const handleReject = async (item: PendingItem) => {
    const endpoint =
      item.type === "payment"
        ? `/api/payments/${item.id}`
        : `/api/letters/${item.id}`;
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      toast.success("Ditolak");
      fetchPendingItems();
    }
  };

  const handleViewBukti = (buktiUrl: string) => {
    setPreviewImage(buktiUrl);
    setPreviewOpen(true);
  };

  const handlePreviewLetter = (item: PendingItem) => {
    setSelectedLetter(item);
    setPreviewLetterOpen(true);
  };

  const handlePrint = () => {
    const printContent = document.getElementById("letter-preview-document");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Preview Surat Keterangan</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4;
              margin: 1.5cm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              background: white;
              font-size: 12pt;
              line-height: 1.4;
            }
            .letter-container {
              max-width: 100%;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .underline { text-decoration: underline; }
            .border-b-2 { border-bottom: 2px solid black; }
            .border-b { border-bottom: 1px solid #ccc; }
            .mt-10 { margin-top: 40px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-5 { margin-bottom: 20px; }
            .mr-16 { margin-right: 64px; }
            .pb-3 { padding-bottom: 12px; }
            .pt-2 { padding-top: 8px; }
            .w-14 { width: 56px; }
            .h-14 { height: 56px; }
            .w-24 { width: 96px; }
            .h-16 { height: 64px; }
            .w-20 { width: 80px; }
            .h-20 { height: 80px; }
            .object-contain { object-fit: contain; }
            .inline-block { display: inline-block; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .relative { position: relative; }
            .absolute { position: absolute; }
            .-right-4 { right: -16px; }
            .bottom-0 { bottom: 0; }
            .opacity-80 { opacity: 0.8; }
            .gap-3 { gap: 12px; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 4px 0; }
            .w-40 { width: 160px; }
            .align-top { vertical-align: top; }
            .leading-relaxed { line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="letter-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const renderLetterPreview = (item: PendingItem) => {
    if (!item.dataSurat || !item.jenisSurat) return null;

    const typeName = item.jenisSurat;
    const data = item.dataSurat;
    const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");

    const rtAddr = organization
      ? {
          rt: organization.rtNumber,
          rw: organization.rwNumber,
          fullAddress: organization.addressFull,
          shortAddress: `RT ${organization.rtNumber} RW ${organization.rwNumber} Desa ${organization.kelurahan}`,
          letterHeader: `KETUA RT ${organization.rtNumber} RW ${organization.rwNumber} DESA ${organization.kelurahan.toUpperCase()}`,
          letterSubHeader: `KECAMATAN ${organization.kecamatan.toUpperCase()} - ${organization.kabupaten.toUpperCase()}`,
          letterLocation: organization.kabupaten
            .replace("Kabupaten ", "")
            .replace("Kab. ", ""),
          ketuaRtName: organization.ketuaRtName,
          logoUrl: organization.logoUrl,
        }
      : {
          rt: "002",
          rw: "013",
          fullAddress:
            "Perumahan Ciapus Mountain View RT 002 RW 013 Desa Pasireurih Kecamatan Tamansari Kabupaten Bogor",
          shortAddress: "RT 002 RW 013 Desa Pasireurih",
          letterHeader: "KETUA RT 002 RW 013 DESA PASIREURIH",
          letterSubHeader: "KECAMATAN TAMANSARI - KABUPATEN BOGOR",
          letterLocation: "Bogor",
          ketuaRtName: "",
          logoUrl: null,
        };

    const renderRows = () => {
      const rows = [
        ["Nama Lengkap", data.namaLengkap || data.namaKK || "-"],
        ["NIK", data.nik || "-"],
        [
          "TTL",
          `${data.tempatLahir || "-"}, ${formatDateLong(data.tanggalLahir)}`,
        ],
      ];

      if (data.jenisKelamin) rows.push(["Jenis Kelamin", data.jenisKelamin]);
      if (data.pekerjaan) rows.push(["Pekerjaan", data.pekerjaan]);
      if (data.agama) rows.push(["Agama", data.agama]);
      if (data.statusPerkawinan) rows.push(["Status", data.statusPerkawinan]);
      if (data.namaSekolah) rows.push(["Sekolah", data.namaSekolah]);
      if (data.namaOrangTua) rows.push(["Orang Tua", data.namaOrangTua]);

      return rows.map((r, i) => (
        <tr key={i} className="border-b border-slate-100">
          <td className="py-1.5 pr-4 text-sm text-slate-600 w-40 align-top">
            {r[0]}
          </td>
          <td className="py-1.5 text-sm font-medium text-slate-800">
            : {r[1]}
          </td>
        </tr>
      ));
    };

    return (
      <div
        className="bg-white p-8 max-w-2xl mx-auto"
        id="letter-preview-document"
      >
        <div className="text-center mb-5 border-b-2 border-black pb-3">
          <div className="flex items-center justify-center gap-3 mb-1">
            {rtAddr.logoUrl && (
              <img
                src={rtAddr.logoUrl}
                alt="Logo"
                className="w-14 h-14 object-contain"
              />
            )}
            <div>
              <p className="text-xs font-bold tracking-wide">
                {rtAddr.letterHeader}
              </p>
              <p className="text-xs font-bold tracking-wide">
                {rtAddr.letterSubHeader}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center font-bold text-base underline mb-2">
          SURAT KETERANGAN {typeName.toUpperCase()}
        </div>
        <p className="text-center text-xs mb-4">
          No. {num}/Sekrt-RT/{formatDateLong(new Date())}
        </p>

        <div className="text-sm leading-relaxed mb-4">
          <p className="mb-3">
            Yang bertanda tangan di bawah ini Ketua {rtAddr.fullAddress}
            dengan ini menerangkan bahwa:
          </p>
          <table className="w-full mb-3">
            <tbody>{renderRows()}</tbody>
          </table>
          <p className="mb-3">
            Orang tersebut di atas adalah benar-benar warga kami dan berdomisili
            di {rtAddr.shortAddress}.
          </p>
          <p>
            Demikian surat keterangan ini dibuat untuk dapat dipergunakan
            sebagaimana mestinya.
          </p>
          {data.keperluan && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">Keperluan:</span> {data.keperluan}
            </p>
          )}
        </div>

        <div className="text-right mt-10">
          <p className="mr-16 mb-1 text-sm">
            {rtAddr.letterLocation}, {formatDateLong(new Date().toISOString())}
          </p>
          <p className="mr-16 mb-8 text-sm">
            Ketua RT {rtAddr.rt} RW {rtAddr.rw}
          </p>
          <div className="mr-16 text-center text-slate-400 italic text-sm border-2 border-dashed border-slate-300 rounded-lg p-4 inline-block">
            <p>Stempel &amp; Tanda Tangan</p>
            <p className="text-xs">(Setelah disetujui)</p>
          </div>
          {rtAddr.ketuaRtName && (
            <p className="text-sm font-medium mt-2">{rtAddr.ketuaRtName}</p>
          )}
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    toast.success("Anda telah keluar");
  };

  const initials =
    user?.namaLengkap
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "-";

  return (
    <div className="px-5 py-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 mb-6 text-center">
        <div className="w-20 h-20 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-teal-700 font-bold text-2xl">{initials}</span>
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          {user?.namaLengkap}
        </h2>
        <p className="text-sm text-slate-500">
          Rumah:{" "}
          {user?.house
            ? `${user.house.nomorRumah} (Blok ${user.house.blok})`
            : user?.rumahId || "-"}
        </p>
        <Badge className="mt-2 bg-teal-100 text-teal-700">
          {user?.role === "admin" ? "Ketua RT" : "Warga"}
        </Badge>
      </div>

      {/* Admin Section */}
      {user?.role === "admin" && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
            Admin Panel
          </h3>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <button
              onClick={() => setPage("admin-data-warga")}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">Data Warga</p>
                <p className="text-xs text-slate-500">
                  Statistik usia & data kependudukan
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => setPage("admin-warga")}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">
                  Kelola Warga & Rumah
                </p>
                <p className="text-xs text-slate-500">
                  Tambah, edit, hapus warga & rumah
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => setPage("admin-edaran")}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">
                  Kelola Edaran & Banner
                </p>
                <p className="text-xs text-slate-500">
                  Atur pengumuman & info banner
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => setPage("admin-surat")}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">Kelola Surat</p>
                <p className="text-xs text-slate-500">
                  Persetujuan & manajemen surat
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => setPage("admin-settings")}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <Mountain className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">Pengaturan RT</p>
                <p className="text-xs text-slate-500">
                  Data wilayah, logo, stempel, TTD
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => {
                fetchPendingItems();
                setAdminOpen(true);
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">Persetujuan Cepat</p>
                <p className="text-xs text-slate-500">
                  {pendingItems.length} item pending
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      )}

      {/* User Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
          Akun Saya
        </h3>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <button
            onClick={openFamilyModal}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-slate-800">Data Keluarga</p>
              <p className="text-xs text-slate-500">Kelola data KK & anggota</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          <button
            onClick={() => {
              fetchNotifications();
              setNotifOpen(true);
            }}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-slate-800">Notifikasi</p>
              <p className="text-xs text-slate-500">
                {notifications.filter((n) => !n.read).length} belum dibaca
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors text-red-600"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Keluar dari Akun</p>
            </div>
            <ChevronRight className="w-4 h-4 text-red-300" />
          </button>
        </div>
      </div>

      {/* Family Data Modal */}
      <Dialog open={familyOpen} onOpenChange={setFamilyOpen}>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Data Keluarga
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsEditing(!isEditing)}
                className="ml-4"
              >
                {isEditing ? "Batal" : "Edit"}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3">
                    Kepala Keluarga
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1">
                        Nama Lengkap *
                      </Label>
                      <Input
                        value={editNamaKk}
                        onChange={(e) => setEditNamaKk(e.target.value)}
                        className="py-2.5"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1">
                        NIK
                      </Label>
                      <Input
                        value={editNik}
                        onChange={(e) =>
                          setEditNik(e.target.value.slice(0, 16))
                        }
                        placeholder="16 digit NIK"
                        maxLength={16}
                        className="py-2.5 font-mono text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1">
                          Tempat Lahir
                        </Label>
                        <Input
                          value={editTempatLahir}
                          onChange={(e) => setEditTempatLahir(e.target.value)}
                          className="py-2.5"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1">
                          Tanggal Lahir
                        </Label>
                        <Input
                          type="date"
                          value={editTanggalLahir}
                          onChange={(e) => setEditTanggalLahir(e.target.value)}
                          className="py-2.5"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1">
                          Jenis Kelamin
                        </Label>
                        <select
                          value={editJenisKelamin}
                          onChange={(e) => setEditJenisKelamin(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                        >
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1">
                          Agama
                        </Label>
                        <select
                          value={editAgama}
                          onChange={(e) => setEditAgama(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                        >
                          <option value="Islam">Islam</option>
                          <option value="Kristen">Kristen</option>
                          <option value="Katolik">Katolik</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Buddha">Buddha</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1">
                        Pekerjaan
                      </Label>
                      <Input
                        value={editPekerjaan}
                        onChange={(e) => setEditPekerjaan(e.target.value)}
                        className="py-2.5"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1">
                        No. HP
                      </Label>
                      <Input
                        value={editNoHp}
                        onChange={(e) => setEditNoHp(e.target.value)}
                        className="py-2.5"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-teal-700 uppercase tracking-wider">
                      Anggota Keluarga ({editMembers.length})
                    </h4>
                    <button
                      onClick={() =>
                        setEditMembers([
                          ...editMembers,
                          {
                            namaLengkap: "",
                            hubungan: "Anak",
                            tanggalLahir: "",
                            pekerjaanSekolah: "",
                          },
                        ])
                      }
                      className="text-xs text-teal-600 font-medium"
                    >
                      + Tambah
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editMembers.map((m, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">
                            Anggota #{i + 1}
                          </span>
                          <button
                            onClick={() =>
                              setEditMembers(
                                editMembers.filter((_, idx) => idx !== i),
                              )
                            }
                            className="text-red-500 text-xs"
                          >
                            Hapus
                          </button>
                        </div>
                        <div className="space-y-2">
                          <Input
                            placeholder="Nama"
                            value={m.namaLengkap}
                            onChange={(e) => {
                              const newMembers = [...editMembers];
                              newMembers[i] = {
                                ...newMembers[i],
                                namaLengkap: e.target.value,
                              };
                              setEditMembers(newMembers);
                            }}
                            className="py-2 text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={m.hubungan}
                              onChange={(e) => {
                                const newMembers = [...editMembers];
                                newMembers[i] = {
                                  ...newMembers[i],
                                  hubungan: e.target.value,
                                };
                                setEditMembers(newMembers);
                              }}
                              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            >
                              <option value="Suami">Suami</option>
                              <option value="Istri">Istri</option>
                              <option value="Anak Laki-laki">
                                Anak Laki-laki
                              </option>
                              <option value="Anak Perempuan">
                                Anak Perempuan
                              </option>
                              <option value="Ayah">Ayah</option>
                              <option value="Ibu">Ibu</option>
                            </select>
                            <Input
                              type="date"
                              value={m.tanggalLahir}
                              onChange={(e) => {
                                const newMembers = [...editMembers];
                                newMembers[i] = {
                                  ...newMembers[i],
                                  tanggalLahir: e.target.value,
                                };
                                setEditMembers(newMembers);
                              }}
                              className="py-2 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Pekerjaan/Sekolah"
                              value={m.pekerjaanSekolah}
                              onChange={(e) => {
                                const newMembers = [...editMembers];
                                newMembers[i] = {
                                  ...newMembers[i],
                                  pekerjaanSekolah: e.target.value,
                                };
                                setEditMembers(newMembers);
                              }}
                              className="py-2 text-sm"
                            />
                            <Input
                              placeholder="NIK (16 digit)"
                              value={m.nik || ""}
                              onChange={(e) => {
                                const newMembers = [...editMembers];
                                newMembers[i] = {
                                  ...newMembers[i],
                                  nik: e.target.value.slice(0, 16),
                                };
                                setEditMembers(newMembers);
                              }}
                              maxLength={16}
                              className="py-2 text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={saveFamilyData}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
                >
                  Simpan Perubahan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3">
                    Kepala Keluarga
                  </h4>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nama</span>
                      <span className="font-medium">
                        {familyData?.namaKk || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">NIK</span>
                      <span className="font-medium font-mono text-sm">
                        {familyData?.nik || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">TTL</span>
                      <span className="font-medium">
                        {familyData?.tempatLahir || "-"},{" "}
                        {formatDateLong(familyData?.tanggalLahir)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">JK</span>
                      <span className="font-medium">
                        {familyData?.jenisKelamin || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pekerjaan</span>
                      <span className="font-medium">
                        {familyData?.pekerjaan || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HP</span>
                      <span className="font-medium">
                        {familyData?.noHp || "-"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3">
                    Anggota Keluarga ({familyData?.members?.length || 0})
                  </h4>
                  <div className="space-y-3">
                    {(familyData?.members || []).length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">
                        Belum ada anggota
                      </p>
                    ) : (
                      (familyData?.members || []).map((m, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-800">
                              {m.namaLengkap}
                            </span>
                            <Badge className="bg-teal-100 text-teal-700">
                              {m.hubungan}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <div>
                              TTL: {m.tempatLahir || "-"},{" "}
                              {formatDateLong(m.tanggalLahir)}
                            </div>
                            <div>Usia: {calculateAge(m.tanggalLahir)} thn</div>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {m.pekerjaanSekolah || "-"}
                            {m.nik && (
                              <span className="ml-2 text-slate-400">
                                NIK: {m.nik}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Notifications Modal */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notifikasi</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  Tidak ada notifikasi
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl ${n.read ? "bg-slate-50" : "bg-teal-50"} transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 ${n.read ? "bg-slate-300" : "bg-teal-500"} rounded-full mt-2 flex-shrink-0`}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm">
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {n.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {formatDate(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Admin Approval Modal dengan Preview Surat */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Persetujuan Cepat</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {pendingItems.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  Tidak ada item pending
                </p>
              ) : (
                pendingItems.map((item) => (
                  <div key={item.id} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-slate-800 text-sm">
                          {item.detail}
                        </span>
                        <p className="text-xs text-slate-500">
                          oleh {item.userName}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    {/* Tombol Lihat Bukti untuk payment */}
                    {item.type === "payment" && item.buktiName && (
                      <div className="mb-3">
                        <button
                          onClick={() => handleViewBukti(item.buktiName!)}
                          className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1 bg-teal-50 px-3 py-1.5 rounded-lg"
                        >
                          <Eye className="w-3 h-3" />
                          Lihat Bukti Transfer
                        </button>
                      </div>
                    )}

                    {/* Tombol Preview Surat untuk letter */}
                    {item.type === "letter" && item.dataSurat && (
                      <div className="mb-3">
                        <button
                          onClick={() => handlePreviewLetter(item)}
                          className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg"
                        >
                          <FileSearch className="w-3 h-3" />
                          Preview Surat
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(item)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReject(item)}
                        variant="destructive"
                        className="flex-1"
                      >
                        Tolak
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Gambar Bukti */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview Bukti Transfer</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center p-4">
            {previewImage && (
              <img
                src={previewImage}
                alt="Bukti Transfer"
                className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
              />
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setPreviewOpen(false)} variant="outline">
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Surat untuk Admin */}
      <Dialog open={previewLetterOpen} onOpenChange={setPreviewLetterOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-slate-200 flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-lg font-bold">
              Preview Surat Keterangan
            </DialogTitle>
            <div className="flex items-center gap-2 no-print">
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Download className="w-4 h-4 mr-1" /> Cetak / PDF
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[70vh] bg-slate-100 p-4">
            {selectedLetter && renderLetterPreview(selectedLetter)}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
