import React, { useState, useMemo } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Database,
  Code2,
  FileText,
  Building2,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import { formatProdiWithJenjang } from "@/Common/Utils";

export default function DupeIncidentModal({
  open,
  onClose,
  incidents = [],
  tahun,
  isAdmin: propIsAdmin,
}) {
  const { user } = useAuth();
  const { level } = useContent();
  const currentLevel = String(level || user?.level || "").toLowerCase().trim();
  const isAdmin =
    propIsAdmin !== undefined
      ? Boolean(propIsAdmin)
      : currentLevel === "admin";

  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  // Total baris berlebih
  const totalExtraRows = useMemo(() => {
    return incidents.reduce((acc, inc) => acc + (inc.count - 1), 0);
  }, [incidents]);

  // Filter list
  const filteredIncidents = useMemo(() => {
    if (!search.trim()) return incidents;
    const q = search.trim().toLowerCase();
    return incidents.filter(
      (inc) =>
        (inc.indikator || inc.jenisFile || "").toLowerCase().includes(q) ||
        (inc.unitNama || inc.target || "").toLowerCase().includes(q) ||
        (inc.standar || "").toLowerCase().includes(q) ||
        (inc.tugas || "").toLowerCase().includes(q) ||
        (inc.reason || "").toLowerCase().includes(q)
    );
  }, [incidents, search]);

  const cleanupSql = useMemo(() => {
    const extraIds = [];
    incidents.forEach((inc) => {
      if (inc.rowIds && inc.rowIds.length > 1) {
        extraIds.push(...inc.rowIds.slice(1));
      }
    });

    if (extraIds.length > 0) {
      const uniqueIds = Array.from(new Set(extraIds));
      return `-- 1. Query Pembersihan Baris Duplikat Berlebih Berdasarkan ID Terdeteksi (${uniqueIds.length} Baris):
DELETE FROM template_renstra 
WHERE id IN (${uniqueIds.map((id) => (isNaN(id) ? `'${id}'` : id)).join(", ")});

-- 2. ATAU Query Pembersihan Massal Berdasarkan Pola (Menyimpan baris dengan ID terkecil):
DELETE t1 FROM template_renstra t1
INNER JOIN template_renstra t2 
  ON t1.tahun = t2.tahun 
  AND t1.indikator = t2.indikator 
  AND t1.tugas = t2.tugas 
  AND t1.id > t2.id
WHERE t1.tahun = '${tahun || "2025"}';`;
    }

    return `-- Query SQL Pembersihan Baris Duplikat Template Renstra (Menyimpan baris dengan ID terkecil)
DELETE t1 FROM template_renstra t1
INNER JOIN template_renstra t2 
  ON t1.tahun = t2.tahun 
  AND t1.indikator = t2.indikator 
  AND t1.fakultas_unit = t2.fakultas_unit 
  AND t1.tugas = t2.tugas 
  AND t1.id > t2.id
WHERE t1.tahun = '${tahun || "2025"}';`;
  }, [incidents, tahun]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(cleanupSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between px-6 py-5 border-b bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                incidents.length > 0
                  ? "bg-amber-100 text-amber-700 border-amber-300"
                  : "bg-emerald-100 text-emerald-700 border-emerald-300"
              }`}
            >
              {incidents.length > 0 ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  Deteksi Insiden Duplikasi Indikator di Database
                </h3>
                {incidents.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {incidents.length} Pola Duplikat ({totalExtraRows} Row Berlebih)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Database Bersih
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Tahun Evaluasi: <strong className="text-gray-800">{tahun}</strong> • Mendeteksi duplikasi template akibat insiden <em>bad code generate</em> atau <em>bad execute SQL</em>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DIAGNOSTIC NOTICE & ACTIONS */}
        <div className="p-6 border-b bg-gray-50/70 space-y-3">
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold flex items-center gap-1.5 text-amber-950 mb-1">
              <Database className="w-4 h-4 text-amber-700" />
              Diagnosa Sistem:
            </p>
            {incidents.length > 0 ? (
              <span>
                Ditemukan <strong>{incidents.length} indikator/tugas</strong> yang memiliki baris duplikat untuk unit yang sama di tabel <code>template_renstra</code> / <code>template_dokumen_tambahan</code>. Chart pada dashboard telah otomatis melakukan <em>deduplikasi visual</em> sehingga data tampil aman (tampil 1), namun row duplikat fisik di database perlu dibersihkan agar performa dan integritas data tetap terjaga.
              </span>
            ) : (
              <span className="text-emerald-800">
                Tidak ditemukan baris duplikat pada database untuk tahun {tahun}. Seluruh pasangan indikator, unit, dan tugas auditor berstatus unik dan konsisten.
              </span>
            )}
          </div>

          {incidents.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari indikator atau nama unit yang duplikat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 shadow-2xs"
                />
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleCopySql}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                  title="Salin query SQL pembersihan ke clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Query SQL Berhasil Disalin!" : "Salin Query SQL Cleanup"}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* TABLE OF INCIDENTS */}
        <div className="p-6 overflow-y-auto flex-1">
          {incidents.length === 0 ? (
            <div className="text-center py-12 px-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2 opacity-90" />
              <h4 className="text-base font-bold text-emerald-900">
                Semua Data Konsisten &amp; Bersih
              </h4>
              <p className="text-xs text-emerald-700 max-w-md mx-auto mt-1">
                Tidak ditemukan indikator duplikat untuk tahun {tahun}. Setiap unit memiliki tepat 1 row per tugas auditor.
              </p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-500">
              Tidak ada insiden duplikasi yang cocok dengan filter pencarian "{search}".
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">No</th>
                    <th className="py-2.5 px-3.5">Tipe</th>
                    <th className="py-2.5 px-3.5">Indikator &amp; Standar</th>
                    <th className="py-2.5 px-3.5">Stakeholder Penerima</th>
                    <th className="py-2.5 px-3.5 text-center">Tugas</th>
                    <th className="py-2.5 px-3.5 text-center">Duplikat</th>
                    <th className="py-2.5 px-3.5">Row ID Database</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredIncidents.map((inc, i) => (
                    <tr
                      key={inc.signature || i}
                      className="hover:bg-amber-50/30 transition"
                    >
                      <td className="py-3 px-3.5 text-gray-400 font-medium">
                        {i + 1}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inc.type === "renstra"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {inc.type}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 max-w-xs">
                        {inc.standar && (
                          <p className="text-[10px] font-semibold text-gray-500 uppercase truncate">
                            {inc.standar}
                          </p>
                        )}
                        <p className="text-xs font-bold text-gray-900 leading-snug">
                          {inc.indikator || inc.jenisFile || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-gray-800">
                          {formatProdiWithJenjang(
                            inc.unitNama || inc.target,
                            inc.unitJenjang,
                            inc.unitType
                          )}
                        </span>
                        {inc.reason && (
                          <p className="text-[10px] text-amber-700 mt-0.5 font-medium">
                            {inc.reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {inc.tugas || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          {inc.count}x Muncul
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-gray-700">
                        {inc.rowIds && inc.rowIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {inc.rowIds.map((rid, rIdx) => (
                              <span
                                key={rIdx}
                                className="px-1.5 py-0.2 bg-gray-100 text-gray-800 rounded border border-gray-200"
                              >
                                #{rid}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t bg-gray-50">
          <p className="text-[11px] text-gray-500">
            Dianalisis secara real-time dari response data API server untuk tahun evaluasi {tahun}.
          </p>
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
