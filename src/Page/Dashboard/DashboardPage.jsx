import React, { useState } from "react";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import ProkerAnnouncementCard from "./ProkerAnnouncementCard";
import MonitoringTableCard from "./MonitoringTableCard";
import PemetaanChartCard from "./PemetaanChartCard";
import { isDashboardProkerVisibleForVersion } from "@/Common/versionConfig";
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
  } = useContent();
  const { user } = useAuth();
  const isAdmin = String(level || user?.level || "").toLowerCase().trim() === "admin";

  const showProkerMonitoring = isDashboardProkerVisibleForVersion(appVersion || "v2");
  const showPemetaanChart = (appVersion || "v2") === "v2" || (appVersion || "v2") === "v3";

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
        {showProkerMonitoring ? (
          <>
            {/* ANNOUNCEMENT (Hanya untuk versi V1 & V2) */}
            <ProkerAnnouncementCard
              status="Ditutup"
              closedAt="25 Januari 2026, 23:59 WIB"
            />

            {/* SECTION CHART PEMETAAN RENSTRA & DOKUMEN TAMBAHAN (Hanya muncul untuk Admin) */}
            {isAdmin && showPemetaanChart && <PemetaanChartCard />}

            {/* TABLE CARD (Hanya untuk versi V1 & V2) */}
            <MonitoringTableCard />
          </>
        ) : (
          /* DASHBOARD VERSI 3 (Audit Periode 2027) */
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 border border-indigo-200/80 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-indigo-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 mb-2 border border-indigo-200">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    SIAMIDA V3 • Audit Periode 2027
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Dashboard Audit Generasi Baru (2027)
                  </h1>
                  <p className="text-sm text-gray-600 mt-1 max-w-2xl leading-relaxed">
                    Anda sedang berada dalam mode <strong>Versi 3 (Audit 2027)</strong>. Fitur Monitoring Dokumen Program Kerja dan Pelaporan Proker merupakan instrumen khusus sistem versi V1 &amp; V2. Modul audit mutu periode 2027 dalam tahap persiapan instrumen.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-indigo-150/70 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Periode Sistem</p>
                      <p className="text-sm font-bold text-gray-800">Tahun 2027</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-indigo-150/70 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Status Versi</p>
                      <p className="text-sm font-bold text-purple-700">New (2027)</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-indigo-150/70 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Standar Audit</p>
                      <p className="text-sm font-bold text-emerald-700">Audit SPMI V3</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>Untuk mengakses Monitoring Proker &amp; Instrumen Renstra V2, silakan beralih ke <strong>V2 (Current)</strong> melalui menu dropdown versi pada navbar.</span>
                <Link
                  to="/master_tahun"
                  className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Lihat Master Tahun
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* SECTION CHART PEMETAAN RENSTRA & DOKUMEN TAMBAHAN (Hanya muncul untuk Admin) */}
            {isAdmin && <PemetaanChartCard />}
          </div>
        )}
      </main>
    </>
  );
};

export default DashboardPage;