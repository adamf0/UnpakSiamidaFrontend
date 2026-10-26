import {
  formatFetchError,
  getBackground,
  getStatusText,
  isEmpty,
  STATUS_LEGEND,
  throwIfResponseNotOk,
} from "@/Common/Utils";
import Portal from "@/Components/Portal";
import SearchSelect from "@/Components/SearchSelect";
import { apiClient } from "@/Common/api";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BsFilter } from "react-icons/bs";
import Dossier3DStackView from "./MonitoringProker3D/Dossier3DStackView";
import AdminKeyRack from "./MonitoringProker3D/AdminKeyRack";
import ArchiveCabinetView from "./MonitoringProker3D/ArchiveCabinetView";
import { aggregateMataProgramDossiers } from "./MonitoringProker3D/monitoringProkerData";
import {
  Layers,
  Table as TableIcon,
  Sparkles,
  Key,
  Lock,
  Unlock,
  Calendar,
  ChevronDown,
} from "lucide-react";

export default function MonitoringTableCard() {
  const { user, getValidToken } = useAuth();
  const { positionYear, activeYear } = useContent();
  const { addToast } = useToast();

  /* =========================
     LOCAL STATE
  ========================= */
  const [rawData, setRawData] = useState([]);
  const [realDocs, setRealDocs] = useState([]);
  const [viewMode, setViewMode] = useState("3d"); // "3d" | "table"
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tahun, setTahun] = useState(null);
  const [fakultasunit, setFakultasUnit] = useState(null);
  const [unlockedUnit, setUnlockedUnit] = useState(null); // Unit yang sedang dibuka oleh kunci admin
  const [dataFakultasUnit, setDataFakultasUnit] = useState([]);
  const [dataTahun, setDataTahun] = useState([]);
  const [loadingTahun, setLoadingTahun] = useState(false);
  const [errorTahun, setErrorTahun] = useState(null);
  const [loadingFakultasUnit, setLoadingFakultasUnit] = useState(false);
  const [errorFakultasUnit, setErrorFakultasUnit] = useState(null);

  // Cek apakah user adalah auditee atau memiliki fakultas_unit
  const isAuditee = useMemo(() => {
    return user?.level === "auditee" || !isEmpty(user?.fakultas_unit);
  }, [user]);

  function fullFakultasUnit(item) {
    if (item.Type === "prodi") {
      return `${item.Nama} (${item.Jenjang})`;
    } else if (item.Type === "fakultas") {
      return `${item.Nama} (fakultas)`;
    }
    return `${item.Nama} (unit)`;
  }

  const fetchDataTahun = async () => {
    setLoadingTahun(true);
    setErrorTahun(null);
    try {
      const res = await apiClient.get("/tahunprokers?mode=all");
      const data = res.data;
      const mapped = (data ?? []).map((j) => ({
        id: j.UUID,
        nama: j.Tahun,
        ...j,
      }));

      setDataTahun(mapped);
      return mapped;
    } catch (err) {
      console.error("Fetch data tahun proker gagal:", err);
      setErrorTahun(formatFetchError(err, "Gagal memuat tahun proker"));
      return [];
    } finally {
      setLoadingTahun(false);
    }
  };

  const fetchDataFakultasUnit = async () => {
    setLoadingFakultasUnit(true);
    setErrorFakultasUnit(null);
    try {
      const res = await apiClient.get("/fakultasunits?mode=all");
      const data = res.data;
      const mapped = (data ?? []).map((j) => ({
        id: j.UUID,
        nama: fullFakultasUnit(j),
        ...j,
      }));

      setDataFakultasUnit(mapped);
      return mapped;
    } catch (err) {
      console.error("Fetch data fakultas unit gagal:", err);
      setErrorFakultasUnit(formatFetchError(err, "Gagal memuat fakultas/unit"));
      return [];
    } finally {
      setLoadingFakultasUnit(false);
    }
  };

  const fetchMonitoringProker = useCallback(
    async (targetTahun = tahun, targetUnit = fakultasunit) => {
      const tahunUuid = targetTahun?.UUID;
      const unitUuid = targetUnit?.UUID;

      if (!tahunUuid || !unitUuid) return;

      setLoading(true);
      try {
        const [resMonitoring, resRealDocs] = await Promise.allSettled([
          apiClient.get(`/monitoringproker/${tahunUuid}/${unitUuid}?mode=all`),
          apiClient.get(`/pelaporandokumens?mode=all&target=${unitUuid}`),
        ]);

        if (resMonitoring.status === "fulfilled") {
          const json = resMonitoring.value?.data;
          setRawData(Array.isArray(json) ? json : []);
        } else {
          setRawData([]);
        }

        if (resRealDocs.status === "fulfilled") {
          const docsJson = resRealDocs.value?.data;
          setRealDocs(Array.isArray(docsJson) ? docsJson : []);
        } else {
          setRealDocs([]);
        }
      } catch (err) {
        console.error("Fetch monitoring proker gagal:", err);
        addToast(
          "errors",
          "Gagal memuat data monitoring dokumen program kerja",
        );
      } finally {
        setLoading(false);
      }
    },
    [getValidToken, tahun, fakultasunit, addToast],
  );

  /* =========================
     FILTER UPSERT
  ========================= */
  const upsertFilter = (key, val) => {
    setFilters((prev) => {
      const exists = prev.find((f) => f.key === key);
      if (exists) {
        return prev.map((f) => (f.key === key ? { ...f, val } : f));
      }
      return [...prev, { key, val }];
    });
  };

  /* =========================
     INITIAL LOAD & AUTO POPULATE
  ========================= */
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const [listTahun, listUnit] = await Promise.all([
        fetchDataTahun(),
        fetchDataFakultasUnit(),
      ]);

      if (!isMounted) return;

      // 1. Tentukan tahun default
      const targetYearStr = String(positionYear ?? activeYear ?? "2025");
      let matchedTahun = listTahun.find(
        (t) => String(t.Tahun) === targetYearStr,
      );
      if (!matchedTahun) {
        matchedTahun =
          listTahun.find(
            (t) => t.Status === "aktif" || t.Status === "active",
          ) || listTahun[0];
      }

      // 2. Tentukan unit default (prioritas auditee unit)
      let matchedUnit = null;
      if (user?.fakultas_unit) {
        matchedUnit = listUnit.find(
          (u) =>
            String(u.ID) === String(user.fakultas_unit) ||
            String(u.UUID) === String(user.fakultas_unit),
        );
      }
      if (!matchedUnit && user?.name?.toLowerCase().includes("bpsi")) {
        matchedUnit = listUnit.find((u) => u.Nama?.toLowerCase() === "bpsi");
      }

      if (matchedTahun) {
        setTahun(matchedTahun);
        upsertFilter("tahun", matchedTahun);
      }

      // Jika user auditee, langsung buka lemari miliknya
      if (isAuditee && matchedUnit) {
        setFakultasUnit(matchedUnit);
        setUnlockedUnit(matchedUnit);
        upsertFilter("fakultasunit", matchedUnit);
        if (matchedTahun) {
          await fetchMonitoringProker(matchedTahun, matchedUnit);
        }
      } else {
        // Posisi Admin: biarkan unlockedUnit = null agar Rak Kunci Unik tampil terlebih dahulu
        setUnlockedUnit(null);
        // Tetapkan fallback fakultasunit untuk tabel matriks jika dibutuhkan
        if (listUnit.length > 0) {
          setFakultasUnit(listUnit[0]);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  /* =========================
     KEY SELECTION & RETURN HANDLERS
  ========================= */
  const handleSelectUnitKey = useCallback(
    async (unit) => {
      setFakultasUnit(unit);
      setUnlockedUnit(unit);
      upsertFilter("fakultasunit", unit);
      if (tahun) {
        await fetchMonitoringProker(tahun, unit);
      }
    },
    [tahun, fetchMonitoringProker],
  );

  const handleLockAndReturn = useCallback(() => {
    setUnlockedUnit(null);
    setFilters((prev) => prev.filter((f) => f.key !== "fakultasunit"));
  }, []);

  const handleTahunChange = useCallback(
    async (selectedTahun) => {
      if (!selectedTahun) return;
      setTahun(selectedTahun);
      upsertFilter("tahun", selectedTahun);
      const targetUnit = unlockedUnit || fakultasunit;
      if (targetUnit) {
        await fetchMonitoringProker(selectedTahun, targetUnit);
      }
    },
    [unlockedUnit, fakultasunit, fetchMonitoringProker],
  );

  // Update jika positionYear di navbar berubah
  useEffect(() => {
    if (!positionYear || dataTahun.length === 0) return;

    const matchedTahun = dataTahun.find(
      (t) => String(t.Tahun) === String(positionYear),
    );
    if (matchedTahun && matchedTahun.UUID !== tahun?.UUID) {
      setTahun(matchedTahun);
      upsertFilter("tahun", matchedTahun);
      if (fakultasunit) {
        fetchMonitoringProker(matchedTahun, fakultasunit);
      }
    }
  }, [positionYear, dataTahun, fakultasunit, fetchMonitoringProker]);

  // Update jika user info baru didapat setelah dataFakultasUnit ready
  useEffect(() => {
    if (!fakultasunit && dataFakultasUnit.length > 0 && user?.fakultas_unit) {
      const matchedUnit = dataFakultasUnit.find(
        (u) =>
          String(u.ID) === String(user.fakultas_unit) ||
          String(u.UUID) === String(user.fakultas_unit) ||
          (user.name?.toLowerCase().includes("bpsi") &&
            u.Nama?.toLowerCase() === "bpsi"),
      );
      if (matchedUnit) {
        setFakultasUnit(matchedUnit);
        upsertFilter("fakultasunit", matchedUnit);
        if (tahun) {
          fetchMonitoringProker(tahun, matchedUnit);
        }
      }
    }
  }, [user, dataFakultasUnit, tahun, fakultasunit, fetchMonitoringProker]);

  /* =========================
     TRANSFORM DATA
  ========================= */
  const tableData = useMemo(() => {
    return (rawData ?? []).map((d) => ({
      ...d,
      skstyle: getBackground({
        r0: d.SKR0,
        r1: d.SKR1,
        r2: d.SKR2,
        r3: d.SKR3,
      }),
      sktooltip: `SK: ${getStatusText({
        r0: d.SKR0,
        r1: d.SKR1,
        r2: d.SKR2,
        r3: d.SKR3,
      })}`,
      sopstyle: getBackground({
        r0: d.SOPR0,
        r1: d.SOPR1,
        r2: d.SOPR2,
        r3: d.SOPR3,
      }),
      soptooltip: `SOP: ${getStatusText({
        r0: d.SOPR0,
        r1: d.SOPR1,
        r2: d.SOPR2,
        r3: d.SOPR3,
      })}`,
      proposalstyle: getBackground({
        r0: d.ProposalTORR0,
        r1: d.ProposalTORR1,
        r2: d.ProposalTORR2,
        r3: d.ProposalTORR3,
      }),
      proposaltooltip: `Proposal/TOR: ${getStatusText({
        r0: d.ProposalTORR0,
        r1: d.ProposalTORR1,
        r2: d.ProposalTORR2,
        r3: d.ProposalTORR3,
      })}`,
      laporanstyle: getBackground({
        r0: d.LaporanR0,
        r1: d.LaporanR1,
        r2: d.LaporanR2,
        r3: d.LaporanR3,
      }),
      laporantooltip: `Laporan: ${getStatusText({
        r0: d.LaporanR0,
        r1: d.LaporanR1,
        r2: d.LaporanR2,
        r3: d.LaporanR3,
      })}`,
    }));
  }, [rawData]);

  const dossiers = useMemo(() => {
    return aggregateMataProgramDossiers(rawData, realDocs, fakultasunit, tahun);
  }, [rawData, realDocs, fakultasunit, tahun]);

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all duration-300">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 py-5 border-b bg-gradient-to-r from-stone-50/80 via-white to-stone-50/60">
          <div className="space-y-1">
            <h4 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Monitoring Dokumen Program Kerja
            </h4>
            <p className="text-xs sm:text-sm text-gray-600">
              {unlockedUnit
                ? `Status kelengkapan dan verifikasi dokumen per mata program — ${unlockedUnit.Nama || unlockedUnit.nama}`
                : "Pilih Kunci Unik Fakultas, Program Studi, atau Unit Kerja untuk membuka lemari berkas"}
            </p>
          </div>

          {viewMode === "3d" && unlockedUnit && (
            <button
              type="button"
              onClick={handleLockAndReturn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition shadow-2xs cursor-pointer active:scale-95"
              title="Kunci kembali lemari dan kembali ke rak gantungan kunci admin"
            >
              <Key className="w-3.5 h-3.5 text-amber-700" />
              <span>Ganti</span>
            </button>
          )}
        </div>

        {/* FILTER BADGES */}
        {unlockedUnit && (
          <div className="px-6 py-2.5 flex flex-wrap items-center gap-2.5 border-b bg-gray-50/40">
            <span className="text-xs text-gray-500 font-medium">
              Filter Aktif:
            </span>

            {/* BADGE UNIT (JIKA UNIT TELAH DIBUKA / DIPILIH) */}
            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-bold">
              Unit: {unlockedUnit.Nama || unlockedUnit.nama}
            </span>
          </div>
        )}

        {/* BODY WORKSPACE */}
        {viewMode === "3d" ? (
          /* ================= 1. TAMPILAN 3D KUNCI UNIK & LEMARI BERKAS INTERAKTIF ================= */
          <>
          {!unlockedUnit ? (
              /* A. RAK GANTUNGAN KUNCI MASTER ADMIN */
              <AdminKeyRack
                units={dataFakultasUnit}
                tahun={tahun?.nama || tahun?.Tahun}
                onSelectUnitKey={handleSelectUnitKey}
              />
            ) : (
              /* B. LEMARI ARSIP BERKAS YANG DIBUKA OLEH KUNCI TERPILIH */
              <ArchiveCabinetView
                dossiers={dossiers}
                unit={unlockedUnit}
                tahun={tahun?.nama || tahun?.Tahun}
                loading={loading}
                onLockAndReturn={handleLockAndReturn}
              />
            )}
          </>
        ) : (
          /* ================= 2. TAMPILAN TABEL MATRIKS KLASIK ================= */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/70 text-sm text-gray-700 border-t">
                  <th className="px-4 py-3 font-semibold">Mata Program</th>
                  <th className="px-4 py-3 w-28 text-center font-semibold">
                    SK
                  </th>
                  <th className="px-4 py-3 w-28 text-center font-semibold">
                    SOP
                  </th>
                  <th className="px-4 py-3 w-32 text-center font-semibold">
                    Proposal/TOR
                  </th>
                  <th className="px-4 py-3 w-28 text-center font-semibold">
                    Laporan
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <>
                    {[1, 2, 3].map((n) => (
                      <tr key={n} className="border-t animate-pulse">
                        <td className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-6 bg-gray-200 rounded w-full" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-6 bg-gray-200 rounded w-full" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-6 bg-gray-200 rounded w-full" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-6 bg-gray-200 rounded w-full" />
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {!loading && tableData.length === 0 && (
                  <tr className="border-t">
                    <td
                      colSpan={5}
                      className="py-10 text-center text-gray-400 text-sm"
                    >
                      {tahun && fakultasunit
                        ? `Belum ada dokumen program kerja untuk ${fakultasunit.nama || "unit ini"} pada tahun ${tahun.nama || tahun.Tahun}.`
                        : "Pilih tahun dan unit melalui tombol filter untuk menampilkan data."}
                    </td>
                  </tr>
                )}

                {!loading &&
                  tableData.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-t hover:bg-gray-50/60 transition"
                    >
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                        {row.MataProgram}
                      </td>
                      <td
                        title={row.sktooltip}
                        className={`px-4 py-3 cursor-help border-l border-white/20 transition-opacity hover:opacity-90 ${row.skstyle}`}
                      />
                      <td
                        title={row.soptooltip}
                        className={`px-4 py-3 cursor-help border-l border-white/20 transition-opacity hover:opacity-90 ${row.sopstyle}`}
                      />
                      <td
                        title={row.proposaltooltip}
                        className={`px-4 py-3 cursor-help border-l border-white/20 transition-opacity hover:opacity-90 ${row.proposalstyle}`}
                      />
                      <td
                        title={row.laporantooltip}
                        className={`px-4 py-3 cursor-help border-l border-white/20 transition-opacity hover:opacity-90 ${row.laporanstyle}`}
                      />
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export function MonitoringFilterDrawer({
  open,
  onClose,
  tahun,
  setTahun,
  dataTahun,
  loadingTahun = false,
  errorTahun = null,
  onRetryTahun,
  fakultasunit,
  setFakultasUnit,
  dataFakultasUnit,
  loadingFakultasUnit = false,
  errorFakultasUnit = null,
  onRetryFakultasUnit,
  upsertFilter,
  onApply,
  isAuditee = false,
}) {
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex">
        <div
          className="flex-1 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="w-[420px] bg-white h-full shadow-2xl p-5 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex justify-between items-center pb-3 border-b">
              <h2 className="font-semibold text-lg text-gray-800">
                Filter Monitoring Dokumen Program Kerja
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition"
              >
                ✕
              </button>
            </div>

            {/* FORM INPUTS */}
            <div className="space-y-4">
              <SearchSelect
                label="Tahun Program Kerja"
                required
                options={dataTahun}
                placeholder="Cari tahun proker"
                value={tahun}
                loading={loadingTahun}
                loadError={errorTahun}
                onRetry={onRetryTahun}
                onChange={(item) => {
                  setTahun(item);
                  upsertFilter("tahun", item);
                }}
              />

              <div className="space-y-1">
                <SearchSelect
                  label="Fakultas / Unit"
                  required
                  options={dataFakultasUnit}
                  placeholder="Cari fakultas / prodi / unit"
                  value={fakultasunit}
                  loading={loadingFakultasUnit}
                  loadError={errorFakultasUnit}
                  onRetry={onRetryFakultasUnit}
                  disabled={isAuditee}
                  onChange={(item) => {
                    setFakultasUnit(item);
                    upsertFilter("fakultasunit", item);
                  }}
                />
                {isAuditee && (
                  <p className="text-xs text-blue-600 italic">
                    * Akun Auditee terikat ke unit Anda sendiri (
                    {fakultasunit?.nama || "BPSI"}).
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t mt-6">
            <button
              onClick={() => {
                if (onApply) {
                  onApply(tahun, fakultasunit);
                } else {
                  onClose();
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition shadow-sm"
            >
              Terapkan
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg py-2.5 text-sm font-medium transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
