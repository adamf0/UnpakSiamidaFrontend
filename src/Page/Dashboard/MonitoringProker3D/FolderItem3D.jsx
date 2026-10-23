import React from "react";
import {
  Folder,
  FolderOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

/**
 * Komponen Fisik Map Berkas 3D (Physical Manila Folder Item)
 * Dirancang dengan estetika skeuomorfik modern anti AI-slop:
 * - Tab indeks folder menonjol di bagian atas
 * - Stempel/plakat label putih tertempel di sampul depan
 * - Ikon rivets kuningan pengikat berkas
 * - 4 mini status dot/pill untuk SK, SOP, TOR, Laporan
 * - Hover 3D perspective lift & shadow cast
 */
export default function FolderItem3D({
  folder, // { index, title, shortCode, unitName, tahun, documents, totalFilled, isComplete, hasRejected, hasPending, folderColor }
  onOpen,
  layoutMode = "shelf", // "shelf" | "stack"
}) {
  const {
    index,
    title,
    shortCode,
    unitName,
    tahun,
    documents = {},
    totalFilled,
    isComplete,
    hasRejected,
    hasPending,
    folderColor,
  } = folder;

  const docKeys = ["SK", "SOP", "Proposal/TOR", "Laporan"];

  return (
    <div
      onClick={() => onOpen(folder)}
      className="group relative cursor-pointer select-none transition-all duration-300 transform perspective-1000 hover:-translate-y-2 hover:scale-[1.015]"
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      {/* 3D FOLDER TAB DI BAGIAN ATAS-KIRI */}
      <div
        className="w-32 h-6 rounded-t-xl px-3 flex items-center justify-between text-[11px] font-mono font-black text-white shadow-xs transition-all relative z-10"
        style={{
          backgroundColor: folderColor.tabBg || folderColor.bg,
          clipPath: "polygon(0 0, 85% 0, 100% 100%, 0 100%)",
        }}
      >
        <span className="tracking-wider">{shortCode}</span>
        <span className="text-[9px] opacity-80 mr-3">#{index}</span>
      </div>

      {/* BODY UTAMA SAMPUL MAP BERKAS MANILA */}
      <div
        className="relative rounded-2xl rounded-tl-none p-5 sm:p-6 text-white overflow-hidden border transition-all duration-300"
        style={{
          backgroundColor: folderColor.bg,
          borderColor: folderColor.border || folderColor.accent,
          boxShadow:
            "0 12px 28px -8px rgba(0,0,0,0.28), 0 4px 10px -2px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.25)",
        }}
      >
        {/* LOGO AIRMARK EMBOSS KUNINGAN UNIVERSITAS PAKUAN */}
        <div
          className="absolute -right-6 -bottom-8 w-44 h-44 rounded-full border-[10px] border-white/10 pointer-events-none flex items-center justify-center font-black text-white/5 text-4xl uppercase select-none"
          style={{ transform: "rotate(-25deg)" }}
        >
          LPMI
        </div>

        {/* BRASS RIVET / MATA AYAM PENGIKAT DOKUMEN DI SEBELAH KIRI */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-8 opacity-40">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-200 border border-amber-900 shadow-inner"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-200 border border-amber-900 shadow-inner"></span>
        </div>

        {/* PLAKAT LABEL PUTIH TERTEMPEL (WHITE ADHESIVE DOSSIER LABEL) */}
        <div className="ml-3 bg-[#FAF8F5] rounded-xl p-4 text-stone-900 shadow-sm border border-stone-300/80 relative space-y-2.5 transition-transform group-hover:scale-[1.01]">
          {/* HEADER PLAKAT */}
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
            <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">
              {unitName} • {tahun}
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-bold text-stone-600">
                {totalFilled}/4 Berkas
              </span>
            </div>
          </div>

          {/* JUDUL MATA PROGRAM */}
          <h4
            className="text-sm sm:text-base font-extrabold text-stone-900 leading-snug line-clamp-2"
            title={title}
          >
            {title}
          </h4>

          {/* 4 MINI INDIKATOR DOKUMEN (SK, SOP, TOR, LAPORAN) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {docKeys.map((key) => {
              const doc = documents[key];
              const status = doc?.status?.key || "kosong";

              let bgClass = "bg-[#777] text-white"; // abu-abu kosong
              let label = "Kosong";

              if (status === "terverifikasi") {
                bgClass = "bg-[#26b99a] text-white"; // hijau
                label = "Valid";
              } else if (status === "gagal") {
                bgClass = "bg-[#e24444] text-white"; // merah
                label = "Gagal";
              } else if (status === "verifikasi") {
                bgClass = "bg-[#0084d1] text-white"; // biru
                label = "Review";
              }

              return (
                <div
                  key={key}
                  className={`rounded-lg py-1 px-1 text-center transition-transform ${bgClass}`}
                  title={`${key}: ${doc?.status?.label || "Belum Ada Dokumen"}`}
                >
                  <p className="text-[9px] font-black uppercase tracking-tight leading-none">
                    {key === "Proposal/TOR" ? "TOR" : key}
                  </p>
                  <p className="text-[8px] opacity-90 mt-0.5 leading-none">
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER CALL-TO-ACTION MAP */}
        <div className="ml-3 mt-3 flex items-center justify-between text-xs text-white/90">
          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            <Folder className="w-3.5 h-3.5 opacity-80" />
            <span>Klik untuk membuka map</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/20 text-white text-[11px] font-bold group-hover:bg-white group-hover:text-stone-900 transition-colors shadow-2xs">
            <span>Buka</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
