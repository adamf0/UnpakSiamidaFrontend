import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  X,
  FileCheck2,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Tag,
  UserCheck,
  Building2,
  GraduationCap,
  Users,
  Check,
  Search,
} from "lucide-react";

/**
 * Format label kategori (misal: "prodi#s1" -> "Prodi S1")
 */
function formatKategoriLabel(kategori) {
  if (!kategori) return "Unit";
  const clean = String(kategori).trim().toLowerCase();
  if (clean === "prodi#all") return "Semua Prodi";
  if (clean === "fakultas#all") return "Semua Fakultas";
  if (clean === "unit#all") return "Semua Unit";
  if (clean.includes("#")) {
    const [scope, level] = clean.split("#");
    if (scope === "fakultas") return `Fakultas (${level.toUpperCase()})`;
    if (scope === "prodi") return `Prodi ${level.toUpperCase()}`;
    return `${level.toUpperCase()} (${scope})`;
  }
  return kategori;
}

/**
 * Komponen list badge penerima (siapa saja yang dapat)
 */
function RecipientBadgesList({
  currentUnitName,
  recipients = [],
  activeColor = "indigo",
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const cleanCurrent = (currentUnitName || "").trim().toLowerCase();

  // Urutkan agar current unit selalu paling depan
  const sorted = useMemo(() => {
    return [...recipients].sort((a, b) => {
      const isACur = a.trim().toLowerCase() === cleanCurrent;
      const isBCur = b.trim().toLowerCase() === cleanCurrent;
      if (isACur && !isBCur) return -1;
      if (!isACur && isBCur) return 1;
      return a.localeCompare(b);
    });
  }, [recipients, cleanCurrent]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.trim().toLowerCase();
    return sorted.filter((r) => r.toLowerCase().includes(q));
  }, [sorted, search]);

  const INITIAL_LIMIT = 4;
  const showToggle = sorted.length > INITIAL_LIMIT;
  const displayed = expanded ? filtered : filtered.slice(0, INITIAL_LIMIT);
  const remainingCount = Math.max(0, sorted.length - INITIAL_LIMIT);

  return (
    <div className="space-y-1.5 pt-1">
      {expanded && sorted.length > 6 && (
        <div className="relative mb-2">
          <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama prodi/unit penerima..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-[11px] bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-400"
          />
        </div>
      )}

      <div
        className={`flex flex-wrap gap-1 ${
          expanded ? "max-h-44 overflow-y-auto pr-1" : ""
        }`}
      >
        {displayed.map((unitName, uIdx) => {
          const isCurrent = unitName.trim().toLowerCase() === cleanCurrent;
          return (
            <span
              key={uIdx}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition ${
                isCurrent
                  ? activeColor === "emerald"
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "bg-indigo-600 text-white font-bold shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              {isCurrent && <Check className="w-2.5 h-2.5" />}
              <span>{unitName}</span>
              {isCurrent && (
                <span className="opacity-90 font-medium text-[9px]">
                  (Unit Ini)
                </span>
              )}
            </span>
          );
        })}

        {showToggle && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 transition cursor-pointer"
          >
            +{remainingCount} stakeholder lainnya (Lihat Semua)
          </button>
        )}
      </div>

      {showToggle && expanded && (
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setSearch("");
          }}
          className="text-[10px] font-semibold text-indigo-600 hover:underline pt-0.5 inline-block cursor-pointer"
        >
          Tampilkan Lebih Sedikit ↑
        </button>
      )}
    </div>
  );
}

