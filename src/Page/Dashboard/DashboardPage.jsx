import React, { useState } from "react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import ProkerAnnouncementCard from "./ProkerAnnouncementCard";
import MonitoringTableCard from "./MonitoringTableCard";
import PemetaanChartCard from "./PemetaanChartCard";
import DashboardIkuAnggaranChartCard from "./DashboardIkuAnggaranChartCard";
import DashboardProkerAktivitasRabCard from "./DashboardProkerAktivitasRabCard";
import {
  isDashboardProkerVisibleForVersion,
  isDashboardProkerAnnouncementVisible,
} from "@/Common/versionConfig";
import { Sparkles, Calendar, Layers, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPage = () => {
  return <DashboardContent />;
};

const DashboardContent = () => {
  const {
    level,
    setLevel,
    listLevel,
    openChangeLevel,
    setOpenChangeLevel,
    appVersion,
    positionYear,
  } = useContent();
  const { user } = useAuth();
  const currentLevel = String(level || user?.level || "").toLowerCase().trim();
  const isAdmin = currentLevel === "admin";
  const isAdminOrAnggaran = currentLevel === "admin" || currentLevel === "anggaran";
  const activeYear = String(positionYear || localStorage.getItem("positionYear") || "2027");

  const showProkerMonitoring = isDashboardProkerVisibleForVersion(appVersion || "v2");
  const showPemetaanChart = (appVersion || "v2") === "v2" || (appVersion || "v2") === "v3";
  const showProkerAnnouncement = isDashboardProkerAnnouncementVisible(appVersion || "v2");

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

      <main className="p-6 space-y-6">
        {/* SECTION MONITORING PROKER, AKTIVITAS & RAB (Wakil Rektor 1-4 & Fakultas) */}
        <DashboardProkerAktivitasRabCard currentYear={activeYear} />

        {showProkerMonitoring ? (
          <>
            {/* ANNOUNCEMENT (Hanya untuk versi V2) */}
            {showProkerAnnouncement && (
              <ProkerAnnouncementCard
                status="Ditutup"
                closedAt="25 Januari 2026, 23:59 WIB"
              />
            )}

            {/* CHART REALTIME ANGGARAN & REALISASI IKU (RAB TAHAPAN) - Level Admin & Anggaran */}
            {isAdminOrAnggaran && <DashboardIkuAnggaranChartCard />}

            {/* SECTION CHART PEMETAAN RENSTRA & DOKUMEN TAMBAHAN (Hanya muncul untuk Admin) */}
            {isAdmin && showPemetaanChart && <PemetaanChartCard />}

            {/* TABLE CARD (Hanya untuk versi V1 & V2) */}
            <MonitoringTableCard />
          </>
        ) : (
          /* DASHBOARD VERSI 3 (Audit Periode 2027) */
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200/90 p-6 sm:p-8 shadow-2xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-gray-150">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-800 mb-2.5 border border-purple-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    SIAMIDA V3 • Audit Periode 2027
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Dashboard Audit Mutu &amp; Kinerja (2027)
                  </h1>
                  <p className="text-sm text-gray-600 mt-1.5 max-w-2xl leading-relaxed">
                    Sistem beroperasi pada <strong>Tahun Anggaran &amp; Periode Audit 2027</strong>. Seluruh instrumen penjaminan mutu, pemetaan program kerja, dan evaluasi capaian IKU terhubung langsung dengan standar Renstra Universitas Pakuan.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/80 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-purple-700 shadow-2xs">
                      <Calendar className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Periode Aktif</p>
                      <p className="text-base font-bold text-gray-900">Tahun 2027</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/80 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-purple-700 shadow-2xs">
                      <Layers className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Status Arsitektur</p>
                      <p className="text-base font-bold text-purple-900">SIAMIDA V3</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/80 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                      <ShieldCheck className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Standar Penjaminan</p>
                      <p className="text-base font-bold text-emerald-800">SPMI Terpadu</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-150 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                <span>Untuk mengakses Monitoring Proker &amp; Instrumen Renstra V2, silakan beralih ke <strong>V2 (Current)</strong> melalui menu dropdown versi pada navbar.</span>
                <Link
                  to="/master_tahun"
                  className="inline-flex items-center gap-1.5 font-semibold text-purple-700 hover:text-purple-900"
                >
                  <span>Lihat Master Tahun</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* CHART REALTIME ANGGARAN & REALISASI IKU (RAB TAHAPAN) - Level Admin & Anggaran */}
            {isAdminOrAnggaran && <DashboardIkuAnggaranChartCard />}

            {/* SECTION CHART PEMETAAN RENSTRA & DOKUMEN TAMBAHAN (Hanya muncul untuk Admin) */}
            {isAdmin && <PemetaanChartCard />}
          </div>
        )}
      </main>
    </>
  );
};

export default DashboardPage;