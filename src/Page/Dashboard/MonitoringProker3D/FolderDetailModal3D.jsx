import React, { useState } from "react";
import {
  X,
  FolderOpen,
  Folder,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
  Info,
} from "lucide-react";
import DocumentPaperSheet from "./DocumentPaperSheet";
import FileViewerModal from "./FileViewerModal";

/**
 * Modal Map Berkas Terbuka 3D (3D Manila Folder Interior View)
 * Menampilkan isi map portofolio: 4 kertas instrumen (SK, SOP, TOR, Laporan),
 * multi-versi, stempel verifikasi autentik, dan penampil berkas.
 */
export default function FolderDetailModal3D({
  open,
  onClose,
  folderData, // { index, title, shortCode, unitName, tahun, documents, totalFilled, isComplete, hasRejected, hasPending, folderColor }
}) {
  const [activeViewerDoc, setActiveViewerDoc] = useState(null);

  if (!open || !folderData) return null;

  const {
    index = 1,
    title = "Mata Program",
    shortCode = "MP-01",
    unitName = "Fakultas / Unit",
    tahun = "2025",
    documents = {},
    totalFilled = 0,
    isComplete = false,
    hasRejected = false,
    hasPending = false,
    isAllVerified = false,
    folderColor = { bg: "#D97706", accent: "#92400E", tabBg: "#F59E0B" },
  } = folderData;

  const documentCategories = ["SK", "SOP", "Proposal/TOR", "Laporan"].map(
    (key) => documents[key] || {
      key,
      label: key,
      shortLabel: key,
      hasDocument: false,
      versions: [],
      status: { key: "kosong", label: "Belum Ada Dokumen" },
    }
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          style={{
            backgroundColor: "#FDFBF7", // Warna kertas manila bagian dalam
            border: `3px solid ${folderColor.border || "#B45309"}`,
            boxShadow: `0 25px 60px -15px rgba(0,0,0,0.4), 0 0 0 1px ${folderColor.accent}40`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* FOLDER TOP TAB & FLAP HEADER */}
          <div
            className="px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b relative select-none"
            style={{
              backgroundColor: folderColor.bg,
              borderColor: folderColor.accent,
            }}
          >
            {/* TAB LABEL CODE */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-white font-mono font-black text-sm shrink-0 shadow-inner">
                {shortCode}
              </div>

              <div className="min-w-0 text-white">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/25">
                    Portofolio Map #{index}
                  </span>
                  <span className="text-xs text-white/80 font-medium">
                    {unitName} • Tahun {tahun}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate max-w-2xl mt-0.5" title={title}>
                  {title}
                </h3>
              </div>
            </div>

            {/* STATUS BADGES & CLOSE BUTTON */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-black/20 text-white border border-white/15 text-xs font-bold">
                <FolderOpen className="w-4 h-4 text-amber-300" />
                <span>
                  Kelengkapan: <strong>{totalFilled}/4 Dokumen</strong>
                </span>
                {isComplete ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                title="Tutup Map Berkas"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* FOLDER SUB-HEADER / ARCHIVAL META STRIP */}
          <div className="px-6 py-3 bg-amber-950/5 border-b border-stone-200/90 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold text-stone-900">
                Kertas Berkas Portofolio:
              </span>
              <span className="text-stone-600">
                Klik salah satu lembaran kertas untuk melihat rincian isi berkas, catatan auditor, dan pratinjau file.
              </span>
            </div>

            {/* STATUS SUMMARY PILL */}
            <div className="flex items-center gap-2">
              {isAllVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Semua Berkas Terverifikasi
                </span>
              ) : hasRejected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Ada Berkas Perlu Revisi
                </span>
              ) : hasPending ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                  <Clock className="w-3.5 h-3.5" />
                  Menunggu Verifikasi Auditor
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-800 border border-stone-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Belum Lengkap ({totalFilled}/4)
                </span>
              )}
            </div>
          </div>

          {/* 4 DOCUMENT PAPER SHEETS GRID (SK, SOP, TOR, LAPORAN) */}
          <div className="p-5 sm:p-7 overflow-y-auto flex-1 bg-gradient-to-b from-stone-100/40 via-stone-50/20 to-stone-100/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 min-h-[460px]">
              {documentCategories.map((cat) => (
                <DocumentPaperSheet
                  key={cat.key}
                  docCategory={cat}
                  mataProgramTitle={title}
                  unitName={unitName}
                  tahun={tahun}
                  onOpenFile={(doc) => setActiveViewerDoc(doc)}
                />
              ))}
            </div>
          </div>

          {/* BOTTOM BAR / ARCHIVAL FOOTER */}
          <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-50/80 flex flex-wrap items-center justify-between text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-stone-700">
                Sistem Penjaminan Mutu Internal (SIAMIDA) — Arsip Dokumen Program Kerja
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-stone-200 hover:bg-stone-300 text-stone-800 transition cursor-pointer"
              >
                Tutup Map
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULL PREVIEW MODAL KETIKA DOKUMEN DIKLIK */}
      <FileViewerModal
        open={Boolean(activeViewerDoc)}
        onClose={() => setActiveViewerDoc(null)}
        docData={activeViewerDoc}
      />
    </>
  );
}
