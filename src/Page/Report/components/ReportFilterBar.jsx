import React from "react";
import { Calendar, Search, RefreshCw, Layers, ShieldCheck, ShieldAlert } from "lucide-react";
import SearchSelect from "@/Components/SearchSelect";

export default function ReportFilterBar({
  tahun,
  setTahun,
  dataTahun = [],
  loadingTahun = false,
  indikator,
  setIndikator,
  dataIndikator = [],
  loadingIndikator = false,
  adapterVersion = "v2",
  isLegacy = false,
  onRefresh,
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          {/* TAHUN SELECTOR */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-600" />
              <span>Tahun Laporan</span>
            </label>
            <SearchSelect
              options={dataTahun}
              value={tahun}
              loading={loadingTahun}
              placeholder="Cari / pilih tahun..."
              onChange={(item) => {
                if (item) setTahun(item);
              }}
            />
          </div>

          {/* INDIKATOR SELECTOR */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers size={14} className="text-blue-600" />
              <span>Indikator Renstra</span>
            </label>
            <SearchSelect
              options={dataIndikator}
              value={indikator}
              loading={loadingIndikator}
              disabled={isLegacy || loadingIndikator || dataIndikator.length === 0}
              placeholder={
                isLegacy
                  ? "Indikator dinonaktifkan (masih migrasi fitur)"
                  : dataIndikator.length === 0
                  ? "Tidak ada indikator"
                  : "Cari / pilih indikator renstra..."
              }
              onChange={(item) => {
                setIndikator(item || null);
              }}
            />
          </div>
        </div>

        {/* STATUS BADGE & REFRESH */}
        <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
          {/* ADAPTER BADGE */}
          <div className="flex items-center gap-1.5">
            {isLegacy ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                <ShieldAlert size={14} className="text-amber-600" />
                <span>Adapter: v1 (masih migrasi fitur)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Adapter: v2 (Renstra Aktif)</span>
              </span>
            )}
          </div>

          {/* REFRESH BUTTON */}
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition shadow-2xs hover:shadow-xs cursor-pointer"
            title="Muat ulang data laporan"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
