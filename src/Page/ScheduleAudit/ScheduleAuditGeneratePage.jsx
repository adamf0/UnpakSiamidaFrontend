import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import { useToast } from "@/Providers/ToastProvider";
import { apiClient } from "@/Common/api";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Search,
  Layers,
  X,
  ArrowRight,
  Copy,
  Check,
  HelpCircle,
} from "lucide-react";

const REQUIRED_CONFIRMATION =
  "saya mengerti dengan seluruh konsekuensi atas perintah ini, dengan ini saya menyatakan GENERATE DATA!";

/**
 * Komponen 2-Kolom Listed Tabel Linked sesuai sketsa user:
 * - Kolom Kiri (Target 1 / Data Sumber: template_renstra & template_dokumen_tambahan)
 *   menampilkan daftar item sumber (`indikator`, `- auditor1/2`, `template_renstra.id=...`)
 * - Kolom Kanan (Target 2 / Data Target: renstra_nilai & dokumen_tambahan)
 *   menampilkan daftar item target dengan highlight warna:
 *   1. Kuning (`amber`): Update (ada data sebelum & sesudah yang berubah, misal tugas `auditor2 -> auditor1` atau duplikat digabung)
 *   2. Hijau (`emerald`): Tambah / Insert baru dari Target 1 ke Target 2
 *   3. Putih / Normal: Tetap / Sama (terhubung garis gelap/netral dari Target 1 ke Target 2)
 *   4. Merah (`rose`): Drop / Hapus (ada di Target 2 tetapi sudah tidak ada di Target 1, tanpa garis dari Target 1)
 */
const censorId = (val) => {
  const s = String(val ?? "").trim();
  if (!s || s === "-") return "••••";
  return s
    .split(",")
    .map((part) => {
      const p = part.trim();
      if (!p) return "••••";
      if (p.length <= 2) return "•••" + p.slice(-1);
      return "•••" + p.slice(-2);
    })
    .join(", ");
};

