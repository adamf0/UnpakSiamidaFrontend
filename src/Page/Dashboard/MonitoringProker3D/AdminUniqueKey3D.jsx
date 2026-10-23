import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Helper untuk memformat teks gantungan kunci sesuai permintaan:
 * format: [tipe] - [jenjang] [nama]
 * contoh:
 * - PRODI - S1 ILMU HUKUM
 * - PRODI - S2 ILMU MANAJEMEN
 * - FAKULTAS - HUKUM
 * - UNIT - BPSI
 */
export function formatKeychainTag(unit) {
  const type = (unit?.Type || unit?.type || "prodi").toUpperCase().trim();
  const jenjang = (unit?.Jenjang || unit?.jenjang || "").toUpperCase().trim();
  const rawName = (unit?.Nama || unit?.nama || "UNIT").trim();

  // Bersihkan redundansi jika nama sudah memuat kata "prodi" atau jenjang di dalamnya
  let cleanName = rawName
    .replace(/^Program Studi\s+/i, "")
    .replace(/^Prodi\s+/i, "")
    .replace(/^Fakultas\s+/i, "")
    .replace(/\s*\((s1|s2|s3|d4|d3|profesi|fakultas|unit)\)$/i, "")
    .trim()
    .toUpperCase();

  if (type === "PRODI") {
    if (jenjang) {
      return `PRODI - ${jenjang} ${cleanName}`;
    }
    return `PRODI - ${cleanName}`;
  } else if (type === "FAKULTAS") {
    return `FAKULTAS - ${cleanName}`;
  } else {
    return `UNIT - ${cleanName}`;
  }
}

/**
 * Konfigurasi material, gaya kepala kunci, pola gerigi, dan warna tag gantungan kunci
 */
export function getKeyConfig(unit, index = 0) {
  const unitId = unit?.ID || index + 1;
  const unitName = unit?.Nama || unit?.nama || "Unit";
  const unitType = (unit?.Type || unit?.type || "prodi").toLowerCase();
  const keychainLabel = formatKeychainTag(unit);

  const keyStyles = ["crown", "skeleton", "cyber", "baroque", "vault", "antique"];
  const keyStyle = keyStyles[unitId % keyStyles.length];

  const metalFinishes = [
    {
      name: "gold",
      primary: "#D97706",
      light: "#FDE68A",
      dark: "#78350F",
      rim: "#B45309",
      glow: "rgba(245, 158, 11, 0.45)",
    },
    {
      name: "brass",
      primary: "#CA8A04",
      light: "#FEF08A",
      dark: "#713F12",
      rim: "#A16207",
      glow: "rgba(202, 138, 4, 0.45)",
    },
    {
      name: "silver",
      primary: "#94A3B8",
      light: "#F8FAFC",
      dark: "#334155",
      rim: "#64748B",
      glow: "rgba(148, 163, 184, 0.45)",
    },
    {
      name: "copper",
      primary: "#EA580C",
      light: "#FFEDD5",
      dark: "#7C2D12",
      rim: "#C2410C",
      glow: "rgba(234, 88, 12, 0.45)",
    },
    {
      name: "titanium",
      primary: "#475569",
      light: "#CBD5E1",
      dark: "#0F172A",
      rim: "#1E293B",
      glow: "rgba(71, 85, 105, 0.45)",
    },
  ];

  let metalIdx = unitId % metalFinishes.length;
  if (unitType === "fakultas") metalIdx = 0; // Emas Dekanat
  else if (unitName.toLowerCase().includes("bpsi") || unitType === "unit") metalIdx = 4; // Titanium
  const metal = metalFinishes[metalIdx];

  const tagColors = [
    { bg: "#1E3A8A", border: "#3B82F6", foil: "#FEF08A", text: "#FFFFFF", name: "Sapphire" },
    { bg: "#7F1D1D", border: "#EF4444", foil: "#FDE68A", text: "#FFFFFF", name: "Burgundy" },
    { bg: "#14532D", border: "#22C55E", foil: "#FEF08A", text: "#FFFFFF", name: "Emerald" },
    { bg: "#581C87", border: "#A855F7", foil: "#FDE68A", text: "#FFFFFF", name: "Amethyst" },
    { bg: "#0F766E", border: "#14B8A6", foil: "#CCFBF1", text: "#FFFFFF", name: "Teal" },
    { bg: "#9A3412", border: "#F97316", foil: "#FFEDD5", text: "#FFFFFF", name: "Amber" },
    { bg: "#DB2777", border: "#F472B6", foil: "#FDF2F8", text: "#FFFFFF", name: "Sakura Rose" },
    { bg: "#0F172A", border: "#64748B", foil: "#FDE68A", text: "#FFFFFF", name: "Obsidian" },
  ];
  const tagColor = tagColors[unitId % tagColors.length];

  const notch1 = 4 + (unitId % 5) * 2;
  const notch2 = 2 + ((unitId * 3) % 6) * 2;
  const notch3 = 5 + ((unitId * 7) % 4) * 2;
  const notch4 = 3 + ((unitId * 2) % 5) * 2;

  return {
    unitId,
    unitName,
    unitType,
    keychainLabel,
    keyStyle,
    metal,
    tagColor,
    notch1,
    notch2,
    notch3,
    notch4,
  };
}

