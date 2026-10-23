import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Layers,
  Sparkles,
  Folder,
  FolderOpen,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import FolderItem3D from "./FolderItem3D";
import FolderDetailModal3D from "./FolderDetailModal3D";

/**
 * Tampilan Tumpukan Map 3D Interaktif (Interactive 3D Dossier Archive)
 * Mengorganisasi seluruh mata program ke dalam tumpukan map fisik dengan pencarian instan,
 * filter status kelengkapan, dan transisi animasi 3D halus.
 */
export default function Dossier3DStackView({
  dossiers = [], // List hasil aggregateMataProgramDossiers
  unitName = "Fakultas / Unit",
  tahun = "2025",
  onOpenFilterDrawer, // Buka filter tahun & unit
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "complete" | "rejected" | "pending" | "incomplete"
  const [layoutMode, setLayoutMode] = useState("shelf"); // "shelf" | "stack"
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Pagination untuk tumpukan map
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = layoutMode === "stack" ? 8 : 12;

  // Filter Data
  const filteredDossiers = useMemo(() => {
    let result = [...dossiers];

    // Filter Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.shortCode.toLowerCase().includes(q) ||
          String(f.index).includes(q)
      );
    }

    // Filter Status
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

  // Pagination calculation
  const totalPages = Math.ceil(filteredDossiers.length / itemsPerPage) || 1;
  const paginatedDossiers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDossiers.slice(start, start + itemsPerPage);
  }, [filteredDossiers, currentPage, itemsPerPage]);

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
    <div className="space-y-6">
      {/* SEARCH BAR & STATUS FILTER PILLS */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-stone-50/80 p-4 rounded-3xl border border-stone-200 shadow-2xs">
        {/* INPUT PENCARIAN MATA PROGRAM */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau nomor mata program..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-stone-300 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
          />
        </div>

        {/* STATUS FILTER PILLS */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => {
              setStatusFilter("all");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-stone-900 text-white shadow-2xs"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            Semua ({stats.total})
          </button>

          <button
            onClick={() => {
              setStatusFilter("complete");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "complete"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lengkap 4/4 ({stats.complete})</span>
          </button>

          <button
            onClick={() => {
              setStatusFilter("rejected");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "rejected"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Perlu Revisi ({stats.withRejected})</span>
          </button>

          <button
            onClick={() => {
              setStatusFilter("pending");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "pending"
                ? "bg-sky-600 text-white shadow-2xs"
                : "bg-white text-sky-700 hover:bg-sky-50 border border-sky-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review ({stats.withPending})</span>
          </button>

          <button
            onClick={() => {
              setStatusFilter("incomplete");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "incomplete"
                ? "bg-stone-600 text-white shadow-2xs"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Belum Lengkap ({stats.incomplete})</span>
          </button>
        </div>

        {/* LAYOUT VIEW TOGGLE (STACK VS GRID) */}
        <div className="flex rounded-xl bg-stone-200/80 p-1 border border-stone-300">
          <button
            onClick={() => {
              setLayoutMode("shelf");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
              layoutMode === "shelf"
                ? "bg-white text-stone-900 shadow-2xs font-bold"
                : "text-stone-600 hover:text-stone-900"
            }`}
            title="Tampilan Lemari Arsip Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lemari Berkas</span>
          </button>
          <button
            onClick={() => {
              setLayoutMode("stack");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
              layoutMode === "stack"
                ? "bg-white text-stone-900 shadow-2xs font-bold"
                : "text-stone-600 hover:text-stone-900"
            }`}
            title="Tampilan Tumpukan Map 3D Bertumpuk"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tumpukan 3D</span>
          </button>
        </div>
      </div>

      {/* EMPTY SEARCH RESULT STATE */}
      {filteredDossiers.length === 0 ? (
        <div className="py-16 text-center bg-stone-50 rounded-3xl border border-stone-200 p-8 max-w-lg mx-auto">
          <Folder className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-900">
            Tidak Ditemukan Map Berkas
          </h4>
          <p className="text-xs text-stone-600 mt-1">
            Tidak ada mata program yang cocok dengan filter atau kata kunci "
            <strong>{searchQuery}</strong>".
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      ) : layoutMode === "stack" ? (
        /* ================= 1. TAMPILAN TUMPUKAN MAP 3D (3D CASCADE STACK) ================= */
        <div className="py-6 px-4 bg-gradient-to-b from-stone-100 via-stone-50 to-stone-100 rounded-3xl border border-stone-200/90 shadow-inner">
          <div className="mb-4 text-center">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              Tumpukan Map Arsip Portofolio ({filteredDossiers.length} Map Tersedia)
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Arahkan kursor atau klik map untuk mengangkat dan membukanya
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto pt-4">
            {paginatedDossiers.map((folder, fIdx) => (
              <div
                key={folder.uuid || folder.id || fIdx}
                className="transform transition-transform duration-300"
                style={{
                  transform: `rotate(${((fIdx % 3) - 1) * 1.5}deg)`,
                }}
              >
                <FolderItem3D
                  folder={folder}
                  onOpen={(f) => setSelectedFolder(f)}
                  layoutMode="stack"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ================= 2. TAMPILAN LEMARI BERKAS GRID (SHELF GRID) ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedDossiers.map((folder, fIdx) => (
            <FolderItem3D
              key={folder.uuid || folder.id || fIdx}
              folder={folder}
              onOpen={(f) => setSelectedFolder(f)}
              layoutMode="shelf"
            />
          ))}
        </div>
      )}

      {/* PAGINATION BAR */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs text-stone-600">
          <span>
            Menampilkan <strong>{paginatedDossiers.length}</strong> dari{" "}
            <strong>{filteredDossiers.length}</strong> mata program
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL BERKAS TERBUKA 3D */}
      <FolderDetailModal3D
        open={Boolean(selectedFolder)}
        onClose={() => setSelectedFolder(null)}
        folderData={selectedFolder}
      />
    </div>
  );
}
