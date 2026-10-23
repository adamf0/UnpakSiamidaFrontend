import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { formatTanggalBulanTahun } from "../../../Common/Utils";

/**
 * Komponen Stempel Karet Fisik (Rubber Ink Stamp) Autentik
 * Mengimplementasikan tekstur tinta stempel, grunge border ganda, sudut inklinasi miring,
 * dan animasi bantingan stempel fisik (Slam-down stamp impact entrance) layaknya dicap beneran.
 */
export default function RubberStamp({
  status = "terverifikasi", // "terverifikasi" | "gagal" | "verifikasi" | "kosong"
  size = "md", // "sm" | "md" | "lg"
  customText,
  date,
  className = "",
  delay = 0.15,
}) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  // Format tanggal selalu 'tanggal nama bulan tahun' (contoh: '10 Mei 2025')
  const displayDate = date
    ? formatTanggalBulanTahun(date)
    : status === "terverifikasi"
    ? "SAH & MEMENUHI STANDAR"
    : status === "gagal"
    ? "PERLU REVISI / PERBAIKAN"
    : status === "verifikasi"
    ? "MENUNGGU EVALUASI AUDITOR"
    : "BERKAS BELUM DIUNGGAH";

  // Target sudut kemiringan khas cap stempel basah
  const targetRotation =
    status === "terverifikasi"
      ? -7
      : status === "gagal"
      ? 8
      : status === "verifikasi"
      ? -4
      : -10;

  // Warna tinta stempel
  const colorMap = {
    terverifikasi: "#059669",
    gagal: "#DC2626",
    verifikasi: "#0284C7",
    kosong: "#64748B",
  };
  const inkColor = colorMap[status] || colorMap.terverifikasi;

  // Variasi animasi hentakan / bantingan cap (Slam down stamp physics)
  const stampVariants = {
    initial: {
      scale: 2.6,
      opacity: 0,
      y: -28,
      rotate: targetRotation - 14,
      filter: "blur(4px)",
    },
    animate: {
      scale: [2.6, 0.94, 1.03, 1],
      opacity: [0, 0.95, 1, 1],
      y: [-28, 1, -0.5, 0],
      rotate: [targetRotation - 14, targetRotation + 2.5, targetRotation - 1, targetRotation],
      filter: ["blur(4px)", "blur(0px)", "blur(0px)", "blur(0px)"],
      transition: {
        duration: 0.42,
        delay,
        times: [0, 0.62, 0.82, 1],
        ease: ["easeIn", "easeOut", "easeOut"],
      },
    },
  };

  const renderContent = () => {
    if (status === "terverifikasi") {
      return (
        <div
          className={`relative border-2 border-dashed border-emerald-600 rounded-2xl flex flex-col items-center justify-center text-center tracking-wider font-black uppercase max-w-full ${
            isSm ? "px-2 py-1" : isLg ? "px-4 sm:px-5 py-2 sm:py-2.5 border-[3px]" : "px-3.5 py-1.5 border-[2.5px]"
          }`}
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            boxShadow: "inset 0 0 0 1px rgba(5, 150, 105, 0.35)",
          }}
        >
          <div className="flex items-center gap-1.5 opacity-90">
            <span className={isSm ? "text-[7px]" : isLg ? "text-[8.5px] sm:text-[9.5px]" : "text-[8px]"}>
              ★ LPMI UNPAK ★
            </span>
          </div>

          <div
            className={`font-black flex items-center gap-1.5 tracking-tight my-0.5 whitespace-nowrap ${
              isSm ? "text-[10px]" : isLg ? "text-sm sm:text-base tracking-wider" : "text-xs tracking-wider"
            }`}
          >
            <CheckCircle2 className={isSm ? "w-3 h-3" : isLg ? "w-4 h-4 sm:w-4.5 sm:h-4.5" : "w-3.5 h-3.5"} />
            <span>{customText || "TERVERIFIKASI"}</span>
          </div>

          <div
            className={`font-mono font-bold opacity-80 border-t border-emerald-600/40 w-full pt-0.5 whitespace-nowrap ${
              isSm ? "text-[6.5px]" : isLg ? "text-[8.5px] sm:text-[9.5px]" : "text-[7.5px]"
            }`}
          >
            {displayDate}
          </div>
        </div>
      );
    }

    if (status === "gagal") {
      return (
        <div
          className={`relative border-2 border-rose-600 rounded-xl flex flex-col items-center justify-center text-center tracking-wider font-black uppercase max-w-full ${
            isSm ? "px-2 py-1" : isLg ? "px-4 sm:px-5 py-2 sm:py-2.5 border-[3px]" : "px-3.5 py-1.5 border-[2.5px]"
          }`}
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.09)",
            boxShadow: "inset 0 0 0 1px rgba(220, 38, 38, 0.35)",
          }}
        >
          <div className="flex items-center gap-1 opacity-90">
            <span className={isSm ? "text-[6.5px]" : isLg ? "text-[8.5px] sm:text-[9.5px]" : "text-[7.5px]"}>
              ✖ TIM AUDITOR DOKUMEN ✖
            </span>
          </div>

          <div
            className={`font-black flex items-center gap-1.5 tracking-tight my-0.5 whitespace-nowrap ${
              isSm ? "text-[10px]" : isLg ? "text-sm sm:text-base tracking-wider" : "text-xs tracking-wider"
            }`}
          >
            <XCircle className={isSm ? "w-3 h-3" : isLg ? "w-4 h-4 sm:w-4.5 sm:h-4.5" : "w-3.5 h-3.5"} />
            <span>{customText || "GAGAL VERIFIKASI"}</span>
          </div>

          <div
            className={`font-mono font-bold opacity-80 border-t border-rose-600/40 w-full pt-0.5 whitespace-nowrap ${
              isSm ? "text-[6.5px]" : isLg ? "text-[8.5px] sm:text-[9.5px]" : "text-[7.5px]"
            }`}
          >
            {displayDate}
          </div>
        </div>
      );
    }

    if (status === "verifikasi") {
      return (
        <div
          className={`relative border-2 border-dashed border-sky-600 rounded-xl flex flex-col items-center justify-center text-center tracking-wider font-black uppercase max-w-full ${
            isSm ? "px-2 py-1" : isLg ? "px-4 sm:px-5 py-2 sm:py-2.5 border-[3px]" : "px-3.5 py-1.5 border-[2.5px]"
          }`}
          style={{
            backgroundColor: "rgba(2, 132, 199, 0.08)",
            boxShadow: "inset 0 0 0 1px rgba(2, 132, 199, 0.3)",
          }}
        >
          <div className="flex items-center gap-1 opacity-90">
            <span className={isSm ? "text-[6.5px]" : isLg ? "text-[8.5px] sm:text-[9.5px]" : "text-[7.5px]"}>
              SUBMISI BERKAS DUKUNG
            </span>
          </div>

          <div
            className={`font-black flex items-center gap-1.5 tracking-tight my-0.5 whitespace-nowrap ${
              isSm ? "text-[10px]" : isLg ? "text-sm sm:text-base tracking-wider" : "text-xs tracking-wider"
            }`}
          >
            <Clock className={isSm ? "w-3 h-3 animate-pulse" : isLg ? "w-4 h-4 sm:w-4.5 sm:h-4.5 animate-pulse" : "w-3.5 h-3.5 animate-pulse"} />
            <span>{customText || "BELUM DIVERIFIKASI"}</span>
          </div>

          <div
            className={`font-mono font-bold opacity-80 border-t border-sky-600/40 w-full pt-0.5 whitespace-nowrap ${
              isSm ? "text-[6.5px]" : isLg ? "text-[8.5px] sm:text-[9.5px]" : "text-[7.5px]"
            }`}
          >
            {displayDate}
          </div>
        </div>
      );
    }

    // Status "kosong" (Belum Ada Dokumen)
    return (
      <div
        className={`relative border-2 border-dashed border-gray-400 rounded-xl flex flex-col items-center justify-center text-center tracking-wider font-extrabold uppercase ${
          isSm ? "px-2 py-1" : isLg ? "px-5 py-2.5 border-2" : "px-3 py-1.5 border-2"
        }`}
        style={{
          backgroundColor: "rgba(241, 245, 249, 0.8)",
        }}
      >
        <div className="flex items-center gap-1 opacity-70">
          <span className={isSm ? "text-[6px]" : isLg ? "text-[8.5px]" : "text-[7px]"}>
            PORTOFOLIO KOSONG
          </span>
        </div>

        <div
          className={`font-black flex items-center gap-1 tracking-tight my-0.5 ${
            isSm ? "text-[9px]" : isLg ? "text-sm" : "text-[11px]"
          }`}
        >
          <AlertCircle className={isSm ? "w-2.5 h-2.5" : isLg ? "w-4 h-4" : "w-3 h-3"} />
          <span>{customText || "BELUM ADA DOKUMEN"}</span>
        </div>

        <div
          className={`font-mono opacity-70 border-t border-gray-400/40 w-full pt-0.5 ${
            isSm ? "text-[6px]" : isLg ? "text-[9px]" : "text-[7px]"
          }`}
        >
          BERKAS BELUM DIUNGGAH
        </div>
      </div>
    );
  };

  return (
    <motion.div
      variants={stampVariants}
      initial="initial"
      animate="animate"
      className={`relative inline-flex flex-col items-center justify-center select-none pointer-events-none ${className}`}
      style={{
        color: inkColor,
        filter: `drop-shadow(0 2px 4px ${inkColor}35)`,
        transformOrigin: "center center",
      }}
    >
      {/* SHOCKWAVE / INK IMPACT PULSE SAAT STEMPEL MENGHANTAM KERTAS */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: [0.85, 1.4], opacity: [0.6, 0] }}
        transition={{ duration: 0.38, delay: delay + 0.22, ease: "easeOut" }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: `2.5px solid ${inkColor}`,
        }}
      />

      {renderContent()}
    </motion.div>
  );
}
