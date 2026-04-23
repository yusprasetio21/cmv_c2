"use client";

import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { LETTER_TYPES } from "@/lib/letter-types";
import { formatDate, getStatusBadgeClass, getStatusLabel } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
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
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ChevronRight,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

interface Letter {
  id: string;
  userId: string;
  jenisSurat: string;
  dataSurat: Record<string, string>;
  keperluan: string;
  status: string;
  nomorSurat: string | null;
  createdAt: string;
  userName: string;
}

export default function AdminSuratPage() {
  const { setPage, organization } = useAppStore();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [detailLetter, setDetailLetter] = useState<Letter | null>(null);
  const [configuring, setConfiguring] = useState(false);

  const hasLoaded = useRef(false);

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/letters");
      if (res.ok) {
        const data = await res.json();
        setLetters(
          data.map((l: Letter) => ({
            ...l,
            dataSurat:
              typeof l.dataSurat === "string"
                ? JSON.parse(l.dataSurat)
                : l.dataSurat,
            userName: l.user?.namaLengkap || "-",
          })),
        );
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    fetchLetters();
  }, []);

  const filteredLetters = letters.filter((l) =>
    filterStatus === "all" ? true : l.status === filterStatus,
  );

  const pendingCount = letters.filter((l) => l.status === "pending").length;

  const handleApprove = async (letter: Letter) => {
    // Generate nomor surat dari API counter
    let nomorSurat = "";
    try {
      const genRes = await fetch("/api/letter-numbering/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organization?.id }),
      });
      if (genRes.ok) {
        const genData = await genRes.json();
        nomorSurat = genData.nomorSurat;
      }
    } catch {
      /* fallback below */
    }

    // Fallback jika gagal generate
    if (!nomorSurat) {
      const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
      nomorSurat = `${num}/Sekrt-RT/${new Date().getFullYear()}`;
    }

    const res = await fetch(`/api/letters/${letter.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", nomorSurat }),
    });
    if (res.ok) {
      toast.success("Surat berhasil disetujui!");
      fetchLetters();
    } else {
      toast.error("Gagal menyetujui surat");
    }
  };

  const handleReject = async (letter: Letter) => {
    const res = await fetch(`/api/letters/${letter.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      toast.success("Surat ditolak");
      fetchLetters();
    } else {
      toast.error("Gagal menolak surat");
    }
  };

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
          <h2 className="text-xl font-bold text-slate-800">Kelola Surat</h2>
          <p className="text-sm text-slate-500">{letters.length} surat total</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-200">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-amber-700">Pending</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
          <p className="text-2xl font-bold text-emerald-600">
            {letters.filter((l) => l.status === "approved").length}
          </p>
          <p className="text-xs text-emerald-700">Disetujui</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
          <p className="text-2xl font-bold text-red-600">
            {letters.filter((l) => l.status === "rejected").length}
          </p>
          <p className="text-xs text-red-700">Ditolak</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[
          { value: "all", label: "Semua" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Disetujui" },
          { value: "rejected", label: "Ditolak" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filterStatus === f.value
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:border-teal-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Letter List */}
      <ScrollArea className="max-h-[calc(100vh-360px)]">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Memuat data...</p>
            </div>
          ) : filteredLetters.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">
              Tidak ada surat
            </p>
          ) : (
            filteredLetters.map((l) => {
              const lt = LETTER_TYPES.find((t) => t.id === l.jenisSurat);
              return (
                <div
                  key={l.id}
                  className="bg-white rounded-xl p-4 border border-slate-100"
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
                      <p className="text-xs text-slate-500">
                        Oleh: {l.userName}
                      </p>
                      <div className="flex items-center justify-between mt-1">
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
                    <button
                      onClick={() => setDetailLetter(l)}
                      className="p-2 hover:bg-slate-50 rounded-lg flex-shrink-0"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  {/* Quick action buttons for pending */}
                  {l.status === "pending" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(l)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReject(l)}
                        variant="destructive"
                        className="flex-1 rounded-xl"
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Tolak
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Detail Modal */}
      <Dialog open={!!detailLetter} onOpenChange={() => setDetailLetter(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Surat</DialogTitle>
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
                  <span className="text-slate-500">Pemohon</span>
                  <span className="font-medium">{detailLetter.userName}</span>
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
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm space-y-1 max-h-48 overflow-y-auto">
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
              {detailLetter.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => {
                      handleApprove(detailLetter);
                      setDetailLetter(null);
                    }}
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Setujui
                  </Button>
                  <Button
                    onClick={() => {
                      handleReject(detailLetter);
                      setDetailLetter(null);
                    }}
                    variant="destructive"
                    className="flex-1 py-3 font-semibold rounded-xl"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Tolak
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
