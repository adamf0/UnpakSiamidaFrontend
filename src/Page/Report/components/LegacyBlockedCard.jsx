import React from "react";
import { AlertTriangle, ArrowRight, ShieldAlert, Database, Calendar } from "lucide-react";

export default function LegacyBlockedCard({ year = "2023", onSwitchToV2, availableYears = [] }) {
  const targetYear = availableYears.find((y) => Number(y.Tahun || y.id) >= 2024)?.id || "2024";

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-200/70 text-amber-900 uppercase tracking-wide">
                Adapter v1: masih migrasi fitur
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                <AlertTriangle size={12} />
                Akses Ditolak
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Laporan Tahun {year} (Adapter v1)
            </h3>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-sm font-mono text-red-600 font-semibold">
              Respons Server: "masih migrasi fitur"
            </div>
            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
              Ketika mengakses data tahun <strong>{year}</strong>, sistem backend langsung mengarahkan request ke <strong>Adapter v1</strong> dan me-reject dengan keterangan <strong>"masih migrasi fitur"</strong> karena tabel sumber data berbeda.
            </p>
            <p className="text-xs text-gray-500">
              Silakan pilih tahun <strong>2024 atau terkini</strong> yang menggunakan adapter <strong>v2 (Renstra Aktif)</strong> untuk melihat monitoring indikator dan grafik temuan KTS.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={() => onSwitchToV2(targetYear)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition hover:shadow cursor-pointer"
          >
            <span>Beralih ke Tahun {targetYear} (v2)</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-amber-600" />
          <span>Adapter Protocol: <strong>v2 (Active Renstra Engine)</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-600" />
          <span>Status v1: <strong>Rejected ("masih migrasi fitur")</strong></span>
        </div>
      </div>
    </div>
  );
}
