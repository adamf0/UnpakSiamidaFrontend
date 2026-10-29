import React, { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { apiClient } from "@/Common/api";
import {
  ShieldAlert,
  X,
  RefreshCw,
  AlertOctagon,
  Flame,
  CheckCircle2,
} from "lucide-react";

export default function ProkerV3RiskModal({ open, proker, onClose }) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !proker) return;

    const fetchRisks = async () => {
      setLoading(true);
      setError(null);
      try {
        const progId = proker.IdMataProgram || proker.id_mata_program;
        const res = await apiClient.get(
          `/risk_assessments?mode=all&filter_program=${progId}`
        );
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : raw?.data || [];
        setRisks(list);
      } catch (err) {
        console.error("Gagal mengambil data risiko:", err);
        setError("Gagal memuat analisis risiko untuk program kerja ini");
      } finally {
        setLoading(false);
      }
    };

    fetchRisks();
  }, [open, proker]);

  if (!open) return null;

  const renderBadge = (level) => {
    const l = (level || "").toUpperCase();
    if (l === "T") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <Flame className="w-3.5 h-3.5 text-rose-600" />
          <span>T - Tinggi</span>
        </span>
      );
    }
    if (l === "M") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
          <span>M - Menengah</span>
        </span>
      );
    }
    if (l === "R") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>R - Rendah</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">
        -
      </span>
    );
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-gray-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-rose-50 via-purple-50 to-white border-b border-gray-200 flex items-start justify-between gap-3 shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                      <Dialog.Title className="text-base sm:text-lg font-bold text-gray-900">
                        Analisis Risiko Program Kerja
                      </Dialog.Title>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      <span className="font-semibold text-gray-800">
                        {proker?.NamaProgram}
                      </span>{" "}
                      {proker?.NamaFakultasUnit && (
                        <span className="text-purple-700">
                          ({proker.NamaFakultasUnit})
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
                  {loading ? (
                    <div className="py-12 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                      <span>Memuat detail analisis risiko...</span>
                    </div>
                  ) : error ? (
                    <div className="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                      {error}
                    </div>
                  ) : risks.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 text-sm">
                      Belum ada analisis risiko yang terdaftar untuk program kerja ini.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs text-gray-500">
                        Ditemukan{" "}
                        <span className="font-bold text-gray-900">
                          {risks.length}
                        </span>{" "}
                        analisis risiko:
                      </div>

                      <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">No.</th>
                              <th className="py-2.5 px-3 min-w-[140px]">Isu Internal/Eksternal</th>
                              <th className="py-2.5 px-3 min-w-[180px]">Deskripsi Risiko</th>
                              <th className="py-2.5 px-3 w-32 text-center">Tingkat Awal</th>
                              <th className="py-2.5 px-3 w-28 text-center">Skor (K x D)</th>
                              <th className="py-2.5 px-3 min-w-[180px]">Tindakan Mitigasi</th>
                              <th className="py-2.5 px-3 w-28 text-center">Residu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {risks.map((item, idx) => {
                              const isu =
                                item.IsuInternalEksternal ||
                                item.isu_internal_eksternal ||
                                "-";
                              const desc =
                                item.DeskripsiRisiko ||
                                item.deskripsi_risiko ||
                                item.PernyataanRisiko ||
                                "-";
                              const levelAwal =
                                item.TingkatRisikoAwal ||
                                item.tingkat_risiko_awal ||
                                item.LevelRisiko ||
                                "";
                              const kAwal =
                                item.KemungkinanAwal ?? item.kemungkinan_awal ?? "-";
                              const dAwal = item.DampakAwal ?? item.dampak_awal ?? "-";
                              const skorAwal =
                                item.TotalSkorAwal ??
                                item.total_skor_awal ??
                                (Number(kAwal) && Number(dAwal)
                                  ? Number(kAwal) * Number(dAwal)
                                  : "-");
                              const mitigasi =
                                item.TindakanMitigasi ||
                                item.tindakan_mitigasi ||
                                item.RencanaMitigasi ||
                                "-";
                              const levelResidu =
                                item.TingkatRisikoResidu ||
                                item.tingkat_risiko_residu ||
                                "";

                              return (
                                <tr
                                  key={item.UUID || item.uuid || idx}
                                  className="hover:bg-gray-50/70 transition-colors"
                                >
                                  <td className="py-2.5 px-3 text-center font-mono text-gray-500">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2.5 px-3 text-gray-800 font-medium">
                                    {isu}
                                  </td>
                                  <td className="py-2.5 px-3 text-gray-800 leading-relaxed">
                                    {desc}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {renderBadge(levelAwal)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono">
                                    <span className="font-semibold text-gray-800">
                                      {kAwal} × {dAwal}
                                    </span>
                                    <span className="text-gray-400 block text-[10px]">
                                      = {skorAwal}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-gray-700 leading-relaxed">
                                    {mitigasi}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {levelResidu ? renderBadge(levelResidu) : (
                                      <span className="text-gray-400 text-[11px]">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
