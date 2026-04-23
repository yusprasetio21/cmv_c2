"use client";

import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { LETTER_TYPES, LETTER_FIELDS, LetterField } from "@/lib/letter-types";
import {
  formatDate,
  getStatusBadgeClass,
  getStatusLabel,
  getRomanMonth,
  formatDateLong,
} from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Eye,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Mail,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// RT Address - will use organization data when available
const DEFAULT_ADDRESS = {
  rt: "002",
  rw: "013",
  desa: "Pasireurih",
  kecamatan: "Tamansari",
  kabupaten: "Kabupaten Bogor",
  fullAddress:
    "Perumahan Ciapus Mountain View RT 002 RW 013 Desa Pasireurih Kecamatan Tamansari Kabupaten Bogor",
  shortAddress: "RT 002 RW 013 Desa Pasireurih",
  letterHeader: "KETUA RT 002 RW 013 DESA PASIREURIH",
  letterSubHeader: "KECAMATAN TAMANSARI - KABUPATEN BOGOR",
  letterLocation: "Bogor",
  stampText: "RT 002\nRW 013",
};

interface Letter {
  id: string;
  userId: string;
  jenisSurat: string;
  dataSurat: Record<string, string>;
  keperluan: string;
  status: string;
  nomorSurat: string | null;
  createdAt: string;
}

interface FamilyData {
  namaKk: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  agama: string;
  pekerjaan: string;
  noHp: string;
}