const ScheduleLinkedComparisonCard = ({ comp }) => {
  const {
    schedule,
    beforeRenstraNilai = [],
    afterRenstraNilai = [],
    beforeDokumenTambahan = [],
    afterDokumenTambahan = [],
  } = comp;

  const { addToast } = useToast();
  const canvasRef = useRef(null);
  const [instrumentType, setInstrumentType] = useState("all"); // "all" | "renstra" | "dokumen"
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "update" | "insert" | "drop" | "same"
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredKey, setHoveredKey] = useState(null);
  const [copiedItemKey, setCopiedItemKey] = useState(null);
  const [lineCoords, setLineCoords] = useState([]);

  const handleCopyPairIds = (e, item) => {
    e.stopPropagation();
    const srcLabel =
      item.type === "renstra"
        ? `template_renstra.id=${item.inT1 ? item.templateId : "-"}`
        : `template_dokumen_tambahan.id=${item.inT1 ? item.templateId : "-"}`;
    const tgtLabel =
      item.type === "renstra"
        ? `renstra_nilai.id=${item.inT2 ? item.targetRowIds || "-" : "-"}`
        : `dokumen_tambahan.id=${item.inT2 ? item.targetRowIds || "-" : "-"}`;
    const textToCopy = `${srcLabel} | ${tgtLabel}`;

    navigator.clipboard?.writeText(textToCopy);
    setCopiedItemKey(item.uniqueKey);
    addToast?.("success", `Disalin: ${textToCopy}`);
    setTimeout(() => {
      setCopiedItemKey((prev) => (prev === item.uniqueKey ? null : prev));
    }, 1800);
  };

  // Susun pasangan item untuk Target 1 (Sumber) & Target 2 (Target)
  const pairedItems = useMemo(() => {
    const items = [];

    const beforeRenstraMap = new Map();
    beforeRenstraNilai.forEach((b) => {
      beforeRenstraMap.set(Number(b.templateRenstra), b);
    });

    const afterRenstraMap = new Map();
    afterRenstraNilai.forEach((a) => {
      afterRenstraMap.set(Number(a.templateRenstra), a);
    });

    const allRenstraTplIds = Array.from(
      new Set([...afterRenstraMap.keys(), ...beforeRenstraMap.keys()])
    ).sort((a, b) => a - b);

    allRenstraTplIds.forEach((tplId) => {
      const src = afterRenstraMap.get(tplId) || null; // Target 1 (template_renstra)
      const tgt = beforeRenstraMap.get(tplId) || null; // Target 2 (renstra_nilai)
      const sample = src || tgt;

      const inT1 = Boolean(src);
      const inT2 = Boolean(tgt);

      const t1Tugas = src?.templateTugas || src?.tugas || sample?.templateTugas || "-";
      const t2BeforeTugas = tgt?.tugas || tgt?.beforeTugas || "-";
      const isTugasMismatch = inT1 && inT2 && t1Tugas !== t2BeforeTugas;
      const isDuplicate = (tgt?.rowCount || 0) > 1;

      let changeType = "same";
      if (inT1 && !inT2) {
        changeType = "insert";
      } else if (!inT1 && inT2) {
        changeType = "drop";
      } else if (isTugasMismatch || isDuplicate) {
        changeType = "update";
      }

      items.push({
        uniqueKey: `S_${schedule.id}_R_${tplId}`,
        type: "renstra",
        templateId: tplId,
        targetRowIds: tgt?.renstraNilaiIds || src?.renstraNilaiIds || "",
        idRenstra: tgt?.idRenstra ?? src?.idRenstra ?? schedule.id,
        idRenstraOld: tgt?.idRenstraOld ?? src?.idRenstraOld ?? null,
        tahun: sample?.tahun ?? schedule.tahun,
        fakultasUnitId: sample?.fakultasUnitId ?? schedule.fakultasUnitId,
        fakultasUnitNama: sample?.fakultasUnit ?? schedule.fakultasUnitNama,
        indikatorId: sample?.indikatorId,
        title: sample?.namaIndikator || `Indikator #${censorId(tplId)}`,
        standar: sample?.namaStandar || "Standar Mutu Renstra",
        pertanyaan: sample?.pertanyaan ?? null,
        kategori: sample?.kategori ?? null,
        klasifikasi: sample?.klasifikasi ?? null,
        target: sample?.target ?? null,
        targetMin: sample?.targetMin ?? null,
        targetMax: sample?.targetMax ?? null,
        satuan: sample?.satuan ?? null,
        inT1,
        inT2,
        t1Tugas,
        t2BeforeTugas,
        t2AfterTugas: t1Tugas,
        isTugasMismatch,
        isDuplicate,
        rowCount: tgt?.rowCount || (inT1 ? 1 : 0),
        hasData: Boolean(tgt?.hasData || src?.hasData),
        capaian: tgt?.capaian ?? src?.capaian ?? null,
        catatan: tgt?.catatan ?? src?.catatan ?? null,
        linkBukti: tgt?.linkBukti ?? src?.linkBukti ?? null,
        capaianAuditor: tgt?.capaianAuditor ?? src?.capaianAuditor ?? null,
        catatanAuditor: tgt?.catatanAuditor ?? src?.catatanAuditor ?? null,
        createdAt: tgt?.createdAt ?? src?.createdAt ?? null,
        updatedAt: tgt?.updatedAt ?? src?.updatedAt ?? null,
        changeType,
      });
    });

    // Dokumen Tambahan
    const beforeDokMap = new Map();
    beforeDokumenTambahan.forEach((b) => {
      beforeDokMap.set(Number(b.templateId), b);
    });

    const afterDokMap = new Map();
    afterDokumenTambahan.forEach((a) => {
      afterDokMap.set(Number(a.templateId), a);
    });

    const allDokTplIds = Array.from(
      new Set([...afterDokMap.keys(), ...beforeDokMap.keys()])
    ).sort((a, b) => a - b);

    allDokTplIds.forEach((tplId) => {
      const src = afterDokMap.get(tplId) || null;
      const tgt = beforeDokMap.get(tplId) || null;
      const sample = src || tgt;

      const inT1 = Boolean(src);
      const inT2 = Boolean(tgt);

      const t1Tugas = src?.templateTugas || src?.tugas || "auditor2";
      const t2BeforeTugas = tgt?.tugas || tgt?.beforeTugas || "auditor2";
      const isTugasMismatch = inT1 && inT2 && t1Tugas !== t2BeforeTugas;
      const isDuplicate = (tgt?.rowCount || 0) > 1;

      let changeType = "same";
      if (inT1 && !inT2) {
        changeType = "insert";
      } else if (!inT1 && inT2) {
        changeType = "drop";
      } else if (isTugasMismatch || isDuplicate) {
        changeType = "update";
      }

      items.push({
        uniqueKey: `S_${schedule.id}_D_${tplId}`,
        type: "dokumen",
        templateId: tplId,
        targetRowIds: tgt?.dokumenTambahanIds || src?.dokumenTambahanIds || "",
        idRenstra: tgt?.idRenstra ?? src?.idRenstra ?? schedule.id,
        idRenstraOld: tgt?.idRenstraOld ?? src?.idRenstraOld ?? null,
        tahun: schedule.tahun,
        fakultasUnitId: schedule.fakultasUnitId,
        fakultasUnitNama: schedule.fakultasUnitNama,
        indikatorId: tplId,
        title: sample?.jenisFile || `Dokumen #${censorId(tplId)}`,
        standar: sample?.pertanyaan || "Dokumen Tambahan Audit",
        pertanyaan: sample?.pertanyaan ?? null,
        kategori: null,
        klasifikasi: sample?.klasifikasi ?? null,
        target: null,
        targetMin: null,
        targetMax: null,
        satuan: null,
        inT1,
        inT2,
        t1Tugas,
        t2BeforeTugas,
        t2AfterTugas: t1Tugas,
        isTugasMismatch,
        isDuplicate,
        rowCount: tgt?.rowCount || (inT1 ? 1 : 0),
        hasData: Boolean(
          tgt?.file ||
            src?.file ||
            tgt?.linkBukti ||
            tgt?.capaianAuditor ||
            tgt?.catatanAuditor
        ),
        file: tgt?.file ?? src?.file ?? null,
        capaian: null,
        catatan: null,
        linkBukti: tgt?.linkBukti ?? src?.linkBukti ?? null,
        capaianAuditor: tgt?.capaianAuditor ?? src?.capaianAuditor ?? null,
        catatanAuditor: tgt?.catatanAuditor ?? src?.catatanAuditor ?? null,
        createdAt: tgt?.createdAt ?? src?.createdAt ?? null,
        updatedAt: tgt?.updatedAt ?? src?.updatedAt ?? null,
        changeType,
      });
    });

    const orderRank = {
      update: 0,
      insert: 1,
      same: 2,
      drop: 3,
    };

    return items.sort((a, b) => {
      const diff = (orderRank[a.changeType] ?? 9) - (orderRank[b.changeType] ?? 9);
      if (diff !== 0) return diff;
      if (a.type !== b.type) return a.type === "renstra" ? -1 : 1;
      return a.templateId - b.templateId;
    });
  }, [
    schedule.id,
    schedule.tahun,
    schedule.fakultasUnitId,
    schedule.fakultasUnitNama,
    beforeRenstraNilai,
    afterRenstraNilai,
    beforeDokumenTambahan,
    afterDokumenTambahan,
  ]);

  const counts = useMemo(() => {
    return {
      total: pairedItems.length,
      update: pairedItems.filter((i) => i.changeType === "update").length,
      insert: pairedItems.filter((i) => i.changeType === "insert").length,
      same: pairedItems.filter((i) => i.changeType === "same").length,
      drop: pairedItems.filter((i) => i.changeType === "drop").length,
      t1Count: pairedItems.filter((i) => i.inT1).length,
      t2Count: pairedItems.length,
    };
  }, [pairedItems]);

  const filteredItems = useMemo(() => {
    let result = pairedItems;

    if (instrumentType === "renstra") {
      result = result.filter((r) => r.type === "renstra");
    } else if (instrumentType === "dokumen") {
      result = result.filter((r) => r.type === "dokumen");
    }

    if (activeFilter !== "all") {
      result = result.filter((r) => r.changeType === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          String(r.title || "").toLowerCase().includes(q) ||
          String(r.standar || "").toLowerCase().includes(q) ||
          String(r.templateId || "").toLowerCase().includes(q) ||
          String(r.targetRowIds || "").toLowerCase().includes(q) ||
          String(r.t1Tugas || "").toLowerCase().includes(q) ||
          String(r.t2BeforeTugas || "").toLowerCase().includes(q) ||
          String(r.catatan || "").toLowerCase().includes(q) ||
          String(r.catatanAuditor || "").toLowerCase().includes(q) ||
          String(r.capaian || "").toLowerCase().includes(q) ||
          String(r.capaianAuditor || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [pairedItems, instrumentType, activeFilter, searchQuery]);

  const target1List = useMemo(
    () => filteredItems.filter((item) => item.inT1),
    [filteredItems]
  );

  const target2List = useMemo(() => filteredItems, [filteredItems]);

  const updateSvgLines = () => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newLines = [];

    filteredItems.forEach((item) => {
      if (!item.inT1) return;

      const leftEl = document.getElementById(`t1-node-${item.uniqueKey}`);
      const rightEl = document.getElementById(`t2-node-${item.uniqueKey}`);
      if (!leftEl || !rightEl) return;

      const lRect = leftEl.getBoundingClientRect();
      const rRect = rightEl.getBoundingClientRect();

      const x1 = lRect.right - canvasRect.left;
      const y1 = lRect.top + lRect.height / 2 - canvasRect.top;

      const x2 = rRect.left - canvasRect.left;
      const y2 = rRect.top + rRect.height / 2 - canvasRect.top;

      const dx = Math.max(24, Math.abs(x2 - x1) * 0.42);
      const pathD = `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;

      newLines.push({
        id: `line-${item.uniqueKey}`,
        itemKey: item.uniqueKey,
        pathD,
        x1,
        y1,
        x2,
        y2,
        changeType: item.changeType,
      });
    });

    setLineCoords(newLines);
  };

  useLayoutEffect(() => {
    const timer = requestAnimationFrame(updateSvgLines);
    return () => cancelAnimationFrame(timer);
  }, [filteredItems]);

  useEffect(() => {
    const handleResizeOrScroll = () => {
      updateSvgLines();
    };
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [filteredItems]);

  const renderFieldValue = (val) => {
    if (val === null || val === undefined || String(val).trim() === "") {
      return <span className="text-gray-400 italic">NULL</span>;
    }
    const str = String(val).trim();
    if (str.startsWith("http://") || str.startsWith("https://")) {
      return (
        <a
          href={str}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {str}
        </a>
      );
    }
    return <span className="break-words">{str}</span>;
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
      {/* HEADER INFO JADWAL & FILTER BAR */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/70 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-xs font-bold">
                Tahun {schedule.tahun}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-gray-200/80 text-gray-700 text-xs font-semibold uppercase">
                {schedule.fakultasUnitType}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                {schedule.fakultasUnitNama}
                {schedule.jenjang ? ` (${schedule.jenjang})` : ""}
              </h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-xs text-gray-600">
              <span>
                Auditee:{" "}
                <strong className="text-gray-900">{schedule.auditeeName || "-"}</strong>
              </span>
              <span>
                Auditor 1:{" "}
                <strong className="text-gray-900">
                  {schedule.auditor1Name || "(Kosong)"}
                </strong>
              </span>
              <span>
                Auditor 2:{" "}
                <strong className="text-gray-900">
                  {schedule.auditor2Name || "(Kosong)"}
                </strong>
              </span>
            </div>
          </div>

          {/* LEGENDA WARNA SESUAI INSTRUKSI */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 border border-amber-400 text-amber-950 font-bold">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
              Kuning: Update ({counts.update})
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/90 border border-emerald-400 text-emerald-950 font-bold">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              Hijau: Tambah ({counts.insert})
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100/90 border border-rose-400 text-rose-950 font-bold">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
              Merah: Drop ({counts.drop})
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-xs bg-gray-700" />
              Tetap ({counts.same})
            </span>
          </div>
        </div>

        {/* FILTER & SEARCH BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-gray-200/70">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {[
              { id: "all", label: `Semua (${counts.total})`, activeCls: "bg-gray-900 text-white" },
              {
                id: "update",
                label: `Kuning / Update (${counts.update})`,
                activeCls: "bg-amber-500 text-white",
              },
              {
                id: "insert",
                label: `Hijau / Tambah (${counts.insert})`,
                activeCls: "bg-emerald-600 text-white",
              },
              {
                id: "drop",
                label: `Merah / Drop (${counts.drop})`,
                activeCls: "bg-rose-600 text-white",
              },
              {
                id: "same",
                label: `Tetap (${counts.same})`,
                activeCls: "bg-gray-700 text-white",
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  activeFilter === f.id
                    ? `${f.activeCls} shadow-2xs`
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl bg-gray-200/70 p-0.5 border border-gray-200 text-xs">
              {[
                { id: "all", label: "Semua" },
                { id: "renstra", label: "Renstra" },
                { id: "dokumen", label: "Dokumen" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInstrumentType(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    instrumentType === tab.id
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[230px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari indikator, catatan, capaian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-300 rounded-xl bg-white focus:border-purple-600 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CANVAS 2 CONTAINER (TARGET 1 KIRI <---> TARGET 2 KANAN) */}
      <div className="relative p-6 sm:p-8 bg-slate-50/50" ref={canvasRef}>
        {/* LAYER GARIS PENGHUBUNG SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none hidden md:block overflow-visible select-none z-20"
          style={{ width: "100%", height: "100%" }}
        >
          {lineCoords.map((line) => {
            const isHovered = hoveredKey === line.itemKey;
            const strokeColor =
              line.changeType === "update" || line.changeType === "insert"
                ? "#D97706"
                : "#1F2937";

            return (
              <g key={line.id}>
                <path
                  d={line.pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 3.2 : 2}
                  opacity={hoveredKey && !isHovered ? 0.2 : 0.95}
                  className="transition-all duration-150"
                />
                <circle
                  cx={line.x1}
                  cy={line.y1}
                  r={isHovered ? 4.5 : 3.5}
                  fill={strokeColor}
                  opacity={hoveredKey && !isHovered ? 0.2 : 1}
                />
                <circle
                  cx={line.x2}
                  cy={line.y2}
                  r={isHovered ? 4.5 : 3.5}
                  fill={strokeColor}
                  opacity={hoveredKey && !isHovered ? 0.2 : 1}
                />
              </g>
            );
          })}
        </svg>

        {filteredItems.length === 0 ? (
          <div className="py-14 text-center bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
            <HelpCircle className="w-9 h-9 text-gray-300 mx-auto" />
            <h5 className="text-sm font-bold text-gray-800">
              Tidak ada item komparasi yang cocok
            </h5>
            <p className="text-xs text-gray-500">
              Coba ubah filter warna atau kata kunci pencarian di atas.
            </p>
          </div>
        ) : (
          <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-16 items-start z-10">
            {/* ================= KOTAK KIRI: TARGET 1 (DATA SUMBER / TEMPLATE_RENSTRA) ================= */}
            <div className="md:col-span-5 bg-white border-2 border-gray-800 rounded-2xl p-5 shadow-xs">
              <div className="text-center pb-4 mb-4 border-b border-gray-200">
                <div className="text-base font-extrabold text-gray-900">
                  Target 1 (Data Sumber)
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">
                  template_renstra &amp; template_dokumen_tambahan ({target1List.length} item)
                </div>
              </div>

              <div className="space-y-3.5">
                {target1List.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    Tidak ada item di Target 1 untuk filter ini
                  </div>
                ) : (
                  target1List.map((item) => {
                    const isHovered = hoveredKey === item.uniqueKey;
                    const isCopied = copiedItemKey === item.uniqueKey;

                    return (
                      <div
                        key={`t1-${item.uniqueKey}`}
                        id={`t1-node-${item.uniqueKey}`}
                        onMouseEnter={() => setHoveredKey(item.uniqueKey)}
                        onMouseLeave={() => setHoveredKey(null)}
                        className={`p-4 rounded-xl border transition-all ${
                          isHovered
                            ? "border-gray-900 bg-gray-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-gray-500 select-none">
                              {item.type === "renstra"
                                ? `template_renstra.id=${censorId(item.templateId)}`
                                : `template_dokumen.id=${censorId(item.templateId)}`}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyPairIds(e, item)}
                              className="p-1 rounded-md text-gray-400 hover:text-purple-700 hover:bg-purple-50 transition cursor-pointer"
                              title="Salin ID Sumber (Target 1) & Tujuan (Target 2)"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {item.type === "renstra" ? "Renstra" : "Dokumen"}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-gray-900 leading-snug">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {item.standar}
                        </div>

                        {/* SELURUH FIELD TABEL TEMPLATE_RENSTRA / TEMPLATE_DOKUMEN_TAMBAHAN */}
                        <div className="mt-3 pt-2.5 border-t border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                          <div>
                            <span className="font-mono text-gray-500">tahun: </span>
                            <strong className="text-gray-900">{renderFieldValue(item.tahun)}</strong>
                          </div>
                          <div>
                            <span className="font-mono text-gray-500">fakultas_unit: </span>
                            <strong className="text-gray-900">
                              {censorId(item.fakultasUnitId)} ({item.fakultasUnitNama})
                            </strong>
                          </div>
                          {item.type === "renstra" ? (
                            <>
                              <div>
                                <span className="font-mono text-gray-500">indikator: </span>
                                <strong className="text-gray-900">{censorId(item.indikatorId)}</strong>
                              </div>
                              <div>
                                <span className="font-mono text-gray-500">pertanyaan: </span>
                                <strong className="text-gray-900">{renderFieldValue(item.pertanyaan)}</strong>
                              </div>
                              <div>
                                <span className="font-mono text-gray-500">kategori: </span>
                                <strong className="text-gray-900">{renderFieldValue(item.kategori)}</strong>
                              </div>
                              <div>
                                <span className="font-mono text-gray-500">klasifikasi: </span>
                                <strong className="text-gray-900">{renderFieldValue(item.klasifikasi)}</strong>
                              </div>
                              <div>
                                <span className="font-mono text-gray-500">target: </span>
                                <strong className="text-gray-900">{renderFieldValue(item.target)}</strong>
                              </div>
                              <div>
                                <span className="font-mono text-gray-500">satuan: </span>
                                <strong className="text-gray-900">{renderFieldValue(item.satuan)}</strong>
                              </div>
                              <div>
                                <span className="font-mono text-gray-500">target_min: </span>
                                <strong className="text-gray-900">{renderFieldValue(item.targetMin)}</strong>
                              </div>
                              <div>
                                <span className="font-mono text-gray-500">target_max: </span>
                                <strong className="text-gray-900">{renderFieldValue(item.targetMax)}</strong>
                              </div>
                            </>
                          ) : (
                            <div className="sm:col-span-2">
                              <span className="font-mono text-gray-500">klasifikasi: </span>
                              <strong className="text-gray-900">{renderFieldValue(item.klasifikasi)}</strong>
                            </div>
                          )}
                          <div className="sm:col-span-2 pt-1">
                            <span className="font-mono text-gray-500">tugas: </span>
                            <span className="font-mono font-bold text-gray-900">
                              - {item.t1Tugas}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ================= SPACER TENGAH UNTUK JALUR GARIS LINKED ================= */}
            <div className="hidden md:block md:col-span-2" />

            {/* ================= KOTAK KANAN: TARGET 2 (DATA TARGET / RENSTRA_NILAI) ================= */}
            <div className="md:col-span-5 bg-white border-2 border-gray-800 rounded-2xl p-5 shadow-xs">
              <div className="text-center pb-4 mb-4 border-b border-gray-200">
                <div className="text-base font-extrabold text-gray-900">
                  Target 2 (Data Target)
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">
                  renstra_nilai &amp; dokumen_tambahan ({target2List.length} item)
                </div>
              </div>

              <div className="space-y-3.5">
                {target2List.map((item) => {
                  const isHovered = hoveredKey === item.uniqueKey;
                  const isCopied = copiedItemKey === item.uniqueKey;

                  let boxClass = "bg-white border-gray-200 text-gray-900";
                  let badgeText = "Tetap";
                  let badgeClass = "bg-gray-100 text-gray-700 border-gray-300";
                  let dividerClass = "border-gray-200/80";

                  if (item.changeType === "update") {
                    boxClass = "bg-amber-100/85 border-2 border-amber-500 text-gray-900";
                    badgeText = item.isDuplicate
                      ? `Update & Gabung Duplikat (${item.rowCount}x)`
                      : "Update Data";
                    badgeClass = "bg-amber-200/90 text-amber-950 border-amber-500";
                    dividerClass = "border-amber-300/80";
                  } else if (item.changeType === "insert") {
                    boxClass = "bg-emerald-100/85 border-2 border-emerald-600 text-gray-900";
                    badgeText = "Tambah Baru (Insert)";
                    badgeClass = "bg-emerald-200/90 text-emerald-950 border-emerald-600";
                    dividerClass = "border-emerald-300/80";
                  } else if (item.changeType === "drop") {
                    boxClass = "bg-rose-100/85 border-2 border-rose-600 text-gray-900";
                    badgeText = "Drop / Hapus";
                    badgeClass = "bg-rose-200/90 text-rose-950 border-rose-600";
                    dividerClass = "border-rose-300/80";
                  }

                  return (
                    <div
                      key={`t2-${item.uniqueKey}`}
                      id={`t2-node-${item.uniqueKey}`}
                      onMouseEnter={() => setHoveredKey(item.uniqueKey)}
                      onMouseLeave={() => setHoveredKey(null)}
                      className={`p-4 rounded-xl border transition-all ${boxClass} ${
                        isHovered ? "ring-2 ring-gray-900 shadow-md" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-gray-700 select-none">
                            {item.inT2
                              ? item.type === "renstra"
                                ? `renstra_nilai.id=${censorId(item.targetRowIds)}`
                                : `dokumen_tambahan.id=${censorId(item.targetRowIds)}`
                              : `template_id=${censorId(item.templateId)} (Baru)`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPairIds(e, item)}
                            className="p-1 rounded-md text-gray-600 hover:text-purple-800 hover:bg-black/5 transition cursor-pointer"
                            title="Salin ID Sumber (Target 1) & Tujuan (Target 2)"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${badgeClass}`}
                        >
                          {badgeText}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-gray-900 leading-snug">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        {item.standar}
                      </div>

                      {/* SELURUH FIELD TABEL RENSTRA_NILAI / DOKUMEN_TAMBAHAN */}
                      <div className={`mt-3 pt-2.5 border-t ${dividerClass} space-y-1.5 text-[11px]`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                          <div>
                            <span className="font-mono text-gray-600">id_renstra: </span>
                            <strong className="font-mono text-gray-900">
                              {censorId(item.idRenstra)}
                            </strong>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="font-mono text-gray-600">
                              {item.type === "renstra"
                                ? "template_renstra: "
                                : "id_template_dokumen_tambahan: "}
                            </span>
                            <strong className="font-mono text-gray-900">
                              {censorId(item.templateId)}
                            </strong>
                          </div>
                        </div>

                        {/* FIELD TUGAS */}
                        <div className="pt-0.5">
                          <span className="font-mono text-gray-600">tugas: </span>
                          {item.changeType === "update" ? (
                            <span className="font-mono font-bold text-amber-950 inline-flex items-center gap-1.5 flex-wrap">
                              <span>- {item.t2BeforeTugas}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
                              <span className="underline decoration-amber-700">
                                {item.t2AfterTugas} (sesudah)
                              </span>
                            </span>
                          ) : item.changeType === "insert" ? (
                            <span className="font-mono font-bold text-emerald-950">
                              - {item.t1Tugas}
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-gray-900">
                              - {item.t2BeforeTugas}
                            </span>
                          )}
                        </div>

                        {item.type === "renstra" ? (
                          <div className="space-y-1 pt-1">
                            <div>
                              <span className="font-mono text-gray-600">capaian: </span>
                              <strong className="text-gray-900">
                                {renderFieldValue(item.capaian)}
                              </strong>
                            </div>
                            <div>
                              <span className="font-mono text-gray-600">catatan: </span>
                              <span className="text-gray-900 font-medium">
                                {renderFieldValue(item.catatan)}
                              </span>
                            </div>
                            <div>
                              <span className="font-mono text-gray-600">link_bukti: </span>
                              <span className="text-gray-900">
                                {renderFieldValue(item.linkBukti)}
                              </span>
                            </div>
                            <div>
                              <span className="font-mono text-gray-600">capaian_auditor: </span>
                              <strong className="text-gray-900">
                                {renderFieldValue(item.capaianAuditor)}
                              </strong>
                            </div>
                            <div>
                              <span className="font-mono text-gray-600">catatan_auditor: </span>
                              <span className="text-gray-900 font-medium">
                                {renderFieldValue(item.catatanAuditor)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 pt-1">
                            <div>
                              <span className="font-mono text-gray-600">file: </span>
                              <span className="text-gray-900 font-medium">
                                {renderFieldValue(item.file)}
                              </span>
                            </div>
                            <div>
                              <span className="font-mono text-gray-600">link_bukti: </span>
                              <span className="text-gray-900">
                                {renderFieldValue(item.linkBukti)}
                              </span>
                            </div>
                            <div>
                              <span className="font-mono text-gray-600">capaian_auditor: </span>
                              <strong className="text-gray-900">
                                {renderFieldValue(item.capaianAuditor)}
                              </strong>
                            </div>
                            <div>
                              <span className="font-mono text-gray-600">catatan_auditor: </span>
                              <span className="text-gray-900 font-medium">
                                {renderFieldValue(item.catatanAuditor)}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[10px] text-gray-500">
                          <div>
                            <span className="font-mono">created_at: </span>
                            <span>{renderFieldValue(item.createdAt)}</span>
                          </div>
                          <div>
                            <span className="font-mono">updated_at: </span>
                            <span>{renderFieldValue(item.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ScheduleAuditGeneratePage = () => {
  const navigate = useNavigate();
  const { uuidSchedule } = useParams();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } =
    useContent();

  const uuids = useMemo(() => {
    const raw = [];
    if (uuidSchedule) raw.push(uuidSchedule);
    const q = searchParams.get("uuids") || searchParams.get("uuid") || "";
    if (q) {
      q.split(",").forEach((part) => {
        const trimmed = part.trim();
        if (trimmed) raw.push(trimmed);
      });
    }
    return Array.from(new Set(raw));
  }, [uuidSchedule, searchParams]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [activeScheduleIdx, setActiveScheduleIdx] = useState("all");

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  const fetchPreview = async () => {
    if (uuids.length === 0) {
      setError("Tidak ada jadwal audit yang dipilih untuk di-generate.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fd = new FormData();
      fd.append("uuids", uuids.join(","));
      const res = await apiClient.post("/renstra/generate/preview", fd);
      const payload = res?.data ?? res;
      setPreviewData(payload);
    } catch (err) {
      setError(err?.message || "Gagal memuat preview perbandingan data generate.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [uuids.join(",")]);

  const items = previewData?.items || [];

  const visibleSchedules = useMemo(() => {
    if (activeScheduleIdx === "all") return items;
    const idx = Number(activeScheduleIdx);
    if (!Number.isNaN(idx) && items[idx]) return [items[idx]];
    return items;
  }, [items, activeScheduleIdx]);

  const isConfirmationValid = confirmInput.trim() === REQUIRED_CONFIRMATION;

  const handleExecuteGenerate = async () => {
    if (!isConfirmationValid) return;

    try {
      setExecuting(true);
      const fd = new FormData();
      fd.append("uuids", uuids.join(","));
      fd.append("confirmation", confirmInput.trim());
      const res = await apiClient.post("/renstra/generate/execute", fd);
      const payload = res?.data ?? res;
      addToast(
        "success",
        payload?.message || "Berhasil generate data renstra & dokumen tambahan"
      );
      setConfirmModalOpen(false);
      setConfirmInput("");
      await fetchPreview();
    } catch (err) {
      addToast("error", err?.message || "Gagal mengeksekusi generate data");
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyPhrase = () => {
    navigator.clipboard?.writeText(REQUIRED_CONFIRMATION);
    setCopiedPhrase(true);
    setTimeout(() => setCopiedPhrase(false), 1800);
  };

  return (
    <>
      <Navbar
        renderChangeLevelModal={() => (
          <ChangeLevelModal
            open={openChangeLevel}
            onClose={() => setOpenChangeLevel(false)}
            levels={listLevel}
            currentLevel={level}
            onSubmit={(val) => {
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />

      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen space-y-5 w-full max-w-full">
        {/* TOP HEADER */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <Link
              to="/schedule_audit"
              className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition shrink-0"
              title="Kembali ke Schedule Audit"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <nav className="text-xs text-gray-500 mb-0.5">
                <ol className="inline-flex items-center gap-1.5">
                  <li>
                    <Link to="/schedule_audit" className="hover:text-purple-700">
                      Schedule Audit
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="text-gray-800 font-semibold">
                    Generate
                  </li>
                </ol>
              </nav>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                Preview Perbandingan Data
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchPreview}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Muat Ulang Preview</span>
            </button>

            <button
              type="button"
              disabled={loading || items.length === 0}
              onClick={() => {
                setConfirmInput("");
                setConfirmModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Generate Data ({items.length} Jadwal)</span>
            </button>
          </div>
        </div>

        {/* MULTI-SCHEDULE SELECTOR */}
        {!loading && !error && items.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-600 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-700" />
              Pilih Target Audit:
            </span>
            <button
              type="button"
              onClick={() => setActiveScheduleIdx("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeScheduleIdx === "all"
                  ? "bg-purple-700 text-white shadow-2xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Semua Target ({items.length})
            </button>
            {items.map((item, idx) => (
              <button
                key={item.schedule.uuid}
                type="button"
                onClick={() => setActiveScheduleIdx(String(idx))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeScheduleIdx === String(idx)
                    ? "bg-purple-700 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {item.schedule.fakultasUnitNama} ({item.schedule.tahun})
              </button>
            ))}
          </div>
        )}

        {/* LOADING SKELETON */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-600">
              Memuat perbandingan Target 1 (template_renstra) dan Target 2 (renstra_nilai)...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="text-sm font-bold text-rose-900">{error}</h3>
            <button
              type="button"
              onClick={() => navigate("/schedule_audit")}
              className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              Kembali ke Schedule Audit
            </button>
          </div>
        )}

        {/* LINKED COMPARISON CARDS PER SCHEDULE */}
        {!loading &&
          !error &&
          visibleSchedules.map((comp) => (
            <ScheduleLinkedComparisonCard key={comp.schedule.uuid} comp={comp} />
          ))}

        {/* CONFIRMATION MODAL */}
        {confirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">
                  Konfirmasi Generate Data Renstra
                </h3>
                <button
                  type="button"
                  onClick={() => !executing && setConfirmModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p>
                      <strong>Peringatan:</strong> Tindakan ini akan melakukan sinkronisasi{" "}
                      <strong>Nilai Renstra</strong> dan <strong>Dokumen Tambahan</strong> pada{" "}
                      <strong>{items.length} jadwal audit</strong> terpilih (menggabungkan baris duplikat ke baris survivor, menyesuaikan penugasan auditor sesuai template_renstra, mempertahankan isian &amp; relasi KTS, menambah indikator template baru, serta menghapus template yang tidak berlaku).
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-700">
                      Ketik kalimat berikut untuk mengonfirmasi:
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyPhrase}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 cursor-pointer"
                      title="Salin kalimat konfirmasi"
                    >
                      {copiedPhrase ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Kalimat</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-rose-600 select-all leading-relaxed">
                    "{REQUIRED_CONFIRMATION}"
                  </div>

                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Ketik kalimat konfirmasi di sini..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/25 focus:border-rose-600"
                    autoFocus
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={executing}
                  onClick={() => setConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!isConfirmationValid || executing}
                  onClick={handleExecuteGenerate}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {executing && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Konfirmasi &amp; Generate Data</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ScheduleAuditGeneratePage;
