import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { apiClient } from "@/Common/api";
import { isEmpty } from "@/Common/Utils";
import AuditRenstraEditPage from "./AuditRenstraEditPage";
import AuditTambahanEditPage from "./AuditTambahanEditPage";
import KtsPage from "@/Page/Kts/KtsPage";
import {
  ArrowLeft,
  History,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Calendar,
  Building2,
  Users,
  ShieldAlert,
} from "lucide-react";

const AuditHistoryPage = () => {
  const { uuidRenstra } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { getValidToken } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  const [activeTab, setActiveTab] = useState("renstra");
  const [loading, setLoading] = useState(true);
  const [currentRenstra, setCurrentRenstra] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistoryRenstra, setSelectedHistoryRenstra] = useState(null);

  useEffect(() => {
    if (!uuidRenstra) return;
    loadAuditHistory();
  }, [uuidRenstra]);

  const loadAuditHistory = async () => {
    setLoading(true);
    try {
      // 1. Ambil detail renstra aktif yang diklik
      const currentRes = await apiClient.get(`/renstra/${uuidRenstra}`);
      const curData = currentRes?.data ?? currentRes;
      setCurrentRenstra(curData);

      if (!curData?.FakultasUnitUuid && !curData?.FakultasUnitId) {
        setLoading(false);
        return;
      }

      // 2. Cari renstra lain dari fakultas_unit yang sama
      let list = [];
      try {
        const filterTarget = curData.FakultasUnitUuid
          ? `uuidfakultasunit:eq:${curData.FakultasUnitUuid}`
          : `fakultasunitid:eq:${curData.FakultasUnitId}`;
        const histRes = await apiClient.get(`/renstras?mode=all&filters=${filterTarget}`);
        list = histRes?.data ?? histRes ?? [];
      } catch (err) {
        console.warn("Gagal filter renstra by uuidfakultasunit, coba fakultasunitid:", err);
        try {
          const histRes2 = await apiClient.get(
            `/renstras?mode=all&filters=fakultasunitid:eq:${curData.FakultasUnitId}`
          );
          list = histRes2?.data ?? histRes2 ?? [];
        } catch (e2) {
          console.error("Gagal memuat renstra sebelumnya:", e2);
        }
      }

      const allList = Array.isArray(list) ? list : [];

      // Gabungkan curData dengan seluruh riwayat renstra unit ini agar renstra aktif juga bisa diakses langsung
      const combinedMap = new Map();
      if (curData && curData.UUID) {
        combinedMap.set(curData.UUID, curData);
      }
      allList.forEach((r) => {
        if (r && r.UUID && !combinedMap.has(r.UUID)) {
          combinedMap.set(r.UUID, r);
        }
      });

      const fullRenstras = Array.from(combinedMap.values()).sort(
        (a, b) => (parseInt(b.Tahun, 10) || 0) - (parseInt(a.Tahun, 10) || 0)
      );

      setHistoryList(fullRenstras);

      // Prioritas: gunakan renstra yang cocok dengan uuidRenstra di URL
      const initialRenstra =
        fullRenstras.find((r) => r.UUID === uuidRenstra) ||
        curData ||
        (fullRenstras.length > 0 ? fullRenstras[0] : null);

      setSelectedHistoryRenstra(initialRenstra);
    } catch (err) {
      console.error("Error loading audit history:", err);
      addToast("error", "Gagal memuat riwayat audit");
    } finally {
      setLoading(false);
    }
  };

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

      <div className="bg-slate-50 min-h-[calc(100vh-64px)] pb-10">
        {/* Sub-Header & Controls */}
        <div className="bg-white border-b border-gray-200 shadow-xs px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/audit")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                    <History className="w-3.5 h-3.5" />
                    Riwayat
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    Mode Baca Saja (Read Only)
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 mt-1 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  {currentRenstra?.FakultasUnit || "Memuat Target Audit..."}
                </h1>
              </div>
            </div>

            {/* Selector Tahun Riwayat */}
            <div className="flex flex-wrap items-center gap-3">
              {historyList.length > 0 ? (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 px-3">
                  <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="text-xs font-semibold text-gray-600">Tahun Audit Riwayat:</span>
                  <select
                    className="text-xs font-bold text-purple-700 bg-white border border-gray-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                    value={selectedHistoryRenstra?.UUID || ""}
                    onChange={(e) => {
                      const found = historyList.find((r) => r.UUID === e.target.value);
                      if (found) setSelectedHistoryRenstra(found);
                    }}
                  >
                    {historyList.map((h) => (
                      <option key={h.UUID} value={h.UUID}>
                        Tahun {h.Tahun}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {selectedHistoryRenstra && (
                <div className="hidden xl:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-2xl">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    Auditor: <strong>{selectedHistoryRenstra?.Auditor1 || "-"}</strong> /{" "}
                    <strong>{selectedHistoryRenstra?.Auditor2 || "-"}</strong>
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>
                    Auditee: <strong>{selectedHistoryRenstra?.Auditee || "-"}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          {selectedHistoryRenstra && (
            <div className="max-w-7xl mx-auto mt-4 pt-2 border-t border-gray-100 flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("renstra")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  activeTab === "renstra"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>1. Renstra ({selectedHistoryRenstra.Tahun})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tambahan")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  activeTab === "tambahan"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>2. Dokumen Tambahan ({selectedHistoryRenstra.Tahun})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("kts")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  activeTab === "kts"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>3. KTS ({selectedHistoryRenstra.Tahun})</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Memuat riwayat audit unit...</p>
            </div>
          ) : !selectedHistoryRenstra ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-lg mx-auto mt-8 shadow-xs">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">
                Tidak Ada Riwayat Audit Sebelumnya
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Unit <strong>{currentRenstra?.FakultasUnit}</strong> belum memiliki catatan riwayat
                audit pada tahun-tahun sebelumnya.
              </p>
              <button
                type="button"
                onClick={() => navigate("/audit")}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition cursor-pointer shadow-sm"
              >
                Kembali ke Daftar Audit
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs">
              {activeTab === "renstra" && (
                <AuditRenstraEditPage
                  key={`history-renstra-${selectedHistoryRenstra.UUID}`}
                  uuidRenstra={selectedHistoryRenstra.UUID}
                  readOnly={true}
                  hideNavbar={true}
                />
              )}

              {activeTab === "tambahan" && (
                <AuditTambahanEditPage
                  key={`history-tambahan-${selectedHistoryRenstra.UUID}`}
                  uuidRenstra={selectedHistoryRenstra.UUID}
                  readOnly={true}
                  hideNavbar={true}
                />
              )}

              {activeTab === "kts" && (
                <KtsPage
                  key={`history-kts-${selectedHistoryRenstra.UUID}`}
                  tahun={selectedHistoryRenstra.Tahun}
                  target={
                    selectedHistoryRenstra.FakultasUnitUuid ||
                    selectedHistoryRenstra.UuidFakultasUnit ||
                    selectedHistoryRenstra.TargetUuid ||
                    currentRenstra?.FakultasUnitUuid ||
                    ""
                  }
                  uuidaudit={selectedHistoryRenstra.UUID}
                  readOnly={true}
                  hideNavbar={true}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AuditHistoryPage;