export default function SuratPage() {
  const { user, organization } = useAppStore();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [letters, setLetters] = useState<Letter[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<Letter | null>(null);
  const [detailLetter, setDetailLetter] = useState<Letter | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [letterConfig, setLetterConfig] = useState<{
    prefix: string;
    separator: string;
    formatTemplate: string;
    lastNumber: number;
  } | null>(null);

  const hasLoaded = useRef(false);
  useEffect(() => {
    if (hasLoaded.current || !user) return;
    hasLoaded.current = true;
    const loadData = async () => {
      const [lettersRes, familyRes] = await Promise.all([
        fetch(`/api/letters?userId=${user.id}`),
        fetch(`/api/family?userId=${user.id}`),
      ]);
      if (lettersRes.ok) {
        const data = await lettersRes.json();
        setLetters(
          data.map((l: Letter) => ({
            ...l,
            dataSurat:
              typeof l.dataSurat === "string"
                ? JSON.parse(l.dataSurat)
                : l.dataSurat,
          })),
        );
      }
      if (familyRes.ok) {
        const data = await familyRes.json();
        if (data) {
          setFamilyData({
            namaKk: data.namaKk || "",
            nik: data.nik || "",
            tempatLahir: data.tempatLahir || "",
            tanggalLahir: data.tanggalLahir || "",
            jenisKelamin: data.jenisKelamin || "",
            agama: data.agama || "",
            pekerjaan: data.pekerjaan || "",
            noHp: data.noHp || "",
          });
        }
      }

      // Fetch letter numbering config
      if (organization?.id) {
        const configRes = await fetch(
          `/api/letter-numbering?organization_id=${organization.id}`,
        );
        if (configRes.ok) {
          const config = await configRes.json();
          setLetterConfig(config);
        }
      }
    };
    loadData();
  }, [user, organization]);

  const selectType = (typeId: string) => {
    setSelectedType(typeId);
    setAutoFilled(false);

    // Auto-fill from family data if available
    if (familyData) {
      const fields = LETTER_FIELDS[typeId] || [];
      const autoData: Record<string, string> = {};

      for (const f of fields) {
        // Map family data fields to letter form fields
        if (f.field === "namaLengkap" && familyData.namaKk) {
          autoData.namaLengkap = familyData.namaKk;
        } else if (f.field === "namaKK" && familyData.namaKk) {
          autoData.namaKK = familyData.namaKk;
        } else if (f.field === "nik" && familyData.nik) {
          autoData.nik = familyData.nik;
        } else if (f.field === "tempatLahir" && familyData.tempatLahir) {
          autoData.tempatLahir = familyData.tempatLahir;
        } else if (f.field === "tanggalLahir" && familyData.tanggalLahir) {
          autoData.tanggalLahir = familyData.tanggalLahir;
        } else if (f.field === "jenisKelamin" && familyData.jenisKelamin) {
          autoData.jenisKelamin = familyData.jenisKelamin;
        } else if (f.field === "agama" && familyData.agama) {
          autoData.agama = familyData.agama;
        } else if (f.field === "pekerjaan" && familyData.pekerjaan) {
          autoData.pekerjaan = familyData.pekerjaan;
        }
      }

      if (Object.keys(autoData).length > 0) {
        setFormData(autoData);
        setAutoFilled(true);
      } else {
        setFormData({});
      }
    } else {
      setFormData({});
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreview = () => {
    if (!selectedType) return;
    const fields = LETTER_FIELDS[selectedType] || [];
    for (const f of fields) {
      if (f.required && !formData[f.field]) {
        toast.error(`Mohon isi: ${f.label}`);
        return;
      }
    }
    const letter: Letter = {
      id: "preview",
      userId: user?.id || "",
      jenisSurat: selectedType,
      dataSurat: {
        ...formData,
        alamat: organization?.addressFull || DEFAULT_ADDRESS.fullAddress,
      },
      keperluan: formData.keperluan || "",
      status: "preview",
      nomorSurat: null,
      createdAt: new Date().toISOString(),
    };
    setPreviewLetter(letter);
    setPreviewOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedType) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          jenisSurat: selectedType,
          dataSurat: JSON.stringify(formData),
          keperluan: formData.keperluan || "",
        }),
      });
      if (res.ok) {
        toast.success("Pengajuan surat berhasil dikirim!");
        setSelectedType(null);
        setFormData({});
        setAutoFilled(false);
        // Reload letters
        const res2 = await fetch(`/api/letters?userId=${user.id}`);
        if (res2.ok) {
          const data2 = await res2.json();
          setLetters(
            data2.map((l: Letter) => ({
              ...l,
              dataSurat:
                typeof l.dataSurat === "string"
                  ? JSON.parse(l.dataSurat)
                  : l.dataSurat,
            })),
          );
        }
      } else {
        toast.error("Gagal mengajukan surat");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const openHistoryPreview = (letter: Letter) => {
    setPreviewLetter(letter);
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    const printContent = document.getElementById("letter-document");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Surat Keterangan</title>
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
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .font-bold {
              font-weight: bold;
            }
            .underline {
              text-decoration: underline;
            }
            .border-b-2 {
              border-bottom: 2px solid black;
            }
            .border-b {
              border-bottom: 1px solid #ccc;
            }
            .mt-10 {
              margin-top: 40px;
            }
            .mb-1 {
              margin-bottom: 4px;
            }
            .mb-2 {
              margin-bottom: 8px;
            }
            .mb-3 {
              margin-bottom: 12px;
            }
            .mb-4 {
              margin-bottom: 16px;
            }
            .mb-5 {
              margin-bottom: 20px;
            }
            .mr-16 {
              margin-right: 64px;
            }
            .pb-3 {
              padding-bottom: 12px;
            }
            .pt-2 {
              padding-top: 8px;
            }
            .w-14 {
              width: 56px;
            }
            .h-14 {
              height: 56px;
            }
            .w-24 {
              width: 96px;
            }
            .h-16 {
              height: 64px;
            }
            .w-20 {
              width: 80px;
            }
            .h-20 {
              height: 80px;
            }
            .object-contain {
              object-fit: contain;
            }
            .inline-block {
              display: inline-block;
            }
            .mx-auto {
              margin-left: auto;
              margin-right: auto;
            }
            .relative {
              position: relative;
            }
            .absolute {
              position: absolute;
            }
            .-right-4 {
              right: -16px;
            }
            .bottom-0 {
              bottom: 0;
            }
            .opacity-80 {
              opacity: 0.8;
            }
            .gap-3 {
              gap: 12px;
            }
            .flex {
              display: flex;
            }
            .items-center {
              align-items: center;
            }
            .justify-center {
              justify-content: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              padding: 4px 0;
            }
            .w-40 {
              width: 160px;
            }
            .align-top {
              vertical-align: top;
            }
            .leading-relaxed {
              line-height: 1.5;
            }
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

  /**
   * Generate nomor surat preview berdasarkan konfigurasi
   */
  const generatePreviewNumber = (): string => {
    if (letterConfig) {
      const nextNum = (letterConfig.lastNumber || 0) + 1;
      const numPadded = String(nextNum).padStart(3, "0");
      const now = new Date();
      let preview = letterConfig.formatTemplate
        .replaceAll("{number}", numPadded)
        .replaceAll("{prefix}", letterConfig.prefix)
        .replaceAll("{separator}", letterConfig.separator)
        .replaceAll("{month}", String(now.getMonth() + 1))
        .replaceAll("{month_roman}", getRomanMonth(now.getMonth() + 1))
        .replaceAll("{year}", String(now.getFullYear()))
        .replaceAll("{year_short}", String(now.getFullYear()).slice(-2));
      return preview;
    }
    // Fallback hardcode
    const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    return `${num}/Sekrt-RT/${getRomanMonth(new Date().getMonth() + 1)}/${new Date().getFullYear()}`;
  };

  const renderFormField = (f: LetterField) => {
    const isAutoFilledField =
      autoFilled &&
      familyData &&
      [
        "namaLengkap",
        "namaKK",
        "nik",
        "tempatLahir",
        "tanggalLahir",
        "jenisKelamin",
        "agama",
        "pekerjaan",
      ].includes(f.field) &&
      formData[f.field];

    if (f.type === "select") {
      return (
        <div key={f.field}>
          <Label className="block text-sm font-medium text-slate-700 mb-2">
            {f.label}
            {f.required ? " *" : ""}
            {isAutoFilledField && (
              <span className="ml-1.5 inline-flex items-center text-[10px] text-teal-600 font-normal">
                <Sparkles className="w-3 h-3 mr-0.5" /> Otomatis
              </span>
            )}
          </Label>
          <select
            value={formData[f.field] || ""}
            onChange={(e) => handleFieldChange(f.field, e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl text-slate-800 ${isAutoFilledField ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-slate-200"}`}
          >
            <option value="">Pilih {f.label}</option>
            {f.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      );
    }
    if (f.type === "textarea") {
      return (
        <div key={f.field}>
          <Label className="block text-sm font-medium text-slate-700 mb-2">
            {f.label}
            {f.required ? " *" : ""}
          </Label>
          <Textarea
            value={formData[f.field] || ""}
            onChange={(e) => handleFieldChange(f.field, e.target.value)}
            placeholder={`Masukkan ${f.label.toLowerCase()}...`}
            rows={f.rows || 3}
            className="bg-slate-50 border-slate-200 rounded-xl resize-none"
          />
        </div>
      );
    }
    return (
      <div key={f.field}>
        <Label className="block text-sm font-medium text-slate-700 mb-2">
          {f.label}
          {f.required ? " *" : ""}
          {isAutoFilledField && (
            <span className="ml-1.5 inline-flex items-center text-[10px] text-teal-600 font-normal">
              <Sparkles className="w-3 h-3 mr-0.5" /> Otomatis
            </span>
          )}
        </Label>
        <Input
          type={f.type}
          value={formData[f.field] || ""}
          onChange={(e) => handleFieldChange(f.field, e.target.value)}
          placeholder={`Masukkan ${f.label.toLowerCase()}...`}
          className={`py-3 border rounded-xl ${isAutoFilledField ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-slate-200"}`}
        />
      </div>
    );
  };

  const renderLetterDocument = (letter: Letter) => {
    const typeName =
      LETTER_TYPES.find((t) => t.id === letter.jenisSurat)?.name ||
      letter.jenisSurat;
    const data = letter.dataSurat || {};
    const isApproved = letter.status === "approved";

    // Gunakan nomor surat asli jika sudah approved, atau generate preview dari config
    const displayNomorSurat =
      letter.status === "approved" && letter.nomorSurat
        ? letter.nomorSurat
        : generatePreviewNumber();

    // Use org data or fallback to defaults
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
          stampText: `RT ${organization.rtNumber}\nRW ${organization.rwNumber}`,
          ketuaRtName: organization.ketuaRtName,
          logoUrl: organization.logoUrl,
          stampUrl: organization.stampUrl,
          signatureUrl: organization.signatureUrl,
          name: organization.name,
        }
      : {
          ...DEFAULT_ADDRESS,
          ketuaRtName: "",
          logoUrl: null,
          stampUrl: null,
          signatureUrl: null,
          name: "",
        };

    const renderRows = () => {
      const common = [
        ["Nama Lengkap", data.namaLengkap || data.namaKK || "-"],
        ["NIK", data.nik || "-"],
        [
          "TTL",
          `${data.tempatLahir || "-"}, ${formatDateLong(data.tanggalLahir)}`,
        ],
      ];
      const extraMap: Record<string, string[][]> = {
        domisili: [
          ["Jenis Kelamin", data.jenisKelamin],
          ["Pekerjaan", data.pekerjaan],
          ["Agama", data.agama],
          ["Status", data.statusPerkawinan],
          ["WN", data.kewarganegaraan],
        ],
        nikah: [
          ["Jenis Kelamin", data.jenisKelamin],
          ["Agama", data.agama],
          ["Status", data.statusPerkawinan],
          ["Calon", data.namaCalon],
        ],
        sekolah: [
          ["Jenis Kelamin", data.jenisKelamin],
          ["Agama", data.agama],
          ["Orang Tua", data.namaOrangTua],
          ["Sekolah", data.namaSekolah],
        ],
        beasiswa: [
          ["Jenis Kelamin", data.jenisKelamin],
          ["Pendidikan", data.pendidikanTerakhir],
          ["Institusi", data.institusi],
          ["Program", data.programBeasiswa],
        ],
        kepolisian: [
          ["Jenis Kelamin", data.jenisKelamin],
          ["Pekerjaan", data.pekerjaan],
          ["Agama", data.agama],
          ["Status", data.statusPerkawinan],
        ],
        mutasi: [
          ["Jumlah Anggota", data.jumlahAnggota],
          ["Alamat Asal", data.alamatAsal],
          ["RT/RW Asal", `${data.rtAsal || "-"}/${data.rwAsal || "-"}`],
        ],
      };
      const all = [...common, ...(extraMap[letter.jenisSurat] || [])];
      return all.map((r, i) => (
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
      <div className="bg-white p-8 max-w-2xl mx-auto" id="letter-document">
        {/* ========== HEADER / KOP SURAT ========== */}
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
                {rtAddr.name?.toUpperCase() || ""}
              </p>
              <p className="text-xs font-bold tracking-wide">
                {rtAddr.letterHeader}
              </p>
              <p className="text-xs font-bold tracking-wide">
                {rtAddr.letterSubHeader}
              </p>
            </div>
          </div>
        </div>

        {/* Judul Surat */}
        <div className="text-center font-bold text-base underline mb-2">
          SURAT KETERANGAN {typeName.toUpperCase()}
        </div>
        <p className="text-center text-xs mb-4">No. {displayNomorSurat}</p>

        {/* Isi Surat */}
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
        </div>

        {/* ========== FOOTER / TANDA TANGAN ========== */}
        <div className="text-right mt-10">
          <p className="mr-16 mb-1 text-sm">
            {rtAddr.letterLocation}, {formatDateLong(new Date().toISOString())}
          </p>
          <p className="mr-16 mb-8 text-sm">
            Ketua RT {rtAddr.rt} RW {rtAddr.rw}
          </p>
          {isApproved ? (
            <div className="mr-16 inline-block relative">
              <p className="font-bold text-sm underline">
                (Tanda Tangan &amp; Stempel)
              </p>
              {rtAddr.signatureUrl && (
                <img
                  src={rtAddr.signatureUrl}
                  alt="TTD"
                  className="w-24 h-16 object-contain mt-1 mx-auto"
                />
              )}
              {rtAddr.stampUrl && (
                <img
                  src={rtAddr.stampUrl}
                  alt="Stempel"
                  className="w-20 h-20 object-contain absolute -right-4 bottom-0 opacity-80"
                />
              )}
              {!rtAddr.signatureUrl && !rtAddr.stampUrl && (
                <div className="mt-2 inline-flex w-24 h-24 border-4 border-blue-600 rounded-full items-center justify-center opacity-30 rotate-12">
                  <span className="text-blue-600 font-bold text-xs text-center">
                    RT {rtAddr.rt}
                    <br />
                    RW {rtAddr.rw}
                  </span>
                </div>
              )}
              <p className="text-sm font-medium mt-2">{rtAddr.ketuaRtName}</p>
            </div>
          ) : (
            <div className="mr-16 text-center text-slate-400 italic text-sm border-2 border-dashed border-slate-300 rounded-lg p-4 inline-block">
              <p>Tanda Tangan &amp; Stempel</p>
              <p className="text-xs">(Setelah disetujui)</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-5 py-6">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Pengajuan Surat</h2>
      <p className="text-sm text-slate-500 mb-6">Ajukan surat keterangan RT</p>

      {/* Auto-fill notice */}
      {familyData && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-4 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-teal-700">
              Data otomatis tersedia
            </p>
            <p className="text-[11px] text-teal-600">
              Data keluarga Anda akan otomatis mengisi kolom yang tersimpan.
              Anda tetap bisa mengubahnya.
            </p>
          </div>
        </div>
      )}

      {/* Letter Type Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {LETTER_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => selectType(t.id)}
            className={`p-4 bg-white rounded-2xl border-2 text-center transition-all active:scale-95 ${
              selectedType === t.id
                ? "border-teal-500 bg-teal-50"
                : "border-slate-200 hover:border-teal-300"
            }`}
          >
            <div
              className={`w-12 h-12 bg-${t.color}-100 rounded-xl flex items-center justify-center mx-auto mb-2`}
            >
              <span className="text-2xl">{t.icon}</span>
            </div>
            <span className="text-xs font-medium text-slate-700">{t.name}</span>
          </button>
        ))}
      </div>

      {/* Dynamic Form */}
      {selectedType && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 mb-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Form Pengajuan</h3>
            <Badge className="bg-teal-100 text-teal-700">
              {LETTER_TYPES.find((t) => t.id === selectedType)?.name}
            </Badge>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(LETTER_FIELDS[selectedType] || []).map(renderFormField)}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <Button
                type="button"
                onClick={handlePreview}
                variant="secondary"
                className="w-full py-3 font-semibold rounded-xl"
              >
                <Eye className="w-4 h-4 mr-2" /> Preview Surat
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
              >
                {submitting ? "Mengirim..." : "Ajukan Surat"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Letter History */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Riwayat Pengajuan</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {letters.length === 0 ? (
            <p className="text-center text-slate-500 py-4 text-sm">
              Belum ada pengajuan
            </p>
          ) : (
            letters.map((l) => {
              const lt = LETTER_TYPES.find((t) => t.id === l.jenisSurat);
              return (
                <button
                  key={l.id}
                  onClick={() => setDetailLetter(l)}
                  className="w-full text-left bg-white rounded-xl p-4 border border-slate-100 hover:border-teal-200 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{lt?.icon || "📄"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-800 text-sm">
                          {lt?.name || l.jenisSurat}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(l.status)}`}
                        >
                          {getStatusLabel(l.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {l.keperluan || "-"}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400">
                          {formatDate(l.createdAt)}
                        </span>
                        {l.nomorSurat && (
                          <span className="text-xs text-teal-600 font-medium">
                            No: {l.nomorSurat}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 border-b border-slate-200 flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-lg font-bold">
              Preview Surat
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
            {previewLetter && renderLetterDocument(previewLetter)}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!detailLetter} onOpenChange={() => setDetailLetter(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Pengajuan</DialogTitle>
          </DialogHeader>
          {detailLetter && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadgeClass(detailLetter.status)}`}
                >
                  {getStatusLabel(detailLetter.status)}
                </span>
                {detailLetter.nomorSurat && (
                  <span className="text-sm text-slate-500">
                    No: {detailLetter.nomorSurat}
                  </span>
                )}
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Jenis</span>
                  <span className="font-medium">
                    {
                      LETTER_TYPES.find((t) => t.id === detailLetter.jenisSurat)
                        ?.name
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal</span>
                  <span className="font-medium">
                    {formatDate(detailLetter.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Keperluan</span>
                  <span className="font-medium text-right max-w-[60%]">
                    {detailLetter.keperluan || "-"}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  Data Isian
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm space-y-1">
                  {Object.entries(detailLetter.dataSurat || {}).map(
                    ([k, v]) => (
                      <div
                        key={k}
                        className="flex py-1 border-b border-slate-100 last:border-0"
                      >
                        <span className="text-slate-500 w-1/3 capitalize">
                          {k.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="font-medium">{v || "-"}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
              {detailLetter.status === "approved" ? (
                <Button
                  onClick={() => {
                    openHistoryPreview(detailLetter);
                    setDetailLetter(null);
                  }}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
                >
                  <FileText className="w-4 h-4 mr-2" /> Lihat Dokumen
                </Button>
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  Menunggu persetujuan Ketua RT
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
