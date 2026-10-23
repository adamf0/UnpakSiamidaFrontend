import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Unlock, Lock, Sparkles, CheckCircle2, ChevronRight, X } from "lucide-react";
import { getKeyConfig } from "./AdminUniqueKey3D";

/**
 * Komponen Simulasi Pembukaan Kunci Gembok Fisik Realistis (Realistic Brass Padlock Unlock)
 * Mengikuti referensi video animasi pembukaan kunci gembok mekanis:
 * 1. Pendekatan Kunci (Key Approach): Kunci unik unit bergerak mendekati lubang kunci gembok kuningan tebal.
 * 2. Pemasukan Kunci (Key Insertion): Batang dan gerigi kunci meluncur masuk ke dalam silinder kunci (tumbler).
 * 3. Pemutaran Kunci 90° (Key Turning): Kunci dan silinder kuningan berputar 90 derajat searah jarum jam, tali kain bergoyang.
 * 4. Gembok Membuka ("KLIK!" Shackle Pop & Swivel): Batang baja lengkung U terpelanting ke atas oleh pegas mekanis dan berputar membuka.
 */
export default function RealisticVaultUnlock3D({
  unit,
  onComplete,
  onCancel,
}) {
  // Tahap animasi mekanis: "approach" -> "insert" -> "turn" -> "unlock"
  const [stage, setStage] = useState("approach");

  const keyConfig = getKeyConfig(unit);
  const {
    unitId,
    unitName,
    keychainLabel,
    keyStyle,
    metal,
    tagColor,
    notch1,
    notch2,
    notch3,
    notch4,
  } = keyConfig;

  useEffect(() => {
    // Timeline presisi simulasi mekanis gembok kuningan
    const t1 = setTimeout(() => setStage("insert"), 600);   // 0.60s: Kunci meluncur masuk lubang
    const t2 = setTimeout(() => setStage("turn"), 1350);   // 1.35s: Kunci berputar 90 derajat
    const t3 = setTimeout(() => setStage("unlock"), 2150); // 2.15s: Pegas terlepas, shackle memantul ke atas ("KLIK!")
    const t4 = setTimeout(() => {
      if (onComplete) onComplete(unit);
    }, 3100); // 3.10s: Masuk ke Lemari Berkas

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [unit, onComplete]);

  const isInserted = stage === "insert" || stage === "turn" || stage === "unlock";
  const isTurned = stage === "turn" || stage === "unlock";
  const isUnlocked = stage === "unlock";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/92 backdrop-blur-xl animate-in fade-in duration-300 select-none overflow-hidden">
      {/* 1. PENCAHAYAAN SPOTLIGHT & AMBIENT GLOW */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-600/15 via-black/80 to-black pointer-events-none" />

      {isUnlocked && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 blur-3xl pointer-events-none"
        />
      )}

      {/* 2. SIMULASI UTAMA: GEMBOK KUNINGAN ISOMETRIK 3D & KUNCI MEKANIS */}
      <div className="relative flex flex-col items-center justify-center max-w-xl w-full">
        <div className="relative w-full max-w-[460px] aspect-[460/480] flex items-center justify-center">
          <svg
            viewBox="0 0 460 480"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* GRADASI KUNINGAN MURNI BADAN GEMBOK (BRUSHED BRASS BODY) */}
              <linearGradient id="padlockBrassFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="25%" stopColor="#D97706" />
                <stop offset="65%" stopColor="#B45309" />
                <stop offset="100%" stopColor="#78350F" />
              </linearGradient>

              {/* SISI ATAS BEVEL GEMBOK */}
              <linearGradient id="padlockBrassTop" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="40%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>

              {/* SISI SAMPING TEBAL 3D GEMBOK */}
              <linearGradient id="padlockBrassSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#92400E" />
                <stop offset="50%" stopColor="#78350F" />
                <stop offset="100%" stopColor="#451A03" />
              </linearGradient>

              {/* GRADASI BAJA HARDENED CHROME BATANG LENGKUNG U (CHROME SHACKLE) */}
              <linearGradient id="chromeShackle" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#64748B" />
                <stop offset="20%" stopColor="#CBD5E1" />
                <stop offset="45%" stopColor="#FFFFFF" />
                <stop offset="70%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* GRADASI KUNINGAN SILINDER ESCUTCHEON */}
              <radialGradient id="escutcheonGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="40%" stopColor="#EAB308" />
                <stop offset="85%" stopColor="#A16207" />
                <stop offset="100%" stopColor="#713F12" />
              </radialGradient>

              {/* GRADASI LOGAM KUNCI SESUAI UNIT */}
              <linearGradient id={`vault-key-metal-${unitId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={metal.light} />
                <stop offset="35%" stopColor={metal.primary} />
                <stop offset="70%" stopColor={metal.dark} />
                <stop offset="100%" stopColor={metal.primary} />
              </linearGradient>

              {/* FILTER BAYANGAN JATUH */}
              <filter id="padlockShadow" x="-20%" y="-10%" width="150%" height="140%">
                <feDropShadow dx="4" dy="16" stdDeviation="12" floodOpacity="0.45" />
              </filter>

              {/* CLIP PATH: HANYA MENAMPILKAN ELEMEN KUNCI DI LUAR LUBANG (x >= 0) */}
              <clipPath id="padlockKeyEntranceClip">
                <rect x="0" y="-120" width="300" height="240" />
              </clipPath>
            </defs>

            {/* BAYANGAN DASAR DI LANTAI */}
            <ellipse
              cx="215"
              cy="435"
              rx="125"
              ry="22"
              fill="rgba(0,0,0,0.55)"
              className="blur-md"
            />

            {/* ============================================================== */}
            {/* 1. BATANG BAJA LENGKUNG GEMBOK (THE HARDENED STEEL SHACKLE)    */}
            {/*    MEMANTUL KE ATAS & BERPUTAR MEMBUKA SESUAI VIDEO REFERENSI  */}
            {/* ============================================================== */}
            <motion.g
              animate={
                isUnlocked
                  ? {
                      y: -44, // Shackle terlempar ke atas oleh pegas mekanis
                      rotate: -32, // Shackle berputar keluar pada engsel kiri
                      transition: {
                        y: { type: "spring", stiffness: 450, damping: 20 },
                        rotate: { delay: 0.12, duration: 0.35, ease: "easeOut" },
                      },
                    }
                  : { y: 0, rotate: 0 }
              }
              style={{ transformOrigin: "165px 200px" }} // Titik tumpu engsel kaki kiri
            >
              {/* Batang U Baja Lengkung */}
              <path
                d="M 165,225 
                   L 165,120 
                   C 165,65 265,65 265,120 
                   L 265,225"
                fill="none"
                stroke="url(#chromeShackle)"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))" }}
              />

              {/* Garis Kilau Pantulan Cahaya Baja */}
              <path
                d="M 165,215 
                   L 165,120 
                   C 165,75 265,75 265,120 
                   L 265,215"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.75"
              />

              {/* TAKIKAN PENAHAN GERENDEL (LOCKING NOTCH DI KAKI KANAN) */}
              {/* Muncul ke atas saat gembok terbuka membuktikan mekanisme fisik asli */}
              <rect
                x="253"
                y="190"
                width="14"
                height="7"
                rx="1"
                fill="#1E293B"
                opacity="0.85"
              />
            </motion.g>

            {/* GELOMBANG SHOCKWAVE "KLIK!" KETIKA GEMBOK TERBUKA */}
            {isUnlocked && (
              <motion.circle
                cx="265"
                cy="195"
                initial={{ r: 8, opacity: 0.9 }}
                animate={{ r: 42, opacity: 0 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                stroke="#F59E0B"
                strokeWidth="3"
                fill="none"
              />
            )}

            {/* ============================================================== */}
            {/* 2. BADAN UTAMA GEMBOK KUNINGAN TEBAL (THE SOLID BRASS BODY)    */}
            {/* ============================================================== */}
            <g filter="url(#padlockShadow)">
              {/* Sisi Tebal 3D Samping (Extrusion Depth) */}
              <path
                d="M 295,210 L 310,195 L 310,360 L 295,380 Z"
                fill="url(#padlockBrassSide)"
                stroke="#451A03"
                strokeWidth="1.5"
              />

              {/* Sisi Atas Bevel Tempat Lubang Shackle */}
              <path
                d="M 130,210 L 150,195 L 310,195 L 295,210 Z"
                fill="url(#padlockBrassTop)"
                stroke="#92400E"
                strokeWidth="1.5"
              />

              {/* Badan Depan Gembok (Kotak Kuningan Halus Bevel) */}
              <rect
                x="130"
                y="210"
                width="165"
                height="170"
                rx="18"
                fill="url(#padlockBrassFront)"
                stroke="#78350F"
                strokeWidth="2.5"
              />

              {/* Ring Collar Kuningan Penahan Kaki Kiri Shackle */}
              <ellipse cx="165" cy="202" rx="16" ry="6" fill="#A16207" stroke="#FEF08A" strokeWidth="1" />
              <ellipse cx="165" cy="202" rx="12" ry="4" fill="#1C1917" />

              {/* Ring Collar Kuningan Penahan Kaki Kanan Shackle */}
              <ellipse cx="265" cy="202" rx="16" ry="6" fill="#A16207" stroke="#FEF08A" strokeWidth="1" />
              <ellipse cx="265" cy="202" rx="12" ry="4" fill="#1C1917" />

              {/* Garis Bevel Tepi dan Pantulan Kilap Kuningan */}
              <rect
                x="134"
                y="214"
                width="157"
                height="162"
                rx="14"
                fill="none"
                stroke="#FDE68A"
                strokeWidth="1.5"
                opacity="0.45"
              />

              {/* Grafir Tulisan Resmi Lembaga Mutu */}
              <text
                x="212"
                y="245"
                fill="#451A03"
                fontSize="8"
                fontWeight="900"
                fontFamily="ui-monospace, monospace"
                letterSpacing="0.16em"
                textAnchor="middle"
                style={{ textShadow: "0 1px 1px rgba(255,255,255,0.3)" }}
              >
                UNIVERSITAS PAKUAN
              </text>
              <line x1="170" y1="250" x2="255" y2="250" stroke="#78350F" strokeWidth="0.8" opacity="0.6" />
              <text
                x="212"
                y="260"
                fill="#78350F"
                fontSize="7"
                fontWeight="bold"
                fontFamily="ui-monospace, monospace"
                letterSpacing="0.1em"
                textAnchor="middle"
              >
                LEMBAGA PENJAMINAN MUTU (LPMI)
              </text>

              {/* ========================================================== */}
              {/* 3. LUBANG KUNCI & SILINDER BERPUTAR (THE KEYHOLE TUMBLER) */}
              {/* ========================================================== */}
              <g transform="translate(212, 315)">
                {/* Plat Bezel Bundar Kuningan Kunci */}
                <circle cx="0" cy="0" r="28" fill="url(#escutcheonGrad)" stroke="#78350F" strokeWidth="2" />
                <circle cx="0" cy="0" r="25" fill="none" stroke="#FEF08A" strokeWidth="1" opacity="0.7" />

                {/* 4 Baut Rivet Bezel */}
                {[-20, 20].map((bx) => (
                  <React.Fragment key={bx}>
                    <circle cx={bx} cy="0" r="1.8" fill="#451A03" />
                    <circle cx="0" cy={bx} r="1.8" fill="#451A03" />
                  </React.Fragment>
                ))}

                {/* SILINDER KUNINGAN DAN KUNCI BERPUTAR 90 DERAJAT BERSAMA */}
                <motion.g
                  animate={{
                    rotate: isTurned ? 90 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 22,
                  }}
                  style={{ transformOrigin: "0px 0px" }}
                >
                  {/* Penstabil Bounding Box Simetris (Menjamin pusat rotasi Framer Motion tepat di 0,0) */}
                  <circle cx="0" cy="0" r="140" fill="none" stroke="none" opacity="0" pointerEvents="none" />

                  {/* Plat Silinder Dalam */}
                  <circle cx="0" cy="0" r="18" fill="#D97706" stroke="#92400E" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="14" fill="none" stroke="#FEF08A" strokeWidth="0.8" opacity="0.6" />

                  {/* LUBANG KUNCI FISIK (KEYHOLE SLIT) */}
                  <path
                    d="M 0,-6 
                       C 3.5,-6 3.5,-2 2,-0.5 
                       L 3,8 
                       L -3,8 
                       L -2,-0.5 
                       C -3.5,-2 -3.5,-6 0,-6 Z"
                    fill="#0F172A"
                    stroke="#451A03"
                    strokeWidth="0.8"
                  />

                  {/* KUNCI ASLI UNIT: PENDEKATAN & PENUSUKAN MASUK KE SILINDER */}
                  <motion.g
                    initial={{ x: 130, opacity: 0 }}
                    animate={
                      stage === "approach"
                        ? {
                            x: 70, // Mendekat ke mulut lubang silinder
                            opacity: 1,
                            transition: { duration: 0.55, ease: "easeOut" },
                          }
                        : isInserted
                        ? {
                            x: 0, // Kunci tertancap penuh ke dalam silinder (batang tenggelam masuk)
                            opacity: 1,
                            transition: { type: "spring", stiffness: 340, damping: 24 },
                          }
                        : { x: 130, opacity: 0 }
                    }
                  >
                    {/* 1. BATANG & GERIGI KUNCI (DI-CLIP OLEH LUBANG KUNCI: HANYA YANG DI LUAR x >= 0 YANG TERLIHAT) */}
                    <g clipPath="url(#padlockKeyEntranceClip)">
                      {/* Batang Kunci (Shank) */}
                      <rect
                        x="-70"
                        y="-4"
                        width="70"
                        height="8"
                        rx="1.5"
                        fill={`url(#vault-key-metal-${unitId})`}
                        stroke={metal.rim}
                        strokeWidth="1.5"
                      />
                      <line x1="-68" y1="0" x2="-2" y2="0" stroke={metal.light} strokeWidth="1.2" opacity="0.9" />

                      {/* Gerigi Gigi Kunci Prosedural */}
                      <path
                        d={`M -55,-4 
                            L -55,${-4 - notch1} 
                            L -50,${-4 - notch1} 
                            L -50,-4 
                            L -46,-4 
                            L -46,${-4 - notch2} 
                            L -40,${-4 - notch2} 
                            L -40,-4 
                            L -35,-4 
                            L -35,${-4 - notch3} 
                            L -28,${-4 - notch3} 
                            L -28,-4 
                            L -22,-4 
                            L -22,${-4 - notch4} 
                            L -15,${-4 - notch4} 
                            L -15,-4 Z`}
                        fill={`url(#vault-key-metal-${unitId})`}
                        stroke={metal.rim}
                        strokeWidth="1.2"
                      />
                    </g>

                    {/* Penampang Batang Kunci yang Tertancap di Lubang Silinder */}
                    <rect x="-2" y="-4" width="4" height="8" rx="1" fill={metal.light} stroke={metal.rim} strokeWidth="0.8" />

                    {/* 2. LEHER COLLAR KUNCI */}
                    <rect x="0" y="-7" width="5" height="14" rx="1.5" fill={metal.light} stroke={metal.rim} strokeWidth="1" />
                    <rect x="5" y="-9" width="5" height="18" rx="1.5" fill={metal.primary} stroke={metal.rim} strokeWidth="1" />

                    {/* 3. KEPALA KUNCI (BOW) */}
                    <g transform="translate(10, 0)">
                      {keyStyle === "crown" && (
                        <path
                          d="M 0,-18 C 8,-18 12,-10 20,-10 L 32,-16 C 42,-16 48,-6 48,0 C 48,6 42,16 32,16 L 20,10 C 12,10 8,18 0,18 Z"
                          fill={`url(#vault-key-metal-${unitId})`}
                          stroke={metal.rim}
                          strokeWidth="2.2"
                        />
                      )}

                      {keyStyle === "skeleton" && (
                        <path
                          d="M 0,0 C 6,-10 14,-18 26,-18 C 40,-18 48,-8 48,0 C 48,8 40,18 26,18 C 14,18 6,10 0,0 Z"
                          fill={`url(#vault-key-metal-${unitId})`}
                          stroke={metal.rim}
                          strokeWidth="2.2"
                        />
                      )}

                      {(keyStyle === "vault" || keyStyle === "cyber" || keyStyle === "baroque" || keyStyle === "antique") && (
                        <circle cx="24" cy="0" r="20" fill={`url(#vault-key-metal-${unitId})`} stroke={metal.rim} strokeWidth="2.5" />
                      )}

                      {/* Lubang Kepala Kunci Tempat Cincin Terpasang */}
                      <circle cx="24" cy="0" r="8.5" fill="#1C1917" stroke={metal.rim} strokeWidth="1.8" />
                    </g>
                  </motion.g>
                </motion.g>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
