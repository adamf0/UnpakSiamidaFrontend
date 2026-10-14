import React, { useEffect, useState, useMemo, useCallback } from "react";
import Navbar from "@/Components/Navbar";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import {
  FileText,
  BarChart3,
  Layers,
  Calendar,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Info,
} from "lucide-react";
import { getReportAdapter, LegacyAdapterError } from "./adapters/reportAdapter";
import ReportFilterBar from "./components/ReportFilterBar";
import LegacyBlockedCard from "./components/LegacyBlockedCard";
import InformasiIndikatorTab from "./components/InformasiIndikatorTab";
import TemuanCharts from "./components/TemuanCharts";
import PageHeader from "@/Components/PageHeader";

export default function ReportPage() {
  const { getValidToken } = useAuth();
  const { addToast } = useToast();

  // Selected filters
  const [tahun, setTahun] = useState(null);
  const [dataTahun, setDataTahun] = useState([]);
  const [loadingTahun, setLoadingTahun] = useState(false);

  const [indikator, setIndikator] = useState(null);
  const [dataIndikator, setDataIndikator] = useState([]);
  const [loadingIndikator, setLoadingIndikator] = useState(false);

  // Tab state: "indikator" | "temuan"
  const [activeTab, setActiveTab] = useState("indikator");

  // Indicator monitoring data
  const [monitoringData, setMonitoringData] = useState([]);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);

  // Temuan KTS data
  const [rawTemuan, setRawTemuan] = useState([]);
  const [loadingTemuan, setLoadingTemuan] = useState(false);

  // Error state
  const [adapterError, setAdapterError] = useState(null);

  // Determine current adapter based on selected year
  const adapter = useMemo(() => {
    return getReportAdapter(tahun?.id || tahun?.Tahun || "2024");
  }, [tahun]);

  const isLegacy = useMemo(() => {
    return !adapter.isSupportedYear(tahun?.id || tahun?.Tahun);
  }, [adapter, tahun]);

  // =========================================================
  // 1. FETCH TAHUN LIST ON MOUNT
  // =========================================================
  const fetchTahunList = useCallback(async () => {
    setLoadingTahun(true);
    try {
      const defaultAdapter = getReportAdapter(2024);
      const list = await defaultAdapter.fetchTahunList();
      setDataTahun(list);

      // Default to 2024 or latest modern year
      const defaultYear =
        list.find((t) => Number(t.Tahun || t.id) >= 2024) || list[0];
      if (defaultYear && !tahun) {
        setTahun(defaultYear);
      }
    } catch (err) {
      console.error("Gagal memuat daftar tahun renstra:", err);
      addToast("errors", "Gagal memuat tahun renstra");
    } finally {
      setLoadingTahun(false);
    }
  }, [addToast, tahun]);

  useEffect(() => {
    fetchTahunList();
  }, [fetchTahunList]);

  // =========================================================
  // 2. FETCH INDIKATOR LIST WHEN TAHUN CHANGES
  // =========================================================
  const fetchIndikatorList = useCallback(async () => {
    if (!tahun) return;

    if (!adapter.isSupportedYear(tahun.id)) {
      setDataIndikator([]);
      setIndikator(null);
      setMonitoringData([]);
      setRawTemuan([]);
      setAdapterError(
        new LegacyAdapterError(
          "masih migrasi fitur",
          tahun.nama
        )
      );
      return;
    }

    setAdapterError(null);
    setLoadingIndikator(true);
    try {
      const list = await adapter.fetchIndikatorTree(tahun.id);
      setDataIndikator(list);

      // Automatically select first indicator if none selected
      if (list.length > 0) {
        setIndikator((prev) => {
          if (!prev) return list[0];
          const exists = list.find((item) => item.id === prev.id);
          return exists || list[0];
        });
      } else {
        setIndikator(null);
      }
    } catch (err) {
      console.error("Gagal memuat daftar indikator:", err);
      setDataIndikator([]);
      setIndikator(null);
      addToast("errors", err.message || "Gagal memuat indikator");
    } finally {
      setLoadingIndikator(false);
    }
  }, [tahun, adapter, addToast]);

  useEffect(() => {
    fetchIndikatorList();
  }, [fetchIndikatorList]);

  // =========================================================
  // 3. FETCH MONITORING INDIKATOR DATA
  // =========================================================
  const fetchMonitoringData = useCallback(async () => {
    if (!tahun || !indikator || isLegacy) {
      setMonitoringData([]);
      return;
    }

    setLoadingMonitoring(true);
    try {
      const data = await adapter.fetchMonitoringIndikator(
        tahun.id,
        indikator.id || indikator.IndikatorUuid
      );
      setMonitoringData(data);
    } catch (err) {
      console.error("Gagal memuat data monitoring indikator:", err);
      setMonitoringData([]);
      addToast("errors", err.message || "Gagal memuat data monitoring indikator");
    } finally {
      setLoadingMonitoring(false);
    }
  }, [tahun, indikator, isLegacy, adapter, addToast]);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  // =========================================================
  // 4. FETCH TEMUAN DATA FOR CHARTS
  // =========================================================
  const fetchTemuanData = useCallback(async () => {
    if (!tahun || isLegacy) {
      setRawTemuan([]);
      return;
    }

    setLoadingTemuan(true);
    try {
      const data = await adapter.fetchTemuan(tahun.id);
      setRawTemuan(data);
    } catch (err) {
      console.error("Gagal memuat data temuan KTS:", err);
      setRawTemuan([]);
    } finally {
      setLoadingTemuan(false);
    }
  }, [tahun, isLegacy, adapter]);

  useEffect(() => {
    fetchTemuanData();
  }, [fetchTemuanData]);

  // Processed Temuan aggregations
  const jenjangTemuan = useMemo(() => {
    if (!adapter.aggregateByJenjang) return [];
    return adapter.aggregateByJenjang(rawTemuan);
  }, [adapter, rawTemuan]);

  const jenjangProdiTemuan = useMemo(() => {
    if (!adapter.aggregateByJenjangProdi) return [];
    return adapter.aggregateByJenjangProdi(rawTemuan);
  }, [adapter, rawTemuan]);

  // Switch to v2 helper
  const handleSwitchToV2 = (targetYear = "2024") => {
    const found = dataTahun.find((t) => String(t.id) === String(targetYear));
    if (found) {
      setTahun(found);
    } else {
      setTahun({ id: targetYear, nama: targetYear, Tahun: targetYear });
    }
  };

  const handleRefreshAll = () => {
    fetchIndikatorList();
    fetchMonitoringData();
    fetchTemuanData();
  };

  return (
    <div className="min-h-screen bg-gray-50/60 pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* HEADER */}
        <PageHeader
          icon={BarChart3}
          title="Laporan & Monitoring Capaian"
          subtitle="Monitoring capaian indikator Renstra dan visualisasi analitik temuan KTS"
        />

        {/* FILTER BAR */}
        <ReportFilterBar
          tahun={tahun}
          setTahun={setTahun}
          dataTahun={dataTahun}
          loadingTahun={loadingTahun}
          indikator={indikator}
          setIndikator={setIndikator}
          dataIndikator={dataIndikator}
          loadingIndikator={loadingIndikator}
          adapterVersion={adapter.getVersion()}
          isLegacy={isLegacy}
          onRefresh={handleRefreshAll}
        />

        {/* ========================================================= */}
        {/* CONDITIONAL CONTENT: V1 (LEGACY BLOCKED) VS V2 (ACTIVE)   */}
        {/* ========================================================= */}
        {isLegacy ? (
          <LegacyBlockedCard
            year={tahun?.nama || tahun?.id || "2023"}
            onSwitchToV2={handleSwitchToV2}
            availableYears={dataTahun}
          />
        ) : (
          <div className="space-y-6">
            {/* TABS NAVIGATION */}
            <div className="flex items-center gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("indikator")}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition cursor-pointer ${
                  activeTab === "indikator"
                    ? "border-blue-600 text-blue-600 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Layers size={17} />
                <span>Informasi Indikator</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                  {monitoringData.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("temuan")}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition cursor-pointer ${
                  activeTab === "temuan"
                    ? "border-blue-600 text-blue-600 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <BarChart3 size={17} />
                <span>Grafik Temuan KTS</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                  {rawTemuan.length}
                </span>
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === "indikator" && (
              <InformasiIndikatorTab
                data={monitoringData}
                loading={loadingMonitoring}
                selectedIndikator={indikator}
                onRefresh={fetchMonitoringData}
              />
            )}

            {activeTab === "temuan" && (
              <TemuanCharts
                tahun={tahun?.nama || tahun?.Tahun || tahun?.id || "2024"}
                jenjangData={jenjangTemuan}
                jenjangProdiData={jenjangProdiTemuan}
                rawTemuan={rawTemuan}
                loading={loadingTemuan}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
