import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileCheck2,
  Image as ImageIcon,
  ExternalLink,
  Calendar,
  Clock,
  Download,
  Eye,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import RubberStamp from "./RubberStamp";
import FileViewerModal from "./FileViewerModal";
import { formatTanggalBulanTahun } from "@/Common/Utils";

/**
 * Modal Map Berkas Terbuka dengan Dokumen yang di-Clip & Kertas yang Bisa Dilipat (Kiri / Kanan)
 * Mengimplementasikan:
 * 1. Penjepit kertas fisik (paperclip/binder clip) di atas tumpukan dokumen.
 * 2. Navigasi lipat pindah kertas (kiri / kanan) dengan animasi 3D paper curl & fold.
 * 3. Tanggal pengajuan dan cap status pengajuan fisik (Rubber Stamp) pada setiap lembar kertas.
 * 4. Pembaca file (PDF, Word, Excel, Gambar).
 */
export default function ClippedDossierFolderModal({
  open,
  onClose,
  folderData, // { index, title, shortCode, unitName, tahun, documents, totalFilled, isComplete, folderColor }
}) {
  const [activeSheetIdx, setActiveSheetIdx] = useState(0); // Index kategori aktif (0: SK, 1: SOP, 2: TOR, 3: Laporan)
  const [activeVersionIdx, setActiveVersionIdx] = useState(0); // Index kertas/versi di dalam kategori aktif
  const [activeViewerDoc, setActiveViewerDoc] = useState(null);
  const [foldDirection, setFoldDirection] = useState("next"); // "next" | "prev"

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
    folderColor = { bg: "#D97706", accent: "#92400E", tabBg: "#F59E0B" },
  } = folderData;

  // Daftar 4 kategori dokumen yang di-clip
  const sheetCategories = [
    {
      key: "SK",
      code: "01",
      title: "Surat Keputusan (SK)",
      subTitle: "Legalitas Pelaksanaan Program Kerja Dekanat/Rektorat",
      data: documents["SK"] || { hasDocument: false, versions: [], status: { key: "kosong" } },
    },
    {
      key: "SOP",
      code: "02",
      title: "Standar Operasional Prosedur (SOP)",
      subTitle: "Prosedur Baku Pelaksanaan Mutu & Alur Kerja",
      data: documents["SOP"] || { hasDocument: false, versions: [], status: { key: "kosong" } },
    },
    {
      key: "Proposal/TOR",
      code: "03",
      title: "Proposal / Term of Reference (TOR)",
      subTitle: "Kerangka Acuan Kerja, Rincian Anggaran & Target IKU",
      data: documents["Proposal/TOR"] || { hasDocument: false, versions: [], status: { key: "kosong" } },
    },
    {
      key: "Laporan",
      code: "04",
      title: "Laporan Kegiatan & Realisasi",
      subTitle: "Laporan Pertanggungjawaban Akhir, SPJ & Bukti Dokumentasi",
      data: documents["Laporan"] || { hasDocument: false, versions: [], status: { key: "kosong" } },
    },
  ];

  const currentSheet = sheetCategories[activeSheetIdx] || sheetCategories[0];
  const currentVersions = currentSheet.data.versions || [];
  const primaryVersion = currentVersions[activeVersionIdx] || currentVersions[0] || null;
  const hasFile = currentSheet.data.hasDocument && primaryVersion;

  // Tanggal pengajuan tercetak (format tanggal nama bulan tahun, contoh: "10 Mei 2025")
  const rawTanggal = primaryVersion?.tanggalUpload || (hasFile ? `14 Maret ${tahun}` : null);
  const tanggalPengajuan = rawTanggal ? formatTanggalBulanTahun(rawTanggal) : null;

  // Status cap stempel
  const statusKey = hasFile
    ? primaryVersion.statusKey || currentSheet.data.status?.key || "verifikasi"
    : "kosong";

  // Fungsi navigasi lipat kertas
  const handleNextSheet = () => {
    if (activeSheetIdx < sheetCategories.length - 1) {
      setFoldDirection("next");
      setActiveSheetIdx((prev) => prev + 1);
      setActiveVersionIdx(0);
    }
  };

  const handlePrevSheet = () => {
    if (activeSheetIdx > 0) {
      setFoldDirection("prev");
      setActiveSheetIdx((prev) => prev - 1);
      setActiveVersionIdx(0);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "pdf":
        return <FileText className="w-5 h-5 text-rose-600" />;
      case "excel":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case "word":
        return <FileCheck2 className="w-5 h-5 text-blue-600" />;
      case "image":
        return <ImageIcon className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
          style={{
            backgroundColor: "#FAF6EE", // Tekstur dalam manila folder
            border: `3px solid ${folderColor.border || "#B45309"}`,
            boxShadow: `0 25px 60px -15px rgba(0,0,0,0.5), 0 0 0 1px ${folderColor.accent}40`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. TOP TAB & FLAP HEADER MAP MANILA */}
          <div
            className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b select-none"
            style={{
              backgroundColor: folderColor.bg,
              borderColor: folderColor.accent,
            }}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-white font-mono font-black text-sm shrink-0 shadow-inner">
                {shortCode}
              </div>
              <div className="text-white min-w-0">
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

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/20 text-white border border-white/15 text-xs font-bold">
                <FolderOpen className="w-4 h-4 text-amber-300" />
                <span>
                  Kelengkapan: <strong>{totalFilled}/4 Dokumen</strong>
                </span>
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

          {/* 2. BODY WORKBENCH (KATEGORI HORIZONTAL & LEMBARAN KERTAS BERCLIP) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-gradient-to-br from-[#FAF6EE] via-[#F5EFE0] to-[#EFE7D3]">
            {/* TAB KATEGORI DOKUMEN HORIZONTAL (RESPONSIF: 4 TAB BERDAMPINGAN) */}
            <div className="px-3 sm:px-6 py-2.5 bg-stone-200/70 border-b border-stone-300/80 shrink-0 select-none">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-5xl mx-auto">
                {sheetCategories.map((sheet, idx) => {
                  const isSelected = activeSheetIdx === idx;
                  const sheetDoc = sheet.data;
                  const isFilled = sheetDoc.hasDocument;
                  const sheetStatus = sheetDoc.status?.key || "kosong";
                  const paperCount =
                    sheetDoc.versions?.length ||
                    (sheetDoc.total > 0 ? sheetDoc.total : isFilled ? 1 : 0);

                  return (
                    <button
                      key={sheet.key}
                      type="button"
                      onClick={() => {
                        setFoldDirection(idx > activeSheetIdx ? "next" : "prev");
                        setActiveSheetIdx(idx);
                        setActiveVersionIdx(0);
                      }}
                      className={`px-2.5 sm:px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 sm:gap-2 shadow-2xs ${
                        isSelected
                          ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-400/50 text-stone-900 font-bold"
                          : "bg-white/60 hover:bg-white/90 border-stone-300/70 text-stone-700 hover:text-stone-900"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg text-[9.5px] sm:text-[10px] font-mono font-black flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-amber-600 text-white shadow-2xs"
                              : "bg-stone-200 text-stone-700"
                          }`}
                        >
                          {sheet.code}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black truncate">{sheet.key}</span>
                      </div>

                      {/* STATUS BULLET & JUMLAH KERTAS */}
                      <div className="shrink-0 flex items-center gap-1 sm:gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sheetStatus === "terverifikasi"
                              ? "bg-emerald-500"
                              : sheetStatus === "gagal"
                              ? "bg-rose-500"
                              : sheetStatus === "verifikasi"
                              ? "bg-blue-500"
                              : "bg-stone-300"
                          }`}
                          title={`Status: ${sheetStatus}`}
                        />
                        <span className="text-[9.5px] sm:text-[10px] font-mono font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 whitespace-nowrap">
                          {paperCount} Kertas
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AREA DOKUMEN BERKAS BERCLIP (WORKBENCH AREA PENUH & RESPONSIF) */}
            <div className="flex-1 p-3 sm:p-6 lg:p-8 flex flex-col items-center justify-start overflow-y-auto min-h-0 relative">
              <div className="w-full max-w-4xl relative my-auto py-2">
                {/* PENJEPIT KERTAS METALIK (REALISTIC STEEL PAPERCLIP) DI BAGIAN ATAS KERTAS */}
                <div className="absolute -top-4 inset-x-0 mx-auto w-fit z-30 pointer-events-none drop-shadow-md">
                  <svg
                    width="36"
                    height="58"
                    viewBox="0 0 36 58"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Bayangan Klip Logam */}
                    <path
                      d="M 11,5 C 11,2 25,2 25,5 L 25,44 C 25,51 9,51 9,44 L 9,14 C 9,9 21,9 21,14 L 21,38"
                      stroke="rgba(0,0,0,0.25)"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Batang Kawat Baja Perak Mengkilap */}
                    <path
                      d="M 13,5 C 13,2 27,2 27,5 L 27,44 C 27,51 11,51 11,44 L 11,14 C 11,9 23,9 23,14 L 23,38"
                      stroke="#94A3B8"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Highlight Kilau Cahaya Baja */}
                    <path
                      d="M 13,5 C 13,2 27,2 27,5 L 27,44 C 27,51 11,51 11,44 L 11,14 C 11,9 23,9 23,14 L 23,38"
                      stroke="#F8FAFC"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* EFEK TUMPUKAN LEMBARAN KERTAS LAPISAN DI BAWAHNYA (STACKED PAPER SHEETS) */}
                {currentVersions.length > 1 && (
                  <>
                    <div
                      className="absolute inset-x-2 -bottom-2.5 h-full bg-[#FAF7F0] border border-stone-300/80 rounded-2xl shadow-md -z-10 transition-transform duration-300"
                      style={{ transform: "rotate(1.2deg)" }}
                    />
                    {currentVersions.length > 2 && (
                      <div
                        className="absolute inset-x-4 -bottom-4.5 h-full bg-[#F5F2E9] border border-stone-300/60 rounded-2xl shadow-sm -z-20 transition-transform duration-300"
                        style={{ transform: "rotate(-1.8deg)" }}
                      />
                    )}
                  </>
                )}

                {/* LEMBARAN KERTAS DOKUMEN AKTIF DENGAN GESTURE DRAG DARI BAWAH KE ATAS */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeSheetIdx}-${activeVersionIdx}`}
                    initial={{
                      opacity: 0,
                      scale: 0.96,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.94,
                      y: -30,
                      rotate: 1.5,
                      transition: { duration: 0.22, ease: "easeInOut" },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 28,
                    }}
                    style={{
                      transformOrigin: "bottom right",
                      perspective: 1200,
                      backgroundImage: `
                        radial-gradient(#E2E8F0 1px, transparent 1px),
                        linear-gradient(to bottom, #FFFFFF 95%, #FAF9F6 100%)
                      `,
                      backgroundSize: "20px 20px, 100% 100%",
                    }}
                    className="w-full bg-[#FFFFFF] rounded-2xl border border-stone-300 px-6 sm:px-8 pb-6 sm:pb-8 pt-11 sm:pt-12 shadow-xl relative flex flex-col justify-between min-h-[430px] select-none"
                  >
                    {/* HEADER KOP KERTAS RESMI */}
                    <div>
                      <div className="flex items-start justify-between pb-4 border-b-2 border-stone-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                            {currentSheet.code}
                          </div>
                          <div>
                            <p className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-widest">
                              UNIVERSITAS PAKUAN • LEMBAGA PENJAMINAN MUTU (LPMI)
                            </p>
                            <h4 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                              {currentSheet.title}
                            </h4>
                            <p className="text-[11px] text-stone-600">
                              {currentSheet.subTitle}
                            </p>
                          </div>
                        </div>

                        {/* STIKER TANGGAL PENGAJUAN RESMI */}
                        <div className="text-right shrink-0">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-mono text-xs font-bold shadow-2xs">
                            <Calendar className="w-3.5 h-3.5 text-amber-700" />
                            <span>
                              {tanggalPengajuan
                                ? `Tgl Pengajuan: ${tanggalPengajuan}`
                                : "Status: Belum Diajukan"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BADAN KERTAS DOKUMEN & CAP STATUS PENGAJUAN */}
                      <div className="py-5 sm:py-6 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
                        {/* INFORMASI BERKAS YANG DIUNGGAH */}
                        <div className="w-full md:flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-500 uppercase">
                              Mata Program:
                            </span>
                            <span className="text-xs font-extrabold text-stone-900">
                              {title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-500 uppercase">
                              Unit Pengaju:
                            </span>
                            <span className="text-xs font-semibold text-stone-800">
                              {unitName}
                            </span>
                          </div>

                          {hasFile ? (
                            <div
                              onPointerDownCapture={(e) => e.stopPropagation()}
                              onClick={() =>
                                setActiveViewerDoc({
                                  ...primaryVersion,
                                  docType: currentSheet.key,
                                  mataProgram: title,
                                  unitName,
                                  tahun,
                                })
                              }
                              className="p-4 rounded-2xl bg-stone-50 hover:bg-amber-50/60 border border-stone-200 hover:border-amber-400 transition-all cursor-pointer space-y-2 group shadow-2xs"
                              title="Klik untuk membuka / pratinjau berkas (PDF, Word, Excel, Gambar)"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs group-hover:scale-105 transition-transform">
                                    {getFileIcon(primaryVersion?.fileType)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-xs font-black text-stone-900 group-hover:text-amber-900 truncate">
                                        {primaryVersion?.file || "Dokumen_Program_Kerja.pdf"}
                                      </h5>
                                      {primaryVersion?.version && (
                                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                          {primaryVersion.version}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                                      Ukuran: {primaryVersion?.ukuran || "1.8 MB"} • Pengunggah:{" "}
                                      {primaryVersion?.uploader || "Tata Usaha"}
                                    </p>
                                  </div>
                                </div>
                                <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-100/80 p-2 rounded-lg border border-amber-300/80 group-hover:bg-amber-600 group-hover:text-white transition shrink-0">
                                  <Eye className="w-4 h-4" />
                                </span>
                              </div>

                              {primaryVersion?.catatan && (
                                <div className="text-[11px] text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200/80 leading-relaxed">
                                  <span className="font-bold text-stone-800">Catatan Auditor: </span>
                                  {primaryVersion.catatan}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-6 rounded-2xl bg-stone-50 border border-dashed border-stone-300 text-center space-y-1">
                              <FileText className="w-8 h-8 text-stone-300 mx-auto" />
                              <p className="text-xs font-bold text-stone-600">
                                Belum Ada Berkas yang Diunggah
                              </p>
                              <p className="text-[10px] text-stone-400">
                                Unit belum melampirkan berkas {currentSheet.key} untuk mata program ini.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* CAP STATUS PENGAJUAN (AUTHENTIC RUBBER STAMP) */}
                        <div className="shrink-0 flex flex-col items-center justify-center p-2 sm:p-3 pointer-events-none select-none max-w-full lg:mr-3">
                          <p className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest mb-1 text-center">
                            CAP AUDIT RESMI
                          </p>
                          <RubberStamp
                            key={`${statusKey}-${tanggalPengajuan}-${activeVersionIdx}`}
                            status={statusKey}
                            size="lg"
                            date={tanggalPengajuan || "BELUM DIAJUKAN"}
                            delay={0.2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* FOOTER KERTAS */}
                    <div className="pt-3 border-t border-stone-200 flex items-center justify-between relative z-10">
                      <div className="text-[10px] sm:text-[11px] text-stone-400 font-mono">
                        Dokumen Portofolio Resmi Mutu • Universitas Pakuan
                      </div>
                      {currentVersions.length > 1 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVersionIdx((prev) => (prev + 1) % currentVersions.length);
                          }}
                          className="cursor-pointer text-[10px] sm:text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 pr-14 select-none"
                          title={`Klik untuk melipat ke Kertas Versi ${
                            currentVersions[(activeVersionIdx + 1) % currentVersions.length]?.version || "berikutnya"
                          }`}
                        >
                          <span className="hidden sm:inline">Kertas Berikutnya</span>
                          <span className="text-amber-800 font-mono">({activeVersionIdx + 1}/{currentVersions.length})</span>
                          <span className="text-amber-600 font-black">↗</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
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