/**
 * Komponen Kunci Fisik 3D dengan Gantungan Kunci Terikat Langsung (Tanpa Card Box)
 * Tergantung di paku cantolan dinding (peg hook), dengan cincin baja,
 * kunci logam mengkilap berukir, dan tag gantungan kunci bertuliskan [tipe] - [jenjang] [nama].
 */
export default function AdminUniqueKey3D({
  unit,
  selected = false,
  onSelectKey,
  index = 0,
  jiggleKey = 0,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [swaying, setSwaying] = useState(false);

  useEffect(() => {
    if (jiggleKey > 0) {
      const delay = (index % 12) * 55;
      const t1 = setTimeout(() => setSwaying(true), delay);
      const t2 = setTimeout(() => setSwaying(false), delay + 1400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [jiggleKey, index]);

  const {
    unitId,
    keychainLabel,
    keyStyle,
    metal,
    tagColor,
    notch1,
    notch2,
    notch3,
    notch4,
  } = getKeyConfig(unit, index);

  return (
    <div
      onClick={() => onSelectKey && onSelectKey(unit)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col items-center justify-start cursor-pointer select-none transition-all duration-300 py-3 px-2"
      title={`Ambil Kunci: ${keychainLabel}`}
    >
      <motion.div
        animate={
          isHovered || swaying
            ? {
                rotate: [-9, 8, -5, 4, -1.5, 0],
                y: isHovered ? -4 : 0,
                scale: isHovered ? 1.06 : 1,
                transition: {
                  rotate: { duration: 1.3, ease: "easeInOut" },
                  y: { duration: 0.25 },
                  scale: { duration: 0.25 },
                },
              }
            : {
                rotate: 0,
                y: 0,
                scale: 1,
                transition: { duration: 0.4 },
              }
        }
        whileTap={{ scale: 0.94, y: -6 }}
        onClick={() => onSelectKey && onSelectKey(unit)}
        style={{
          transformOrigin: "center 28px",
          filter: isHovered
            ? `drop-shadow(0 16px 20px rgba(0,0,0,0.32)) drop-shadow(0 0 14px ${metal.glow})`
            : "drop-shadow(0 6px 10px rgba(0,0,0,0.2))",
        }}
        className="relative flex flex-col items-center origin-top -mt-1 cursor-pointer select-none"
      >
        {/* KUNCI FISIK LOGAM 3D */}
        <div className="relative z-10 flex flex-col items-center">
          <svg
            width="84"
            height="145"
            viewBox="0 0 84 145"
            fill="none"
            overflow="visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Gradasi Logam Kunci */}
              <linearGradient
                id={`metal-${unitId}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={metal.light} />
                <stop offset="35%" stopColor={metal.primary} />
                <stop offset="70%" stopColor={metal.dark} />
                <stop offset="100%" stopColor={metal.primary} />
              </linearGradient>

              {/* Bayangan Halus Elemen Logam */}
              <filter id={`metal-drop-shadow-${unitId}`} x="-20%" y="-10%" width="150%" height="130%">
                <feDropShadow dx="1" dy="4" stdDeviation="3.5" floodOpacity="0.28" />
              </filter>
            </defs>

            {/* BATANG & KEPALA KUNCI FISIK LOGAM 3D */}
            <g
              transform="translate(0, 0)"
              filter={`url(#metal-drop-shadow-${unitId})`}
            >
              {/* KEPALA KUNCI (BOW) */}
              {keyStyle === "crown" && (
                <path
                  d="M 26,18 C 26,10 34,6 42,6 C 50,6 58,10 58,18 L 64,32 C 64,42 54,50 42,50 C 30,50 20,42 20,32 Z"
                  fill={`url(#metal-${unitId})`}
                  stroke={metal.rim}
                  strokeWidth="2.5"
                />
              )}

              {keyStyle === "skeleton" && (
                <path
                  d="M 42,10 C 32,6 22,14 22,26 C 22,40 38,48 42,50 C 46,48 62,40 62,26 C 62,14 52,6 42,10 Z"
                  fill={`url(#metal-${unitId})`}
                  stroke={metal.rim}
                  strokeWidth="2.5"
                />
              )}

              {keyStyle === "cyber" && (
                <polygon
                  points="42,8 60,18 60,40 42,50 24,40 24,18"
                  fill={`url(#metal-${unitId})`}
                  stroke={metal.rim}
                  strokeWidth="2.5"
                />
              )}

              {keyStyle === "baroque" && (
                <path
                  d="M 42,8 C 48,8 52,14 50,20 C 58,20 62,28 58,36 C 54,44 44,48 42,50 C 40,48 30,44 26,36 C 22,28 26,20 34,20 C 32,14 36,8 42,8 Z"
                  fill={`url(#metal-${unitId})`}
                  stroke={metal.rim}
                  strokeWidth="2.5"
                />
              )}

              {keyStyle === "vault" && (
                <circle
                  cx="42"
                  cy="28"
                  r="21"
                  fill={`url(#metal-${unitId})`}
                  stroke={metal.rim}
                  strokeWidth="3"
                />
              )}

              {keyStyle === "antique" && (
                <ellipse
                  cx="42"
                  cy="28"
                  rx="20"
                  ry="23"
                  fill={`url(#metal-${unitId})`}
                  stroke={metal.rim}
                  strokeWidth="2.5"
                />
              )}

              {/* LUBANG CINCIN GANTUNGAN DALAM BOW (TERKAIT LANGSUNG DENGAN CINCIN BAJA) */}
              <circle
                cx="42"
                cy="28"
                r="8.5"
                fill="#2B1810"
                fillOpacity="0.3"
                stroke={metal.rim}
                strokeWidth="2.2"
              />

              {/* LEHER & COLLAR RINGS */}
              <rect
                x="35"
                y="50"
                width="14"
                height="4"
                rx="1.5"
                fill={metal.light}
                stroke={metal.rim}
                strokeWidth="1.5"
              />
              <rect
                x="33"
                y="54"
                width="18"
                height="3.5"
                rx="1.5"
                fill={metal.primary}
                stroke={metal.rim}
                strokeWidth="1"
              />

              {/* BATANG KUNCI (SHANK) */}
              <rect
                x="38"
                y="57"
                width="8"
                height="70"
                rx="2"
                fill={`url(#metal-${unitId})`}
                stroke={metal.rim}
                strokeWidth="1.8"
              />
              {/* Alur Metal Vertikal */}
              <line
                x1="42"
                y1="60"
                x2="42"
                y2="124"
                stroke={metal.light}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.9"
              />

              {/* GERIGI GIGI KUNCI PROSEDURAL */}
              <path
                d={`M 46,98 
                    L ${46 + notch1},98 
                    L ${46 + notch1},103 
                    L 46,103 
                    L 46,106 
                    L ${46 + notch2},106 
                    L ${46 + notch2},112 
                    L 46,112 
                    L 46,115 
                    L ${46 + notch3},115 
                    L ${46 + notch3},120 
                    L 46,120 
                    L 46,123 
                    L ${46 + notch4},123 
                    L ${46 + notch4},129 
                    L 46,129 Z`}
                fill={`url(#metal-${unitId})`}
                stroke={metal.rim}
                strokeWidth="1.8"
              />

              {/* Ujung Bawah Kunci */}
              <circle
                cx="42"
                cy="128"
                r="4.5"
                fill={metal.primary}
                stroke={metal.rim}
                strokeWidth="1.5"
              />
            </g>
          </svg>

          {isHovered && (
            <div className="absolute top-2 right-2 text-amber-300 animate-ping opacity-85 pointer-events-none">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* PILL NAMA GANTUNGAN KUNCI ELEGAN & RINGKAS DI BAWAH RANGKAIAN */}
        <div
          className="mt-1 px-3 py-1 rounded-full text-center transition-all duration-200 shadow-md max-w-[155px] truncate"
          style={{
            backgroundColor: isHovered ? "#1C1917" : "rgba(28, 25, 23, 0.88)",
            border: `1.5px solid ${isHovered ? tagColor.border : "rgba(255,255,255,0.18)"}`,
            boxShadow: isHovered
              ? `0 6px 14px -2px ${tagColor.bg}80`
              : "0 3px 8px -2px rgba(0,0,0,0.3)",
          }}
        >
          <p
            className="text-[10px] font-mono font-bold tracking-tight truncate leading-tight"
            style={{ color: isHovered ? tagColor.foil || "#FEF08A" : "#FFFFFF" }}
          >
            {keychainLabel}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
