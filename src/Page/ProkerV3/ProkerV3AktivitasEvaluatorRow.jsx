import React, { useState, useMemo } from "react";
import {
  BULAN_LIST,
  WEEKS,
  parseSlotArray,
  formatBytes,
  formatRupiah,
  JENIS_DOKUMEN_PROKER,
  getTimelineRkSlots,
  getTimelineRSlots,
} from "./prokerConstants";
import { formatTanggalBulanTahun } from "@/Common/Utils";
import { API_BASE_URL } from "@/Common/api";
import {
  Clock,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
} from "lucide-react";

const formatDateIndoWithDay = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
};

export default function ProkerV3AktivitasEvaluatorRow({
  activity,
  colSpan,
  prokerDocuments = [],
  isVerifierRoleOrLevel = false,
}) {
  const [activeDocTab, setActiveDocTab] = useState("all");

  const timelines = activity?.Timelines || [];

  // Hitung jadwal gabungan aktivitas
  const activitySchedule = useMemo(() => {
    let rkAwal = null;
    let rkAkhir = null;
    let rAwal = null;
    let rAkhir = null;

    const rkSlots = new Set();
    const rSlots = new Set();

    timelines.forEach((tl) => {
      if (tl.TanggalRkAwal) {
        if (!rkAwal || tl.TanggalRkAwal < rkAwal) rkAwal = tl.TanggalRkAwal;
      }
      if (tl.TanggalRkAkhir) {
        if (!rkAkhir || tl.TanggalRkAkhir > rkAkhir)
          rkAkhir = tl.TanggalRkAkhir;
      }
      if (tl.TanggalRAwal) {
        if (!rAwal || tl.TanggalRAwal < rAwal) rAwal = tl.TanggalRAwal;
      }
      if (tl.TanggalRAkhir) {
        if (!rAkhir || tl.TanggalRAkhir > rAkhir) rAkhir = tl.TanggalRAkhir;
      }

      getTimelineRkSlots(tl).forEach((s) => rkSlots.add(s));
      getTimelineRSlots(tl).forEach((s) => rSlots.add(s));
    });

    const totalMingguRk = rkSlots.size;
    const totalMingguR = rSlots.size;

    return {
      rkAwal,
      rkAkhir,
      rAwal,
      rAkhir,
      rkSlots: Array.from(rkSlots),
      rSlots: Array.from(rSlots),
      totalMingguRk,
      totalMingguR,
    };
  }, [timelines]);

  // Filter dokumen sesuai tab aktif
  const filteredDocuments = useMemo(() => {
    if (activeDocTab === "all") return prokerDocuments;
    return prokerDocuments.filter((d) => d.JenisDokumen === activeDocTab);
  }, [prokerDocuments, activeDocTab]);

  return (
    <tr className="bg-slate-50/70 border-b-2 border-purple-200">
      <td colSpan={colSpan} className="p-4 sm:p-6 space-y-6">
        {/* Matriks 48 Slots + 4 Kolom (Tanggal RK, Capaian, Kendala, Solusi) */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-center text-[10px] border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 text-left w-48 sticky left-0 bg-gray-100 z-10 border-r border-gray-200 uppercase tracking-wider text-[11px]"
                  >
                    Nama Kegiatan
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 text-center min-w-[150px] border-r border-gray-200 uppercase tracking-wider text-[11px] bg-blue-50 text-blue-900"
                  >
                    Tanggal RK
                  </th>
                  {BULAN_LIST.map((b) => (
                    <th
                      key={b.key}
                      colSpan={4}
                      className="py-1.5 px-1 border-r border-gray-200 text-center font-extrabold text-[11px]"
                    >
                      {b.short}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 text-left min-w-[150px] border-r border-gray-200 uppercase tracking-wider text-[11px] bg-emerald-50 text-emerald-900"
                  >
                    Capaian
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 text-left min-w-[150px] border-r border-gray-200 uppercase tracking-wider text-[11px] bg-rose-50 text-rose-900"
                  >
                    Kendala
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 text-left min-w-[150px] uppercase tracking-wider text-[11px] bg-indigo-50 text-indigo-900"
                  >
                    Solusi
                  </th>
                </tr>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  {BULAN_LIST.map((b) =>
                    WEEKS.map((w) => (
                      <th
                        key={`${b.key}-${w}`}
                        className="w-5 py-0.5 border-r border-gray-200 text-[9px] font-mono"
                      >
                        {w}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {timelines.length === 0 ? (
                  <tr className="border-b border-gray-100 bg-white">
                    <td className="py-2.5 px-3 text-left text-gray-800 sticky left-0 bg-white z-10 border-r border-gray-200 whitespace-nowrap text-[11px] font-bold">
                      <span className="truncate max-w-[180px] inline-block">
                        {activity?.Aktivitas || "-"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-gray-200 text-[11px] font-medium text-gray-400 whitespace-nowrap bg-blue-50/20">
                      -
                    </td>
                    {BULAN_LIST.map((b) =>
                      WEEKS.map((w) => (
                        <td
                          key={`${b.key}_${w}`}
                          className="p-1 border-r border-gray-200 select-none align-middle"
                        >
                          <div className="flex flex-col gap-0.5 items-center justify-center min-w-[14px]">
                            <div className="w-full h-2 rounded-2xs bg-gray-100" />
                            <div className="w-full h-2 rounded-2xs bg-gray-100" />
                          </div>
                        </td>
                      )),
                    )}
                    <td className="py-2.5 px-3 text-left border-r border-gray-200 text-[11px] text-gray-800 leading-snug">
                      {activity?.Capaian || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-left border-r border-gray-200 text-[11px] text-gray-800 leading-snug">
                      {activity?.Masalah || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-left text-[11px] text-gray-800 leading-snug">
                      {activity?.PemecahanMasalah || "-"}
                    </td>
                  </tr>
                ) : (
                  timelines.map((tl, idx) => {
                    const tlRkSlots = getTimelineRkSlots(tl);
                    const tlRSlots = getTimelineRSlots(tl);

                    const formattedTanggalRk =
                      tl.TanggalRkAwal && tl.TanggalRkAkhir
                        ? `${formatTanggalBulanTahun(tl.TanggalRkAwal)} s/d ${formatTanggalBulanTahun(tl.TanggalRkAkhir)}`
                        : tl.TanggalRkAwal
                          ? formatTanggalBulanTahun(tl.TanggalRkAwal)
                          : "-";

                    const capaianText = tl.Capaian || activity?.Capaian || "-";
                    const kendalaText = tl.Masalah || activity?.Masalah || "-";
                    const solusiText =
                      tl.PemecahanMasalah || activity?.PemecahanMasalah || "-";

                    return (
                      <tr
                        key={tl.UUID || idx}
                        className="border-b border-gray-100 bg-white hover:bg-purple-50/20 transition"
                      >
                        {/* Nama Kegiatan */}
                        <td className="py-2.5 px-3 text-left text-gray-800 sticky left-0 bg-white z-10 border-r border-gray-200 whitespace-nowrap text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-700 font-mono text-xs">
                              #{tl.NoAktivitas || idx + 1}
                            </span>
                            <span
                              className="truncate max-w-[180px] inline-block font-bold text-gray-900"
                              title={tl.NamaAktivitas}
                            >
                              {tl.NamaAktivitas}
                            </span>
                          </div>
                        </td>

                        {/* 1. Tanggal RK */}
                        <td className="py-2.5 px-3 text-center border-r border-gray-200 text-[11px] font-medium text-blue-900 whitespace-nowrap bg-blue-50/30">
                          {formattedTanggalRk}
                        </td>

                        {/* 48 Slot Mingguan (Dual Baris: Biru RK & Hijau R) */}
                        {BULAN_LIST.map((b) =>
                          WEEKS.map((w) => {
                            const slotKey = `${b.key}_${w}`;
                            const isRk = tlRkSlots.includes(slotKey);
                            const isR = tlRSlots.includes(slotKey);

                            return (
                              <td
                                key={slotKey}
                                className="p-1 border-r border-gray-200 select-none align-middle"
                                title={`#${tl.NoAktivitas || idx + 1} ${tl.NamaAktivitas} - ${b.label} ${w}: ${
                                  isRk && isR
                                    ? "Rencana [RK] & Realisasi [R]"
                                    : isRk
                                      ? "Rencana Kerja [RK]"
                                      : isR
                                        ? "Realisasi [R]"
                                        : "-"
                                }`}
                              >
                                <div className="flex flex-col gap-0.5 items-center justify-center min-w-[14px]">
                                  <div
                                    className={`w-full h-2 rounded-2xs transition ${
                                      isRk
                                        ? "bg-blue-600 shadow-2xs"
                                        : "bg-gray-100"
                                    }`}
                                  />
                                  <div
                                    className={`w-full h-2 rounded-2xs transition ${
                                      isR
                                        ? "bg-emerald-500 shadow-2xs"
                                        : "bg-gray-100"
                                    }`}
                                  />
                                </div>
                              </td>
                            );
                          }),
                        )}

                        {/* 2. Capaian */}
                        <td className="py-2.5 px-3 text-left border-r border-gray-200 text-[11px] text-gray-800 leading-snug">
                          {capaianText}
                        </td>

                        {/* 3. Kendala */}
                        <td className="py-2.5 px-3 text-left border-r border-gray-200 text-[11px] text-gray-800 leading-snug">
                          {kendalaText}
                        </td>

                        {/* 4. Solusi */}
                        <td className="py-2.5 px-3 text-left text-[11px] text-gray-800 leading-snug">
                          {solusiText}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. TABEL DAFTAR DOKUMEN TERSIMPAN (GAMBAR 3)            */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Daftar Dokumen Tersimpan ({prokerDocuments.length})
              </h3>
            </div>

            {/* Filter Tabs by Jenis Dokumen */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveDocTab("all")}
                className={`px-3.5 py-1 rounded-full font-bold transition cursor-pointer ${
                  activeDocTab === "all"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Semua ({prokerDocuments.length})
              </button>
              {JENIS_DOKUMEN_PROKER.map((j) => {
                const count = prokerDocuments.filter(
                  (d) => d.JenisDokumen === j.id,
                ).length;
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setActiveDocTab(j.id)}
                    className={`px-3.5 py-1 rounded-full font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      activeDocTab === j.id
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span>{j.id}</span>
                    <span className="text-[10px] opacity-80 font-mono font-normal">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table / List Dokumen */}
          {filteredDocuments.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
              Belum ada dokumen{" "}
              {activeDocTab === "all" ? "tersimpan" : `jenis ${activeDocTab}`}{" "}
              pada program kerja ini
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
              {filteredDocuments.map((doc, idx) => {
                const badgeInfo = JENIS_DOKUMEN_PROKER.find(
                  (j) => j.id === doc.JenisDokumen,
                ) || {
                  badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
                };

                const fileUrl = doc.FileURL
                  ? `${API_BASE_URL}${doc.FileURL.startsWith("/") ? "" : "/"}${doc.FileURL}`
                  : null;

                const isVerif =
                  doc.StatusVerifikasi === "terverifikasi" ||
                  doc.StatusVerifikasi === "diterima";
                const isTolak = doc.StatusVerifikasi === "ditolak";

                return (
                  <div
                    key={doc.UUID || idx}
                    className="p-3.5 hover:bg-gray-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${badgeInfo.badgeClass}`}
                        >
                          {doc.JenisDokumen}
                        </span>
                        <span
                          className="font-bold text-gray-900 truncate text-xs sm:text-sm"
                          title={doc.NamaFile}
                        >
                          {doc.NamaFile}
                        </span>
                        {isVerif ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Terverifikasi</span>
                          </span>
                        ) : isTolak ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Ditolak</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Belum Diverifikasi</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>
                          {formatBytes(doc.FileSize || doc.file_size || 0)}
                        </span>
                        <span>•</span>
                        <span>
                          Diunggah{" "}
                          {formatTanggalBulanTahun(
                            doc.CreatedAt || doc.created_at,
                          )}
                        </span>
                        {(doc.Keterangan ||
                          doc.keterangan ||
                          doc.Catatan ||
                          doc.catatan) && (
                          <>
                            <span>•</span>
                            <span className="italic">
                              Catatan:{" "}
                              {doc.Keterangan ||
                                doc.keterangan ||
                                doc.Catatan ||
                                doc.catatan}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 transition shadow-2xs border border-gray-200"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka / Unduh</span>
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs italic">
                          File tidak tersedia
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
