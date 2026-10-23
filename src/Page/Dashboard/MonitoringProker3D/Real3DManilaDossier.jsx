import React, { useState } from "react";
import { Sparkles, Paperclip, FileText, CheckCircle2, AlertTriangle, Clock, AlertCircle } from "lucide-react";
import RubberStamp from "./RubberStamp";

/**
 * Komponen Map Berkas 3D Nyata (Real 3D Manila Dossier Folder)
 * Mereplikasi fisik map manila perkantoran dunia nyata:
 * - Cover belakang (back flap) lebih tinggi dengan tab label arsip timbul.
 * - Lembaran-lembaran kertas dokumen resmi menyembul (peeking out) dari dalam map.
 * - Penjepit kertas (paperclip) fisik menjepit kertas di bagian dalam.
 * - Cover depan (front flap) dengan lekukan potongan jari (thumb notch) dan label etiket map arsip.
 * - Efek kedalaman 3D (accordion gusset & spine thickness).
 * - Saat hover: map terangkat dari laci dan cover depan sedikit membuka memperlihatkan isi dokumen.
 */
export default function Real3DManilaDossier({
  dossier,
  unitName = "Unit",
  tahun = "2025",
  onClick,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    shortCode = "MP-01",
    index = 1,
    title = "Mata Program",
    totalFilled = 0,
    isComplete = false,
    documents = {},
    folderColor = { bg: "#D97706", accent: "#92400E", tabBg: "#F59E0B" },
  } = dossier;

  // Variasi warna map manila fisik (Klasik Kuning Manila, Merah Arsip, Biru Dekanat, Hijau Ordner, Cokelat Kraft)
  const folderPalettes = [
    {
      base: "#D97706",
      dark: "#92400E",
      light: "#FBBF24",
      highlight: "#FEF3C7",
      tab: "#B45309",
      accent: "#78350F",
    },
    {
      base: "#B91C1C",
      dark: "#7F1D1D",
      light: "#F87171",
      highlight: "#FEE2E2",
      tab: "#991B1B",
      accent: "#450A0A",
    },
    {
      base: "#1D4ED8",
      dark: "#1E3A8A",
      light: "#60A5FA",
      highlight: "#DBEAFE",
      tab: "#1E40AF",
      accent: "#172554",
    },
    {
      base: "#15803D",
      dark: "#14532D",
      light: "#4ADE80",
      highlight: "#DCFCE7",
      tab: "#166534",
      accent: "#052E16",
    },
    {
      base: "#C2410C",
      dark: "#7C2D12",
      light: "#FB923C",
      highlight: "#FFEDD5",
      tab: "#9A3412",
      accent: "#431407",
    },
  ];

  const palette = folderPalettes[index % folderPalettes.length];

  // Kertas-kertas yang ada di dalam map
  const skStatus = documents["SK"]?.status?.key || "kosong";
  const sopStatus = documents["SOP"]?.status?.key || "kosong";
  const torStatus = documents["Proposal/TOR"]?.status?.key || "kosong";
  const lapStatus = documents["Laporan"]?.status?.key || "kosong";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative cursor-pointer select-none transition-all duration-500 transform py-3 px-1"
      style={{
        perspective: "1200px",
        transform: isHovered
          ? "translateY(-18px) scale(1.03)"
          : "translateY(0) scale(1)",
      }}
      title={`Buka Map Berkas: ${title}`}
    >
      {/* 1. BAYANGAN JATUH DASAR LACI (DRAWER CONTACT SHADOW) */}
      <div
        className="absolute -bottom-2 inset-x-4 h-6 rounded-full bg-black/35 blur-md transition-all duration-500 -z-10"
        style={{
          transform: isHovered ? "scale(1.15) translateY(12px) opacity(0.45)" : "scale(1) translateY(0) opacity(0.25)",
        }}
      />

      {/* 2. BADAN MAP FISIK 3D (CONTAINER WITH 3D PRESERVE) */}
      <div
        className="relative w-full rounded-2xl transition-all duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isHovered ? "rotateX(8deg)" : "rotateX(0deg)",
        }}
      >
        {/* ================= A. COVER BELAKANG MAP (BACK FLAP & EMBOSSED TAB) ================= */}
        <div
          className="relative w-full h-[290px] rounded-2xl shadow-xl overflow-visible border-t border-l border-r"
          style={{
            backgroundColor: palette.base,
            borderColor: palette.light,
            // backgroundImage: `
            //   radial-gradient(${palette.dark} 0.75px, transparent 0.75px),
            //   linear-gradient(135deg, ${palette.light} 0%, ${palette.base} 40%, ${palette.dark} 100%)
            // `,
            // backgroundSize: "12px 12px, 100% 100%",
            boxShadow: `
              inset 0 2px 4px rgba(255,255,255,0.4),
              inset 0 -4px 8px rgba(0,0,0,0.35),
              0 12px 24px -6px rgba(0,0,0,0.3)
            `,
          }}
        >
          {/* TAB ARSIP TIMBUL DI BAGIAN ATAS (ARCHIVAL INDEX TAB WITH METAL CLIP) */}
          <div
            className="absolute -top-6 left-5 px-4 py-1 rounded-t-xl font-mono font-black text-xs text-white border-t-2 border-x-2 shadow-md flex items-center gap-1.5 transition-transform duration-300"
            style={{
              backgroundColor: palette.tab,
              borderColor: palette.highlight,
              transform: isHovered ? "translateY(-3px)" : "translateY(0)",
              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            }}
          >
            {/* Paku Rivet Tab Kuningan */}
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 border border-amber-800 shadow-xs"></span>
            <span>{shortCode}</span>
            <span className="text-[9px] text-amber-200 opacity-80">#{index}</span>
          </div>

          {/* INDIKATOR KELENGKAPAN BERKAS DI POJOK KANAN TAB BELAKANG */}
          <div className="absolute -top-5 right-5 px-2.5 py-0.5 rounded-t-lg bg-black/40 backdrop-blur-xs text-white text-[10px] font-mono font-bold border-t border-x border-white/20">
            {totalFilled}/4 BERKAS
          </div>
        </div>

        {/* ================= B. LEMBARAN KERTAS DOKUMEN MENYEMBUL (PEEKING DOCUMENTS) ================= */}
        {/* Kertas-kertas ini hanya tampil bila ada berkas yang terunggah (totalFilled > 0) */}
        {totalFilled > 0 && (
          <div
            className="absolute inset-x-4 top-2 h-[265px] transition-all duration-500 overflow-hidden"
            style={{
              transform: isHovered ? "translateY(-14px)" : "translateY(0)",
            }}
          >
            {/* KERTAS 3: LAPORAN (Paling belakang, miring sedikit ke kanan) */}
            <div
              className="absolute inset-x-2 top-2 h-[240px] bg-[#FAF8F5] rounded-t-lg border border-stone-300 shadow-sm transition-transform duration-500"
              style={{
                transform: isHovered ? "rotate(1.8deg) translateY(-8px)" : "rotate(0.8deg)",
              }}
            >
              <div className="p-2 border-b border-stone-200 flex items-center justify-between text-[8px] font-mono text-stone-400">
                <span>LAPORAN PELAKSANAAN</span>
                <span>{lapStatus.toUpperCase()}</span>
              </div>
            </div>

            {/* KERTAS 2: PROPOSAL / TOR (Di tengah, miring sedikit ke kiri) */}
            <div
              className="absolute inset-x-1.5 top-5 h-[235px] bg-[#FDFCF9] rounded-t-lg border border-stone-300 shadow-sm transition-transform duration-500"
              style={{
                transform: isHovered ? "rotate(-2deg) translateY(-5px)" : "rotate(-1deg)",
              }}
            >
              <div className="p-2 border-b border-stone-200 flex items-center justify-between text-[8px] font-mono text-stone-500">
                <span>PROPOSAL / TOR PROGRAM</span>
                <span>{torStatus.toUpperCase()}</span>
              </div>
            </div>

            {/* KERTAS 1: SURAT KEPUTUS (SK) UTAMA (Paling depan, tegak bersih dengan kop surat) */}
            <div
              className="absolute inset-x-0 top-8 h-[230px] bg-white rounded-t-lg border border-stone-300 shadow-md p-3.5 space-y-2 transition-all duration-500"
              style={{
                backgroundImage: "linear-gradient(to bottom, #FFFFFF 0%, #FAFAF9 100%)",
              }}
            >
              {/* PENJEPIT KERTAS METALIK DI POJOK KIRI ATAS KERTAS */}
              <div className="absolute -top-3 left-3 text-stone-400 drop-shadow-sm">
                <svg width="18" height="34" viewBox="0 0 18 34" fill="none">
                  <path
                    d="M 6,3 C 6,1.5 12,1.5 12,3 L 12,24 C 12,28 3,28 3,24 L 3,8 C 3,5 15,5 15,8 L 15,22"
                    stroke="#94A3B8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* KOP SURAT BERKAS RESMI DI DALAM MAP */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 ml-4">
                <div className="text-[8.5px] font-mono font-bold text-stone-600 uppercase tracking-tight">
                  SURAT KEPUTUS DEKANAT
                </div>
                <span className="text-[7.5px] font-mono px-1 rounded bg-stone-100 text-stone-500">
                  TAHUN {tahun}
                </span>
              </div>

              {/* GARIS-GARIS TEKS DOKUMEN MENYERUPAI DOKUMEN ASLI */}
              <div className="space-y-1.5 pt-1">
                <div className="h-2 w-3/4 bg-stone-200/80 rounded-sm"></div>
                <div className="h-1.5 w-full bg-stone-100 rounded-sm"></div>
                <div className="h-1.5 w-5/6 bg-stone-100 rounded-sm"></div>
              </div>

              {/* STEMPEL TINTA KECIL PADA DOKUMEN DI DALAM */}
              <div className="pt-2 flex justify-end">
                <div className="text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-600/50 text-emerald-700 bg-emerald-50/60 transform rotate-[-6deg]">
                  ✓ LPMI UNPAK
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= C. COVER DEPAN MAP (FRONT FLAP DENGAN LEKUKAN JARI & LABEL FISIK) ================= */}
        {/* Cover depan dibuat lebih rendah 48px agar lembaran kertas di dalamnya terlihat menyembul */}
        <div
          className="absolute inset-x-0 bottom-0 h-[215px] rounded-2xl border-t-2 border-l border-r border-b-4 transition-all duration-500 origin-bottom flex flex-col justify-between p-4"
          style={{
            backgroundColor: palette.base,
            borderColor: palette.highlight,
            borderBottomColor: palette.dark,
            // backgroundImage: `
            //   radial-gradient(${palette.dark} 0.75px, transparent 0.75px),
            //   linear-gradient(to bottom, ${palette.light} 0%, ${palette.base} 35%, ${palette.dark} 100%)
            // `,
            // backgroundSize: "12px 12px, 100% 100%",
            boxShadow: `
              inset 0 3px 6px rgba(255,255,255,0.45),
              inset 0 -4px 6px rgba(0,0,0,0.4),
              0 -4px 10px rgba(0,0,0,0.18)
            `,
            transform: isHovered
              ? "rotateX(-10deg) translateY(4px)"
              : "rotateX(0deg) translateY(0)",
          }}
        >
          {/* LEKUKAN POTONGAN JARI (THUMB CUTOUT NOTCH) DI TENGAH ATAS COVER DEPAN */}
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-transparent border-b-2 shadow-xs"
            style={{
              borderColor: palette.highlight,
              borderBottomLeftRadius: "16px",
              borderBottomRightRadius: "16px",
            }}
          />

          {/* LIPATAN PUNGGUNG MAP EMBOSS (CREASE FOLD LINE) */}
          <div className="absolute top-0 inset-x-4 h-[2px] bg-white/35"></div>

          {/* ================= D. LABEL ETIKET ARSIP FISIK PADA COVER DEPAN ================= */}
          <div
            className="relative bg-[#FFFDF7] rounded-xl p-3.5 border border-stone-300 shadow-md text-stone-900 space-y-2 mt-1"
            style={{
              backgroundImage: "radial-gradient(#E2E8F0 0.8px, transparent 0.8px)",
              backgroundSize: "10px 10px",
              boxShadow: "inset 0 1px 0 #FFFFFF, 0 3px 8px rgba(0,0,0,0.12)",
            }}
          >
            {/* Header Etiket: Unit & Tahun */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-1 text-[9px] font-mono text-stone-500">
              <span className="font-bold text-amber-800">{unitName}</span>
              <span>TAHUN {tahun}</span>
            </div>

            {/* Judul Mata Program Kerja */}
            <div className="min-h-[46px] flex flex-col justify-center">
              <p className="text-[9.5px] font-mono text-stone-400 font-bold uppercase tracking-wider">
                MATA PROGRAM #{index}
              </p>
              <h4
                className="text-xs font-black text-stone-950 leading-snug line-clamp-2 mt-0.5"
                title={title}
              >
                {title}
              </h4>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
