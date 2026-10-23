import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Key,
  Folder,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  RotateCcw,
  Layers,
  ArrowLeft,
  Lock,
} from "lucide-react";
import ClippedDossierFolderModal from "./ClippedDossierFolderModal";
import Real3DManilaDossier from "./Real3DManilaDossier";

/**
 * Komponen Lemari Berkas 3D (Archive Filing Cabinet View)
 * Tampilan laci lemari arsip fisik yang terbuka setelah dibuka oleh kunci unik unit.
 * Di dalam lemari ini berjejer rapi map-map mata program kerja (Dossier Folders).
 */
export default function ArchiveCabinetView({
  dossiers = [],
  unit,
  tahun = "2025",
  onLockAndReturn, // Callback untuk mengunci kembali lemari dan kembali ke rak kunci
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState(null);

  const unitName = unit?.Nama || unit?.nama || "Fakultas / Unit";

  // Filter Mata Program di Dalam Lemari
  const filteredDossiers = useMemo(() => {
    let result = [...dossiers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.shortCode.toLowerCase().includes(q) ||
          String(f.index).includes(q)
      );
    }

    if (statusFilter === "complete") {
      result = result.filter((f) => f.isComplete);
    } else if (statusFilter === "rejected") {
      result = result.filter((f) => f.hasRejected);
    } else if (statusFilter === "pending") {
      result = result.filter((f) => f.hasPending);
    } else if (statusFilter === "incomplete") {
      result = result.filter((f) => !f.isComplete);
    }

    return result;
  }, [dossiers, searchQuery, statusFilter]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = dossiers.length;
    const complete = dossiers.filter((d) => d.isComplete).length;
    const withRejected = dossiers.filter((d) => d.hasRejected).length;
    const withPending = dossiers.filter((d) => d.hasPending).length;
    const incomplete = total - complete;

    return { total, complete, withRejected, withPending, incomplete };
  }, [dossiers]);

  return (
    <div className="">
      {/* 2. PENCARIAN & FILTER KELENGKAPAN MATA PROGRAM */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-stone-100/70 p-4 border border-stone-200/90 shadow-2xs">
        {/* INPUT PENCARIAN */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau nomor mata program di dalam lemari..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-stone-300 rounded-2xl focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition"
          />
        </div>

        {/* STATUS FILTER PILLS */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-stone-900 text-white shadow-2xs"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            Semua ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter("complete")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === "complete"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lengkap 4/4 ({stats.complete})</span>
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === "rejected"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Perlu Revisi ({stats.withRejected})</span>
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === "pending"
                ? "bg-sky-600 text-white shadow-2xs"
                : "bg-white text-sky-700 hover:bg-sky-50 border border-sky-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review ({stats.withPending})</span>
          </button>
          <button
            onClick={() => setStatusFilter("incomplete")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === "incomplete"
                ? "bg-stone-700 text-white shadow-2xs"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Belum Lengkap ({stats.incomplete})</span>
          </button>
        </div>
      </div>

      {/* 3. LACI LEMARI ARSIP BERKAS BERJEJER (3D FILING DRAWER COMPARTMENT) */}
      <div
        className="p-6 sm:p-8 border-stone-300 shadow-inner relative bg-stone-50/95 backdrop-blur-xs"
        // style={{
        //   backgroundColor: "#EDE6D9",
        //   backgroundImage: `
        //     radial-gradient(#D6C8B5 1.5px, transparent 1.5px),
        //     linear-gradient(to bottom, rgba(0,0,0,0.04), rgba(0,0,0,0.08))
        //   `,
        //   backgroundSize: "24px 24px, 100% 100%",
        // }}
      >
        {/* REL BESI LACI LEMARI ARSIP (FILING DRAWER STEEL RAILS) */}
        {/* <div className="absolute top-3 inset-x-8 h-2 bg-gradient-to-r from-stone-400 via-stone-300 to-stone-400 rounded-full shadow-inner opacity-60"></div> */}
        {/* <div className="absolute bottom-3 inset-x-8 h-2 bg-gradient-to-r from-stone-400 via-stone-300 to-stone-400 rounded-full shadow-inner opacity-60"></div> */}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-12 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-64 rounded-3xl bg-stone-300/60 shadow-sm" />
            ))}
          </div>
        ) : filteredDossiers.length === 0 ? (
          <div className="py-24 text-center text-stone-500 max-w-md mx-auto space-y-2">
            <FolderOpen className="w-12 h-12 text-stone-400 mx-auto mb-2 opacity-60" />
            <h4 className="font-bold text-stone-800 text-base">Tidak Ada Map Berkas</h4>
            <p className="text-xs text-stone-500">
              Tidak ditemukan mata program dengan kriteria pencarian ini di dalam lemari.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 relative z-10 pt-4 pb-6">
            {filteredDossiers.map((dossier) => (
              <Real3DManilaDossier
                key={dossier.id || dossier.shortCode}
                dossier={dossier}
                unitName={unitName}
                tahun={tahun}
                onClick={() => setSelectedFolder(dossier)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4. MODAL MAP TERBUKA DENGAN DOKUMEN DI-CLIP YANG BISA DILIPAT (KIRI/KANAN) */}
      <ClippedDossierFolderModal
        open={Boolean(selectedFolder)}
        onClose={() => setSelectedFolder(null)}
        folderData={selectedFolder}
      />
    </div>
  );
}