export default function PemetaanDetailModal({
  open,
  onClose,
  data,
  tahun,
  onSetTarget1,
  onSetTarget2,
}) {
  const [activeTab, setActiveTab] = useState("renstra");
  const [modalSearch, setModalSearch] = useState("");

  if (!open || !data) return null;

  const {
    nama,
    jenjang,
    type,
    fakultas,
    totalPemetaan,
    renstraList = [],
    dokumenTambahanList = [],
    isUnmapped,
  } = data;

  // Filter list berdasarkan pencarian pengguna di dalam modal
  const filteredRenstra = renstraList.filter((item) => {
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase();
    return (
      (item.Indikator || "").toLowerCase().includes(q) ||
      (item.StandarRenstra || "").toLowerCase().includes(q) ||
      (item.Klasifikasi || "").toLowerCase().includes(q) ||
      (item.Tugas || "").toLowerCase().includes(q)
    );
  });

  const filteredDokumen = dokumenTambahanList.filter((doc) => {
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase();
    return (
      (doc.Pertanyaan || "").toLowerCase().includes(q) ||
      (doc.JenisFile || "").toLowerCase().includes(q) ||
      (doc.Klasifikasi || "").toLowerCase().includes(q) ||
      (doc.Tugas || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between px-6 py-5 border-b bg-gray-50/70">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isUnmapped
                  ? "bg-rose-100 text-rose-600 border border-rose-200"
                  : "bg-indigo-100 text-indigo-700 border border-indigo-200"
              }`}
            >
              {type === "prodi" ? (
                <GraduationCap className="w-6 h-6" />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {nama}
                </h3>
                {jenjang && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-gray-200 text-gray-800 uppercase">
                    {jenjang}
                  </span>
                )}
                {isUnmapped ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    <AlertCircle className="w-3 h-3" />
                    Belum Terpetakan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Terpetakan ({totalPemetaan} Template)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {type === "prodi"
                  ? `Fakultas: ${fakultas || "-"}`
                  : `Tipe: ${type?.toUpperCase()}`}{" "}
                • Tahun Evaluasi:{" "}
                <span className="font-semibold text-gray-700">{tahun}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS & MODAL SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b px-6 bg-white gap-3 py-2 sm:py-0">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("renstra")}
              className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === "renstra"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Indikator Renstra</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  renstraList.length > 0
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {renstraList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("dokumen")}
              className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === "dokumen"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dokumen Tambahan</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  dokumenTambahanList.length > 0
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {dokumenTambahanList.length}
              </span>
            </button>
          </div>

          {/* Quick Search di dalam modal */}
          <div className="relative py-1.5 sm:py-0">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari indikator di unit ini..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="w-full sm:w-56 pl-8 pr-3 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white"
            />
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === "renstra" ? (
            renstraList.length === 0 ? (
              <div className="text-center py-10 px-4 bg-rose-50/50 rounded-xl border border-rose-150">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-gray-800">
                  Tidak Ada Template Renstra Terpetakan
                </h4>
                <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
                  Unit ini belum memiliki indikator renstra yang dipetakan pada
                  tahun {tahun}. Anda dapat melakukan pemetaan melalui menu
                  Template Renstra.
                </p>
                <Link
                  to="/template_renstra"
                  className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  Buka Form Template Renstra
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : filteredRenstra.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                Tidak ada indikator renstra yang cocok dengan kata kunci "
                {modalSearch}".
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRenstra.map((item, idx) => (
                  <div
                    key={item.indikatorId || item.indikatorUuid || idx}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 transition shadow-2xs space-y-3"
                  >
                    {/* Header Indikator */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {item.StandarRenstra && (
                          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                            {item.StandarRenstra}
                          </span>
                        )}
                        <h5 className="text-sm font-bold text-gray-900 leading-snug mt-0.5">
                          {item.Indikator || "Indikator Renstra"}
                        </h5>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {item.hasDupe && (
                          <span
                            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 shadow-2xs"
                            title={`Ditemukan ${item.dupeCount + 1} row di database dengan indikator & tugas yang sama (ID: ${item.dupeRowIds?.join(", ") || "N/A"}). Terindikasi salah generate / bad SQL.`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            {item.dupeCount + 1}x Dupe di DB
                          </span>
                        )}
                        {item.Klasifikasi && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200 capitalize">
                            {item.Klasifikasi}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Target & Tugas */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 pt-1 border-t border-gray-100">
                      {item.Tugas && (
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                          Tugas:{" "}
                          <strong className="text-gray-700">
                            {item.Tugas}
                          </strong>
                        </span>
                      )}
                      {(item.Target || item.Satuan) && (
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-gray-400" />
                          Target:{" "}
                          <strong className="text-gray-700">
                            {item.Target || "-"} {item.Satuan || ""}
                          </strong>
                        </span>
                      )}
                    </div>

                    {/* SIAPA YANG DAPAT (PRODI / FAKULTAS / UNIT) */}
                    <div className="pt-2 border-t border-gray-100 bg-gray-50/70 -mx-4 -mb-4 p-3 rounded-b-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          Sasaran Penerima (
                          <strong className="text-indigo-700">
                            {item.recipientCount ||
                              item.recipientUnits?.length ||
                              1}
                          </strong>{" "}
                          Stakeholder):
                        </span>

                        {/* Badge Kategori Sasaran */}
                        {item.recipientCategories?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.recipientCategories.map((kat, kIdx) => (
                              <span
                                key={kIdx}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700"
                              >
                                {formatKategoriLabel(kat)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* List Prodi/Fakultas/Unit yang dapat */}
                      {item.recipientUnits && item.recipientUnits.length > 0 ? (
                        <RecipientBadgesList
                          currentUnitName={nama}
                          recipients={item.recipientUnits}
                          activeColor="indigo"
                        />
                      ) : (
                        <p className="text-[11px] text-gray-500 italic">
                          Diberikan khusus untuk unit: {nama}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : dokumenTambahanList.length === 0 ? (
            <div className="text-center py-10 px-4 bg-rose-50/50 rounded-xl border border-rose-150">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2 opacity-80" />
              <h4 className="text-sm font-bold text-gray-800">
                Tidak Ada Dokumen Tambahan Terpetakan
              </h4>
              <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
                Unit ini belum memiliki instrumen dokumen tambahan yang
                dipetakan pada tahun {tahun}. Silakan petakan melalui menu
                Template Dokumen Tambahan.
              </p>
              <Link
                to="/template_dokumen_tambahan"
                className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Buka Form Dokumen Tambahan
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : filteredDokumen.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              Tidak ada dokumen tambahan yang cocok dengan kata kunci "
              {modalSearch}".
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDokumen.map((doc, idx) => (
                <div
                  key={doc.jenisFileId || doc.jenisFileUuid || idx}
                  className="p-4 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 transition shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">
                        {doc.JenisFile || "Dokumen Tambahan"}
                      </span>
                      <h5 className="text-sm font-bold text-gray-900 leading-snug mt-0.5">
                        {doc.Pertanyaan || "Dokumen Acuan Pendukung"}
                      </h5>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {doc.hasDupe && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 shadow-2xs"
                          title={`Ditemukan ${doc.dupeCount + 1} row di database dengan dokumen & tugas yang sama (ID: ${doc.dupeRowIds?.join(", ") || "N/A"}). Terindikasi salah generate / bad SQL.`}
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          {doc.dupeCount + 1}x Dupe di DB
                        </span>
                      )}
                      {doc.Klasifikasi && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                          {doc.Klasifikasi}
                        </span>
                      )}
                    </div>
                  </div>

                  {doc.Tugas && (
                    <div className="text-xs text-gray-500 pt-1 border-t border-gray-100 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                      Auditor Pembagian Tugas:{" "}
                      <strong className="text-gray-700">{doc.Tugas}</strong>
                    </div>
                  )}

                  {/* SIAPA YANG DAPAT (DOKUMEN TAMBAHAN) */}
                  <div className="pt-2 border-t border-gray-100 bg-gray-50/70 -mx-4 -mb-4 p-3 rounded-b-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        Sasaran Penerima (
                        <strong className="text-emerald-700">
                          {doc.recipientCount ||
                            doc.recipientUnits?.length ||
                            1}
                        </strong>{" "}
                        Stakeholder):
                      </span>

                      {doc.recipientTargets?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doc.recipientTargets.map((tgt, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700"
                            >
                              {formatKategoriLabel(tgt)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* List unit yang dapat */}
                    {doc.recipientUnits && doc.recipientUnits.length > 0 ? (
                      <RecipientBadgesList
                        currentUnitName={nama}
                        recipients={doc.recipientUnits}
                        activeColor="emerald"
                      />
                    ) : (
                      <p className="text-[11px] text-gray-500 italic">
                        Diberikan khusus untuk unit: {nama}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <Link
              to="/template_renstra"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Kelola Renstra →
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              to="/template_dokumen_tambahan"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Kelola Dok. Tambahan →
            </Link>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
