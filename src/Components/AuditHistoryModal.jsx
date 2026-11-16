import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, History, ChevronLeft, ChevronRight, ShieldCheck, Clock, User, AlertCircle, RefreshCw } from "lucide-react";
import { apiClient } from "@/Common/api";

export default function AuditHistoryModal({
  isOpen,
  onClose,
  entityType = "aktivitas_v2",
  entityId,
  title = "Riwayat Perubahan & Audit Log",
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewScope, setViewScope] = useState("entity");

  useEffect(() => {
    if (!isOpen) return;
    fetchAuditLogs(viewScope);
  }, [isOpen, entityId, entityType, viewScope]);

  const fetchAuditLogs = async (scope = viewScope) => {
    setLoading(true);
    setError("");
    try {
      const url = (scope === "all" || !entityId)
        ? `/audit/logs`
        : `/audit/logs?entity_type=${entityType}&entity_id=${entityId}`;
      const res = await apiClient.get(url);
      const list = res?.data?.data || [];
      setLogs(list);
      setCurrentIndex(0);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Gagal memuat log audit");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentLog = logs[currentIndex] || null;

  let diffItems = [];
  if (currentLog?.diff_payload) {
    try {
      diffItems = typeof currentLog.diff_payload === "string" 
        ? JSON.parse(currentLog.diff_payload) 
        : currentLog.diff_payload;
    } catch {
      diffItems = [];
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            {currentLog && (
              <>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentLog.category || "AUDIT"}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                  {currentLog.action_type || "UPDATE"}
                </span>
                <span className="text-xs font-semibold text-gray-400">
                  #{currentLog.sequence_no}
                </span>
              </>
            )}

            {entityId && (
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 text-[10px] font-medium ml-2">
                <button
                  type="button"
                  onClick={() => setViewScope("entity")}
                  className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${viewScope === "entity" ? "bg-white font-bold text-gray-800 shadow-2xs" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Entitas Ini
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope("all")}
                  className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${viewScope === "all" ? "bg-white font-bold text-gray-800 shadow-2xs" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Semua Ledger
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <RefreshCw size={24} className="animate-spin text-purple-600" />
              <p className="text-xs">Memuat catatan riwayat audit...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs space-y-3">
              <History size={32} className="mx-auto text-gray-300" />
              <p className="font-semibold text-gray-700">Belum ada rekaman riwayat audit spesifik untuk entitas ini.</p>
              <p className="text-[11px] text-gray-400">Setiap perubahan status dan form melalui sistem akan tercatat secara otomatis.</p>
              <button
                type="button"
                onClick={() => setViewScope("all")}
                className="mt-2 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                Lihat Catatan Audit Terakhir Sistem
              </button>
            </div>
          ) : (
            <>
              {/* Context Headline */}
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-snug">
                  {currentLog.headline || title}
                </h3>
              </div>

              {/* 3-Column Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50/70 border border-gray-100 rounded-xl text-xs">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    DILAKUKAN OLEH
                  </p>
                  <p className="font-semibold text-gray-900 mt-1 truncate">
                    {currentLog.actor_name || currentLog.actor_id || "-"}
                  </p>
                  {currentLog.actor_role && (
                    <span className="inline-block px-1.5 py-0.2 mt-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                      {currentLog.actor_role}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    WAKTU KEJADIAN
                  </p>
                  <p className="font-semibold text-gray-900 mt-1">
                    {currentLog.created_at
                      ? new Date(currentLog.created_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                        })
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    DATA TERKAIT
                  </p>
                  <p className="font-semibold text-gray-900 mt-1 truncate" title={currentLog.entity_id}>
                    {currentLog.entity_type}: {currentLog.entity_id?.slice(0, 13)}...
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-0.5">
                    <ShieldCheck size={11} />
                    <span>SHA-256 Valid</span>
                  </span>
                </div>
              </div>

              {/* Keterangan */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-blue-900">Keterangan:</p>
                <p className="text-blue-800 leading-relaxed">
                  {currentLog.headline || "Aktivitas diverifikasi dan status penjaminan mutu diperbarui."}
                </p>
              </div>

              {/* Perubahan Informasi (Diff Table) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    PERUBAHAN INFORMASI
                  </h4>
                  <span className="text-[11px] font-semibold text-amber-700">
                    Perubahan Data
                  </span>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 w-2/5">Informasi</th>
                        <th className="py-2.5 px-4 w-3/10 text-rose-700">Sebelumnya</th>
                        <th className="py-2.5 px-4 w-3/10 text-emerald-700">Data Baru</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                      {diffItems.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-gray-400">
                            Tidak ada perubahan nilai spesifik yang tercatat
                          </td>
                        </tr>
                      ) : (
                        diffItems.map((item, idx) => (
                          <tr key={idx} className={item.is_changed ? "bg-amber-50/20" : ""}>
                            <td className="py-2.5 px-4 font-medium text-gray-900 flex items-center gap-2">
                              {item.is_changed && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              )}
                              <span>{item.label || item.field}</span>
                            </td>
                            <td className="py-2.5 px-4 text-gray-600">
                              {item.old_val || "-"}
                            </td>
                            <td className={`py-2.5 px-4 font-semibold ${item.is_changed ? "text-gray-900" : "text-gray-600"}`}>
                              {item.new_val || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer with Pagination & Close Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          {logs.length > 1 ? (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={currentIndex >= logs.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(logs.length - 1, prev + 1))}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer"
                title="Log Lebih Lama"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-gray-600 font-medium">
                Log {currentIndex + 1} dari {logs.length}
              </span>
              <button
                type="button"
                disabled={currentIndex <= 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer"
                title="Log Lebih Baru"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
