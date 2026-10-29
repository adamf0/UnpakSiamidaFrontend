import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/Common/api";
import {
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Layers,
  RefreshCw,
} from "lucide-react";

const KATEGORI_META = {
  Kekuatan: {
    label: "Kekuatan",
    code: "S",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: ShieldCheck,
  },
  Kelemahan: {
    label: "Kelemahan",
    code: "W",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertCircle,
  },
  Peluang: {
    label: "Peluang",
    code: "O",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    icon: TrendingUp,
  },
  Ancaman: {
    label: "Ancaman",
    code: "T",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
  },
};

export default function ProkerV3SwotView({ fakultasUnitId, targetName, tahun }) {
  const [activeTab, setActiveTab] = useState("Kekuatan");
  const [swotList, setSwotList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSwot = async () => {
    if (!fakultasUnitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("mode", "all");
      params.append("filter_fakultas_unit", String(fakultasUnitId));
      if (tahun && tahun !== "all") {
        params.append("filter_tahun", String(tahun));
      }
      const res = await apiClient.get(`/swots?${params.toString()}`);
      const raw = res?.data;
      const list = Array.isArray(raw) ? raw : raw?.data || [];
      setSwotList(list);
    } catch (err) {
      console.error("Gagal memuat data SWOT:", err);
      setError("Gagal memuat data Analisis SWOT");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwot();
  }, [fakultasUnitId, tahun]);

  const counts = useMemo(() => {
    const c = { Kekuatan: 0, Kelemahan: 0, Peluang: 0, Ancaman: 0 };
    swotList.forEach((item) => {
      const kat = item.Kategori || item.kategori;
      if (c[kat] !== undefined) {
        c[kat] += 1;
      }
    });
    return c;
  }, [swotList]);

  const filteredList = useMemo(() => {
    return swotList.filter(
      (item) => (item.Kategori || item.kategori || "").toLowerCase() === activeTab.toLowerCase()
    );
  }, [swotList, activeTab]);

  const tabs = [
    { key: "Kekuatan", label: "Kekuatan (S)", count: counts.Kekuatan, meta: KATEGORI_META.Kekuatan },
    { key: "Kelemahan", label: "Kelemahan (W)", count: counts.Kelemahan, meta: KATEGORI_META.Kelemahan },
    { key: "Peluang", label: "Peluang (O)", count: counts.Peluang, meta: KATEGORI_META.Peluang },
    { key: "Ancaman", label: "Ancaman (T)", count: counts.Ancaman, meta: KATEGORI_META.Ancaman },
  ];

  return (
    <div className="bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50/70 to-indigo-50/50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="font-bold text-gray-800 text-xs sm:text-sm">
            Analisis SWOT: <span className="text-purple-700">{targetName}</span>
          </span>
          {tahun && tahun !== "all" && (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white border border-purple-200 text-purple-700">
              {tahun}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={fetchSwot}
          disabled={loading}
          className="p-1.5 rounded-lg text-gray-500 hover:text-purple-700 hover:bg-white transition cursor-pointer"
          title="Muat ulang SWOT"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-2 bg-gray-50/80 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/80"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/25 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
            <span>Memuat data Analisis SWOT...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 text-xs">{error}</div>
        ) : filteredList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            Belum ada catatan SWOT untuk kategori {activeTab} pada tahun ini.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 text-gray-600 border-b border-gray-200 font-semibold">
                <th className="py-2.5 px-3 w-12 text-center">No.</th>
                <th className="py-2.5 px-3 w-36">Kategori</th>
                <th className="py-2.5 px-4">Faktor SWOT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.map((item, idx) => {
                const kat = item.Kategori || item.kategori || "-";
                const meta = KATEGORI_META[kat] || {
                  label: kat,
                  code: "-",
                  badge: "bg-gray-50 text-gray-700 border-gray-200",
                };
                const Icon = meta.icon;
                const faktor = item.Faktor || item.faktor || "-";

                return (
                  <tr key={item.UUID || item.uuid || idx} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-gray-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${meta.badge}`}
                      >
                        {Icon && <Icon className="w-3 h-3" />}
                        <span>
                          {meta.code} - {meta.label}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-800 leading-relaxed font-normal">
                      {faktor}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
