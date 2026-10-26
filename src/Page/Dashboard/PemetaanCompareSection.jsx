import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import {
  ArrowLeftRight,
  Sparkles,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCheck2,
  FileText,
  AlertCircle,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  Building2,
  GraduationCap,
  GripHorizontal,
  Info,
  Maximize2,
} from "lucide-react";
import { formatProdiWithJenjang } from "@/Common/Utils";

/**
 * Komponen Perbandingan (Compare) Pemetaan Instrumen Antara Dua Target Stakeholder
 * Mengimplementasikan 3 Kolom:
 * Target 1 (Kiri) <---> Indikator & Dokumen (Tengah) <---> Target 2 (Kanan)
 * dengan garis kurva Bézier SVG interaktif, animasi aliran, dan dukungan Drag & Drop.
 */
export default function PemetaanCompareSection({
  allUnits = [],
  selectedTahun = "2026",
  target1,
  setTarget1,
  target2,
  setTarget2,
  draggedUnit,
  setDraggedUnit,
  isHoveringDrop1 = false,
  isHoveringDrop2 = false,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const target1AnchorRef = useRef(null);
  const target2AnchorRef = useRef(null);

  /* ================= STATE ================= */
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "shared" | "only1" | "only2"
  const [instrumentType, setInstrumentType] = useState("all"); // "all" | "renstra" | "dokumen"
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredItemKey, setHoveredItemKey] = useState(null);
  const [hoveredTarget, setHoveredTarget] = useState(null); // 1 | 2 | null
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Drop zone states
  const [isOverDrop1, setIsOverDrop1] = useState(false);
  const [isOverDrop2, setIsOverDrop2] = useState(false);

  // Selector dropdown modal/popover states
  const [showSelectModal1, setShowSelectModal1] = useState(false);
  const [showSelectModal2, setShowSelectModal2] = useState(false);
  const [searchSelect1, setSearchSelect1] = useState("");
  const [searchSelect2, setSearchSelect2] = useState("");

  // Coordinates for SVG lines
  const [lineCoords, setLineCoords] = useState([]);

  /* ================= DRAG & DROP HANDLERS ================= */
  const handleDrop = (e, slot) => {
    e.preventDefault();
    if (slot === 1) setIsOverDrop1(false);
    if (slot === 2) setIsOverDrop2(false);

    let unitToSet = null;
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (raw) {
        const parsed = JSON.parse(raw);
        unitToSet = allUnits.find(
          (u) =>
            String(u.id) === String(parsed.id) ||
            u.uuid === parsed.uuid ||
            u.nama?.toLowerCase() === parsed.nama?.toLowerCase()
        );
      }
    } catch (err) {
      console.warn("Gagal parsing drag data:", err);
    }

    if (!unitToSet && draggedUnit) {
      unitToSet = draggedUnit;
    }

    if (unitToSet) {
      if (slot === 1) setTarget1(unitToSet);
      if (slot === 2) setTarget2(unitToSet);
      setPage(1);
    }
    if (setDraggedUnit) setDraggedUnit(null);
  };

  /* ================= PRESET SUGGESTIONS ================= */
  const presetSuggestions = useMemo(() => {
    if (!allUnits || allUnits.length < 2) return [];
    const mapped = allUnits.filter((u) => !u.isUnmapped && u.totalPemetaan > 0);
    if (mapped.length >= 2) {
      return [
        {
          label: `${formatProdiWithJenjang(mapped[0].nama, mapped[0].jenjang, mapped[0].type)} vs ${formatProdiWithJenjang(mapped[1].nama, mapped[1].jenjang, mapped[1].type)}`,
          t1: mapped[0],
          t2: mapped[1],
        },
        mapped.length >= 4
          ? {
              label: `${formatProdiWithJenjang(mapped[2].nama, mapped[2].jenjang, mapped[2].type)} vs ${formatProdiWithJenjang(mapped[3].nama, mapped[3].jenjang, mapped[3].type)}`,
              t1: mapped[2],
              t2: mapped[3],
            }
          : null,
      ].filter(Boolean);
    }
    return [];
  }, [allUnits]);

  /* ================= SWAP & RESET ================= */
  const handleSwap = () => {
    const temp = target1;
    setTarget1(target2);
    setTarget2(temp);
    setPage(1);
  };

  const handleReset = () => {
    setTarget1(null);
    setTarget2(null);
    setPage(1);
  };

  /* ================= DATA COMPARISON ENGINE ================= */
  const comparisonData = useMemo(() => {
    if (!target1 && !target2) {
      return {
        list: [],
        totalTarget1: 0,
        totalTarget2: 0,
        sharedCount: 0,
        only1Count: 0,
        only2Count: 0,
        totalUnion: 0,
        similarityPercent: 0,
      };
    }

    // Map Renstra & Dokumen untuk Target 1
    const t1RenstraMap = new Map();
    const t1DokumenMap = new Map();
    if (target1) {
      (target1.renstraList || []).forEach((r) => {
        const k = String(r.indikatorId || r.indikator || "").trim();
        if (k) t1RenstraMap.set(k, r);
      });
      (target1.dokumenTambahanList || []).forEach((d) => {
        const k = String(d.jenisFileId || d.JenisFile || d.Pertanyaan || "").trim();
        if (k) t1DokumenMap.set(k, d);
      });
    }

    // Map Renstra & Dokumen untuk Target 2
    const t2RenstraMap = new Map();
    const t2DokumenMap = new Map();
    if (target2) {
      (target2.renstraList || []).forEach((r) => {
        const k = String(r.indikatorId || r.indikator || "").trim();
        if (k) t2RenstraMap.set(k, r);
      });
      (target2.dokumenTambahanList || []).forEach((d) => {
        const k = String(d.jenisFileId || d.JenisFile || d.Pertanyaan || "").trim();
        if (k) t2DokumenMap.set(k, d);
      });
    }

    // Himpunan seluruh key unik (Union)
    const unionMap = new Map();

    // 1. Tambah seluruh Renstra dari Target 1 & Target 2
    const allRenstraKeys = new Set([
      ...t1RenstraMap.keys(),
      ...t2RenstraMap.keys(),
    ]);
    allRenstraKeys.forEach((key) => {
      const r1 = t1RenstraMap.get(key);
      const r2 = t2RenstraMap.get(key);
      const sample = r1 || r2;
      const inT1 = Boolean(r1);
      const inT2 = Boolean(r2);

      unionMap.set(`R_${key}`, {
        uniqueKey: `R_${key}`,
        type: "renstra",
        id: sample.indikatorId,
        title: sample.indikator || `Indikator #${sample.indikatorId}`,
        standarOrSub: sample.standarRenstra || "Standar Mutu Renstra",
        klasifikasi: sample.klasifikasi || "Standar",
        inTarget1: inT1,
        inTarget2: inT2,
        isShared: inT1 && inT2,
        isOnly1: inT1 && !inT2,
        isOnly2: !inT1 && inT2,
        tugasT1: r1?.tugasList || (r1?.Tugas ? [r1.Tugas] : []),
        tugasT2: r2?.tugasList || (r2?.Tugas ? [r2.Tugas] : []),
        hasDupe: sample.hasDupe,
      });
    });

    // 2. Tambah seluruh Dokumen Tambahan dari Target 1 & Target 2
    const allDokKeys = new Set([
      ...t1DokumenMap.keys(),
      ...t2DokumenMap.keys(),
    ]);
    allDokKeys.forEach((key) => {
      const d1 = t1DokumenMap.get(key);
      const d2 = t2DokumenMap.get(key);
      const sample = d1 || d2;
      const inT1 = Boolean(d1);
      const inT2 = Boolean(d2);

      unionMap.set(`D_${key}`, {
        uniqueKey: `D_${key}`,
        type: "dokumen",
        id: sample.jenisFileId,
        title: sample.JenisFile || "Dokumen Tambahan",
        standarOrSub: sample.Pertanyaan || sample.pertanyaan || "Pertanyaan Dokumen",
        klasifikasi: sample.Klasifikasi || "Dokumen",
        inTarget1: inT1,
        inTarget2: inT2,
        isShared: inT1 && inT2,
        isOnly1: inT1 && !inT2,
        isOnly2: !inT1 && inT2,
        tugasT1: d1?.tugasList || (d1?.Tugas ? [d1.Tugas] : []),
        tugasT2: d2?.tugasList || (d2?.Tugas ? [d2.Tugas] : []),
        hasDupe: sample.hasDupe,
      });
    });

    const fullList = Array.from(unionMap.values()).sort((a, b) => {
      // Prioritas: Irisan (bersama) di atas, lalu Only1, lalu Only2
      if (a.isShared && !b.isShared) return -1;
      if (!a.isShared && b.isShared) return 1;
      if (a.isOnly1 && !b.isOnly1) return -1;
      if (!a.isOnly1 && b.isOnly1) return 1;
      return a.title.localeCompare(b.title);
    });

    const totalTarget1 = target1 ? target1.totalPemetaan : 0;
    const totalTarget2 = target2 ? target2.totalPemetaan : 0;
    const sharedCount = fullList.filter((item) => item.isShared).length;
    const only1Count = fullList.filter((item) => item.isOnly1).length;
    const only2Count = fullList.filter((item) => item.isOnly2).length;
    const totalUnion = fullList.length;

    const similarityPercent =
      totalUnion > 0 ? Math.round((sharedCount / totalUnion) * 100) : 0;

    return {
      list: fullList,
      totalTarget1,
      totalTarget2,
      sharedCount,
      only1Count,
      only2Count,
      totalUnion,
      similarityPercent,
    };
  }, [target1, target2]);

  /* ================= FILTERED & PAGINATED ITEMS ================= */
  const filteredList = useMemo(() => {
    let result = comparisonData.list;

    // Filter by Active Tab
    if (activeFilter === "shared") {
      result = result.filter((item) => item.isShared);
    } else if (activeFilter === "only1") {
      result = result.filter((item) => item.isOnly1);
    } else if (activeFilter === "only2") {
      result = result.filter((item) => item.isOnly2);
    }

    // Filter by Instrument Type
    if (instrumentType === "renstra") {
      result = result.filter((item) => item.type === "renstra");
    } else if (instrumentType === "dokumen") {
      result = result.filter((item) => item.type === "dokumen");
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.standarOrSub.toLowerCase().includes(q)
      );
    }

    return result;
  }, [comparisonData.list, activeFilter, instrumentType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  /* ================= COMPUTE SVG CONNECTOR CURVES ================= */
  const updateSvgLines = () => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const t1Anchor = target1AnchorRef.current?.getBoundingClientRect();
    const t2Anchor = target2AnchorRef.current?.getBoundingClientRect();

    if (!t1Anchor || !t2Anchor) return;

    // Koordinat pusat jangkar Target 1 & Target 2 terhadap canvas
    const t1X = t1Anchor.right - canvasRect.left;
    const t1Y = t1Anchor.top + t1Anchor.height / 2 - canvasRect.top;

    const t2X = t2Anchor.left - canvasRect.left;
    const t2Y = t2Anchor.top + t2Anchor.height / 2 - canvasRect.top;

    const newLines = [];

    paginatedList.forEach((item, idx) => {
      const leftPinEl = document.getElementById(`pin-left-${item.uniqueKey}`);
      const rightPinEl = document.getElementById(`pin-right-${item.uniqueKey}`);

      if (leftPinEl && item.inTarget1) {
        const leftPinRect = leftPinEl.getBoundingClientRect();
        const pinX = leftPinRect.left + leftPinRect.width / 2 - canvasRect.left;
        const pinY = leftPinRect.top + leftPinRect.height / 2 - canvasRect.top;

        // Kurva Bezier halus dari Target 1 ke Pin Kiri
        const dx = Math.abs(pinX - t1X) * 0.52;
        const pathD = `M ${t1X},${t1Y} C ${t1X + dx},${t1Y} ${pinX - dx},${pinY} ${pinX},${pinY}`;

        newLines.push({
          id: `line-t1-${item.uniqueKey}`,
          itemKey: item.uniqueKey,
          targetSide: 1,
          pathD,
          isShared: item.isShared,
          isOnly1: item.isOnly1,
        });
      }

      if (rightPinEl && item.inTarget2) {
        const rightPinRect = rightPinEl.getBoundingClientRect();
        const pinX = rightPinRect.left + rightPinRect.width / 2 - canvasRect.left;
        const pinY = rightPinRect.top + rightPinRect.height / 2 - canvasRect.top;

        // Kurva Bezier halus dari Pin Kanan ke Target 2
        const dx = Math.abs(t2X - pinX) * 0.52;
        const pathD = `M ${pinX},${pinY} C ${pinX + dx},${pinY} ${t2X - dx},${t2Y} ${t2X},${t2Y}`;

        newLines.push({
          id: `line-t2-${item.uniqueKey}`,
          itemKey: item.uniqueKey,
          targetSide: 2,
          pathD,
          isShared: item.isShared,
          isOnly2: item.isOnly2,
        });
      }
    });

    setLineCoords(newLines);
  };

  useLayoutEffect(() => {
    updateSvgLines();
  }, [paginatedList, target1, target2, page]);

  useEffect(() => {
    const handleResize = () => {
      updateSvgLines();
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [paginatedList]);

  return (
    <div
      ref={containerRef}
      id="pemetaan-compare-section"
      className="bg-gradient-to-b from-white via-gray-50/50 to-white border-gray-200/90 shadow-sm overflow-hidden"
    >
      {/* HEADER SECTION */}
      <div className="p-6 sm:p-7 border-b border-gray-200/80 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Bandingkan Pemetaan Instrumen Antar Stakeholder</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 max-w-2xl leading-relaxed">
              Tarik &amp; lepas (<strong>Drag &amp; Drop</strong>) sel program studi atau fakultas dari bagan di atas ke <strong>Target 1</strong> dan <strong>Target 2</strong> untuk melihat irisan instrumen bersama dan instrumen yang berbeda.
            </p>
          </div>

          {/* CONTROLS (SWAP, RESET, PRESETS) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {(target1 || target2) && (
              <>
                <button
                  onClick={handleSwap}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-2xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Tukar Posisi Target 1 dan Target 2"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Tukar</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Kosongkan Pilihan Target"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* COMPARISON METRICS SUMMARY BAR (MUNCUL JIKA KEDUA TARGET DIPILIH) */}
        {target1 && target2 && (
          <div className="mt-6 pt-5 border-t border-gray-200/70">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* TARGET 1 TOTAL */}
              <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs">
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Target 1
                </p>
                <p className="text-xl font-black text-gray-900 mt-0.5">
                  {comparisonData.totalTarget1}{" "}
                  <span className="text-xs font-semibold text-gray-500">instrumen</span>
                </p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5 font-medium">
                  {formatProdiWithJenjang(
                    target1.nama,
                    target1.jenjang,
                    target1.type
                  )}
                </p>
              </div>

              {/* SHARED / IRISAN */}
              <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-2xs">
                <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  Irisan (Bersama)
                </p>
                <p className="text-xl font-black text-purple-900 mt-0.5">
                  {comparisonData.sharedCount}{" "}
                  <span className="text-xs font-semibold text-purple-700">
                    ({comparisonData.similarityPercent}% Mirip)
                  </span>
                </p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Dimiliki kedua stakeholder
                </p>
              </div>

              {/* HANYA TARGET 1 */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Hanya Target 1
                </p>
                <p className="text-xl font-black text-emerald-900 mt-0.5">
                  {comparisonData.only1Count}{" "}
                  <span className="text-xs font-semibold text-emerald-700">unik</span>
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Tidak ada di Target 2
                </p>
              </div>

              {/* HANYA TARGET 2 */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 shadow-2xs">
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  Hanya Target 2
                </p>
                <p className="text-xl font-black text-blue-900 mt-0.5">
                  {comparisonData.only2Count}{" "}
                  <span className="text-xs font-semibold text-blue-700">unik</span>
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Tidak ada di Target 1
                </p>
              </div>

              {/* TARGET 2 TOTAL */}
              <div className="p-3.5 rounded-2xl bg-white border border-blue-200 shadow-2xs col-span-2 sm:col-span-1">
                <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  Target 2
                </p>
                <p className="text-xl font-black text-gray-900 mt-0.5">
                  {comparisonData.totalTarget2}{" "}
                  <span className="text-xs font-semibold text-gray-500">instrumen</span>
                </p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5 font-medium">
                  {formatProdiWithJenjang(
                    target2.nama,
                    target2.jenjang,
                    target2.type
                  )}
                </p>
              </div>
            </div>

            {/* SEGMENTED PROGRESS COMPARISON BAR */}
            {comparisonData.totalUnion > 0 && (
              <div className="mt-3.5 space-y-1.5">
                <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex shadow-inner">
                  <div
                    style={{
                      width: `${(comparisonData.only1Count / comparisonData.totalUnion) * 100}%`,
                    }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`Hanya Target 1: ${comparisonData.only1Count}`}
                  ></div>
                  <div
                    style={{
                      width: `${(comparisonData.sharedCount / comparisonData.totalUnion) * 100}%`,
                    }}
                    className="bg-purple-600 transition-all duration-500"
                    title={`Irisan Bersama: ${comparisonData.sharedCount}`}
                  ></div>
                  <div
                    style={{
                      width: `${(comparisonData.only2Count / comparisonData.totalUnion) * 100}%`,
                    }}
                    className="bg-blue-500 transition-all duration-500"
                    title={`Hanya Target 2: ${comparisonData.only2Count}`}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 px-1">
                  <span className="text-emerald-700 font-semibold">
                    🟢 Unik T1 ({comparisonData.only1Count})
                  </span>
                  <span className="text-purple-700 font-semibold">
                    🟣 Bersama ({comparisonData.sharedCount})
                  </span>
                  <span className="text-blue-700 font-semibold">
                    🔵 Unik T2 ({comparisonData.only2Count})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CANVAS COMPARISON (3 KOLOM SESUAI SKETSA GAMBAR USER) */}
      <div className="relative p-6 sm:p-8" ref={canvasRef}>
        {/* SVG CONNECTOR LINES LAYER (TERRENTANG DI BELAKANG KOLOM PADA DESKTOP) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block overflow-visible select-none z-10"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <style>{`
              @keyframes compare-flow-anim {
                from { stroke-dashoffset: 20; }
                to { stroke-dashoffset: 0; }
              }
              .compare-flowing-line {
                animation: compare-flow-anim 1.8s linear infinite;
              }
            `}</style>
            {/* Filter glow saat hover */}
            <filter id="compare-line-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#6366F1" floodOpacity="0.7" />
            </filter>
            <linearGradient id="grad-line-t1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="grad-line-t2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {lineCoords.map((line) => {
            const isHovered = hoveredItemKey === line.itemKey;
            const isTargetHovered =
              (hoveredTarget === 1 && line.targetSide === 1) ||
              (hoveredTarget === 2 && line.targetSide === 2);
            const isHighlighted = isHovered || isTargetHovered;

            const strokeColor =
              line.targetSide === 1
                ? line.isShared
                  ? "url(#grad-line-t1)"
                  : "#10B981"
                : line.isShared
                ? "url(#grad-line-t2)"
                : "#3B82F6";

            return (
              <path
                key={line.id}
                d={line.pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isHighlighted ? 3.5 : 1.75}
                strokeDasharray={isHighlighted ? "none" : "6,4"}
                opacity={
                  hoveredItemKey && !isHovered
                    ? 0.15
                    : hoveredTarget && !isTargetHovered
                    ? 0.15
                    : isHighlighted
                    ? 1
                    : 0.65
                }
                filter={isHighlighted ? "url(#compare-line-glow)" : "none"}
                className={`transition-all duration-200 ${
                  isHighlighted ? "" : "compare-flowing-line"
                }`}
              />
            );
          })}
        </svg>

        {/* 3 COLUMNS GRID */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-start z-20">
          {/* ================= KOLOM 1: TARGET 1 (KIRI) ================= */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div
              id="compare-drop-zone-1"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setIsOverDrop1(true);
              }}
              onDragLeave={() => setIsOverDrop1(false)}
              onDrop={(e) => handleDrop(e, 1)}
              onMouseEnter={() => setHoveredTarget(1)}
              onMouseLeave={() => setHoveredTarget(null)}
              className={`relative rounded-3xl border-2 transition-all duration-200 p-5 bg-white shadow-sm overflow-hidden ${
                isOverDrop1 || isHoveringDrop1
                  ? "border-emerald-500 bg-emerald-50/90 ring-4 ring-emerald-300 scale-[1.03] shadow-lg"
                  : draggedUnit
                  ? "border-emerald-400 border-dashed bg-emerald-50/40 animate-pulse"
                  : target1
                  ? "border-emerald-200 hover:border-emerald-300"
                  : "border-gray-200 border-dashed bg-gray-50/60 hover:bg-gray-50"
              }`}
            >
              {/* STATUS INDIKATOR DRAG AKTIF */}
              {(isOverDrop1 || isHoveringDrop1) && draggedUnit ? (
                <div className="mb-3 p-2 bg-emerald-100 border border-emerald-300 rounded-xl text-center text-xs font-black text-emerald-800 animate-bounce shadow-xs">
                  ✨ Lepaskan untuk memilih {formatProdiWithJenjang(draggedUnit.nama, draggedUnit.jenjang, draggedUnit.type)} sebagai Target 1!
                </div>
              ) : draggedUnit && !target1 ? (
                <div className="mb-3 p-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-[11px] font-bold text-emerald-700 animate-pulse">
                  ⬇️ Lepaskan di sini untuk Target 1
                </div>
              ) : null}

              {/* BADGE LABEL ATAS */}
              <div className="flex items-center justify-between gap-2 mb-3">
                {target1 && (
                  <button
                    onClick={() => setTarget1(null)}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Hapus Target 1"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {target1 ? (
                /* TARGET 1 CONTENT CARD */
                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-white text-sm shadow-sm"
                      style={{
                        backgroundColor: target1.groupConfig?.color || "#059669",
                      }}
                    >
                      {target1.groupConfig?.tag || "T1"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {target1.jenjang && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                            {target1.jenjang}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-gray-400 uppercase truncate">
                          {target1.fakultas}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-gray-900 mt-0.5 leading-snug">
                        {formatProdiWithJenjang(
                          target1.nama,
                          target1.jenjang,
                          target1.type
                        )}
                      </h4>
                    </div>
                  </div>

                  {/* METRIK TARGET 1 */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t border-gray-100">
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-150">
                      <p className="text-[10px] text-gray-500 font-medium">Renstra</p>
                      <p className="text-sm font-black text-gray-800 mt-0.5">
                        {target1.renstraCount}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-150">
                      <p className="text-[10px] text-gray-500 font-medium">Dokumen</p>
                      <p className="text-sm font-black text-gray-800 mt-0.5">
                        {target1.dokumenTambahanCount}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-emerald-800">
                    <span>Total Pemetaan:</span>
                    <span className="text-sm font-black text-emerald-700">
                      {target1.totalPemetaan} template
                    </span>
                  </div>

                  {/* TOMBOL GANTI */}
                  <button
                    onClick={() => setShowSelectModal1(true)}
                    className="w-full mt-2 py-1.5 px-3 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition text-center cursor-pointer"
                  >
                    Ganti Target 1...
                  </button>
                </div>
              ) : (
                /* EMPTY DROP ZONE */
                <div className="py-8 text-center space-y-2.5">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border-2 border-dashed border-emerald-300 flex items-center justify-center text-emerald-600">
                    <GripHorizontal className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      Drop Target 1 di sini
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      atau klik tombol di bawah untuk memilih
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSelectModal1(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm cursor-pointer"
                  >
                    Pilih Target 1
                  </button>
                </div>
              )}

              {/* JANGKAR CONNECTOR OUTPUT (KANAN) */}
              <div
                ref={target1AnchorRef}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-md z-30 hidden lg:block"
                title="Titik Hubung Target 1"
              ></div>
            </div>

          </div>

          {/* ================= KOLOM 2: DAFTAR INDIKATOR & DOKUMEN (TENGAH) ================= */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* SEARCH & FILTER TABS BAR */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* SEARCH INPUT */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama indikator / standar..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 outline-none transition"
                  />
                </div>

                {/* INSTRUMENT TYPE FILTER (ALL / RENSTRA / DOKUMEN) */}
                <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setInstrumentType("all");
                      setPage(1);
                    }}
                    className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      instrumentType === "all"
                        ? "bg-white text-gray-900 shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => {
                      setInstrumentType("renstra");
                      setPage(1);
                    }}
                    className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      instrumentType === "renstra"
                        ? "bg-white text-indigo-700 shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Renstra
                  </button>
                  <button
                    onClick={() => {
                      setInstrumentType("dokumen");
                      setPage(1);
                    }}
                    className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                      instrumentType === "dokumen"
                        ? "bg-white text-purple-700 shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Dokumen
                  </button>
                </div>
              </div>

              {/* FILTER STATUS TABS (ALL / SHARED / ONLY 1 / ONLY 2) */}
              <div className="flex flex-wrap justify-center items-center gap-1.5 pt-2 border-t border-gray-100 text-xs">
                <button
                  onClick={() => {
                    setActiveFilter("all");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    activeFilter === "all"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Semua ({comparisonData.totalUnion})
                </button>
                <button
                  onClick={() => {
                    setActiveFilter("shared");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === "shared"
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  Irisan Bersama ({comparisonData.sharedCount})
                </button>
                <button
                  onClick={() => {
                    setActiveFilter("only1");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === "only1"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Hanya T1 ({comparisonData.only1Count})
                </button>
                <button
                  onClick={() => {
                    setActiveFilter("only2");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === "only2"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Hanya T2 ({comparisonData.only2Count})
                </button>
              </div>
            </div>

            {/* LIST KARTU INDIKATOR (TENGAH) */}
            <div className="space-y-3">
              {paginatedList.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-gray-200 p-6 space-y-2">
                  <HelpCircle className="w-10 h-10 text-gray-300 mx-auto" />
                  <h5 className="text-sm font-bold text-gray-800">
                    Tidak ada instrumen yang cocok
                  </h5>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    {!target1 && !target2
                      ? "Silakan pilih Target 1 dan Target 2 untuk melihat perbandingan instrumen."
                      : "Coba sesuaikan kata kunci pencarian atau ubah filter tab."}
                  </p>
                </div>
              ) : (
                paginatedList.map((item, idx) => {
                  const isHovered = hoveredItemKey === item.uniqueKey;

                  return (
                    <div
                      key={item.uniqueKey}
                      onMouseEnter={() => setHoveredItemKey(item.uniqueKey)}
                      onMouseLeave={() => setHoveredItemKey(null)}
                      className={`relative bg-white rounded-2xl p-4 border transition-all duration-200 shadow-2xs ${
                        isHovered
                          ? "border-indigo-400 shadow-md ring-2 ring-indigo-100 -translate-y-0.5"
                          : item.isShared
                          ? "border-purple-200/90 hover:border-purple-300"
                          : item.isOnly1
                          ? "border-emerald-200/90 hover:border-emerald-300"
                          : "border-blue-200/90 hover:border-blue-300"
                      }`}
                    >
                      {/* PIN CONNECTOR KIRI (MENGHUBUNG KE TARGET 1) */}
                      <div
                        id={`pin-left-${item.uniqueKey}`}
                        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-30 hidden lg:block transition-all ${
                          item.inTarget1
                            ? isHovered
                              ? "bg-emerald-500 ring-4 ring-emerald-200 scale-125"
                              : "bg-emerald-500"
                            : "bg-gray-200 border-dashed"
                        }`}
                        title={item.inTarget1 ? "Terhubung ke Target 1" : "Tidak ada di Target 1"}
                      ></div>

                      {/* PIN CONNECTOR KANAN (MENGHUBUNG KE TARGET 2) */}
                      <div
                        id={`pin-right-${item.uniqueKey}`}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-30 hidden lg:block transition-all ${
                          item.inTarget2
                            ? isHovered
                              ? "bg-blue-500 ring-4 ring-blue-200 scale-125"
                              : "bg-blue-500"
                            : "bg-gray-200 border-dashed"
                        }`}
                        title={item.inTarget2 ? "Terhubung ke Target 2" : "Tidak ada di Target 2"}
                      ></div>

                      {/* CARD CONTENT HEADER */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.type === "renstra" ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                              RENSTRA #{item.id}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                              DOKUMEN #{item.id}
                            </span>
                          )}

                          <span className="text-[11px] font-semibold text-gray-500 truncate max-w-xs">
                            {item.standarOrSub}
                          </span>
                        </div>

                        {/* STATUS IRISAN BADGE */}
                        {item.isShared ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                            Irisan Bersama
                          </span>
                        ) : item.isOnly1 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Hanya Target 1
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            Hanya Target 2
                          </span>
                        )}
                      </div>

                      {/* TITLE / PERTANYAAN */}
                      <h5 className="text-xs font-bold text-gray-900 mt-2 leading-relaxed">
                        {item.title}
                      </h5>

                      {/* PENUGASAN AUDITOR T1 & T2 FOOTER */}
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1 text-gray-600">
                          <span className="font-medium text-emerald-700">T1:</span>
                          {item.inTarget1 ? (
                            <span className="font-semibold text-emerald-800">
                              Ada ({item.tugasT1.join(", ") || "Auditor"})
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Tidak terpetakan</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-gray-600">
                          <span className="font-medium text-blue-700">T2:</span>
                          {item.inTarget2 ? (
                            <span className="font-semibold text-blue-800">
                              Ada ({item.tugasT2.join(", ") || "Auditor"})
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Tidak terpetakan</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* PAGINATION BAR */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 text-xs font-medium text-gray-600">
                <span>
                  Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong> ({filteredList.length} instrumen)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border bg-white disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ================= KOLOM 3: TARGET 2 (KANAN) ================= */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div
              id="compare-drop-zone-2"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setIsOverDrop2(true);
              }}
              onDragLeave={() => setIsOverDrop2(false)}
              onDrop={(e) => handleDrop(e, 2)}
              onMouseEnter={() => setHoveredTarget(2)}
              onMouseLeave={() => setHoveredTarget(null)}
              className={`relative rounded-3xl border-2 transition-all duration-200 p-5 bg-white shadow-sm overflow-hidden ${
                isOverDrop2 || isHoveringDrop2
                  ? "border-blue-500 bg-blue-50/90 ring-4 ring-blue-300 scale-[1.03] shadow-lg"
                  : draggedUnit
                  ? "border-blue-400 border-dashed bg-blue-50/40 animate-pulse"
                  : target2
                  ? "border-blue-200 hover:border-blue-300"
                  : "border-gray-200 border-dashed bg-gray-50/60 hover:bg-gray-50"
              }`}
            >
              {/* STATUS INDIKATOR DRAG AKTIF */}
              {(isOverDrop2 || isHoveringDrop2) && draggedUnit ? (
                <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded-xl text-center text-xs font-black text-blue-800 animate-bounce shadow-xs">
                  ✨ Lepaskan untuk memilih {formatProdiWithJenjang(draggedUnit.nama, draggedUnit.jenjang, draggedUnit.type)} sebagai Target 2!
                </div>
              ) : draggedUnit && !target2 ? (
                <div className="mb-3 p-1.5 bg-blue-50 border border-blue-200 rounded-xl text-center text-[11px] font-bold text-blue-700 animate-pulse">
                  ⬇️ Lepaskan di sini untuk Target 2
                </div>
              ) : null}

              {/* JANGKAR CONNECTOR INPUT (KIRI) */}
              <div
                ref={target2AnchorRef}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md z-30 hidden lg:block"
                title="Titik Hubung Target 2"
              ></div>

              {/* BADGE LABEL ATAS */}
              <div className="flex items-center justify-between gap-2 mb-3">
                {target2 && (
                  <button
                    onClick={() => setTarget2(null)}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Hapus Target 2"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {target2 ? (
                /* TARGET 2 CONTENT CARD */
                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-white text-sm shadow-sm"
                      style={{
                        backgroundColor: target2.groupConfig?.color || "#2563EB",
                      }}
                    >
                      {target2.groupConfig?.tag || "T2"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {target2.jenjang && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                            {target2.jenjang}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-gray-400 uppercase truncate">
                          {target2.fakultas}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-gray-900 mt-0.5 leading-snug">
                        {formatProdiWithJenjang(
                          target2.nama,
                          target2.jenjang,
                          target2.type
                        )}
                      </h4>
                    </div>
                  </div>

                  {/* METRIK TARGET 2 */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t border-gray-100">
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-150">
                      <p className="text-[10px] text-gray-500 font-medium">Renstra</p>
                      <p className="text-sm font-black text-gray-800 mt-0.5">
                        {target2.renstraCount}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-150">
                      <p className="text-[10px] text-gray-500 font-medium">Dokumen</p>
                      <p className="text-sm font-black text-gray-800 mt-0.5">
                        {target2.dokumenTambahanCount}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-blue-800">
                    <span>Total Pemetaan:</span>
                    <span className="text-sm font-black text-blue-700">
                      {target2.totalPemetaan} template
                    </span>
                  </div>

                  {/* TOMBOL GANTI */}
                  <button
                    onClick={() => setShowSelectModal2(true)}
                    className="w-full mt-2 py-1.5 px-3 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition text-center cursor-pointer"
                  >
                    Ganti Target 2...
                  </button>
                </div>
              ) : (
                /* EMPTY DROP ZONE */
                <div className="py-8 text-center space-y-2.5">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-600">
                    <GripHorizontal className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      Drop Target 2 di sini
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      atau klik tombol di bawah untuk memilih
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSelectModal2(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm cursor-pointer"
                  >
                    Pilih Target 2
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* MODAL SEARCH SELECTION UNTUK TARGET 1 */}
      {showSelectModal1 && (
        <SelectionModal
          title="Pilih Stakeholder untuk Target 1"
          search={searchSelect1}
          setSearch={setSearchSelect1}
          allUnits={allUnits}
          onSelect={(u) => {
            setTarget1(u);
            setShowSelectModal1(false);
            setPage(1);
          }}
          onClose={() => setShowSelectModal1(false)}
        />
      )}

      {/* MODAL SEARCH SELECTION UNTUK TARGET 2 */}
      {showSelectModal2 && (
        <SelectionModal
          title="Pilih Stakeholder untuk Target 2"
          search={searchSelect2}
          setSearch={setSearchSelect2}
          allUnits={allUnits}
          onSelect={(u) => {
            setTarget2(u);
            setShowSelectModal2(false);
            setPage(1);
          }}
          onClose={() => setShowSelectModal2(false)}
        />
      )}
    </div>
  );
}

/**
 * Modal sederhana untuk memilih unit stakeholder bila user memilih klik alih-alih drag & drop
 */
function SelectionModal({ title, search, setSearch, allUnits, onSelect, onClose }) {
  const filtered = useMemo(() => {
    if (!search.trim()) return allUnits;
    const q = search.toLowerCase().trim();
    return allUnits.filter(
      (u) =>
        u.nama.toLowerCase().includes(q) ||
        u.fakultas.toLowerCase().includes(q) ||
        (u.jenjang || "").toLowerCase().includes(q)
    );
  }, [allUnits, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b bg-gray-50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari prodi, fakultas, atau unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl bg-white focus:border-indigo-400 outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto p-3 space-y-1 flex-1">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400">
              Tidak ada stakeholder ditemukan
            </p>
          ) : (
            filtered.map((u) => (
              <div
                key={u.id || u.uuid}
                onClick={() => onSelect(u)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-150 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: u.isUnmapped
                        ? "#DC2626"
                        : u.groupConfig?.color || "#6366F1",
                    }}
                  ></span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {formatProdiWithJenjang(u.nama, u.jenjang, u.type)}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {u.fakultas} {u.jenjang ? `• ${u.jenjang}` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      u.isUnmapped
                        ? "bg-rose-100 text-rose-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {u.totalPemetaan} Pemetaan
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
