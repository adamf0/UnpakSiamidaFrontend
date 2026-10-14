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
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BsFilter } from "react-icons/bs";

export default function MonitoringTableCard() {
  const { user, getValidToken } = useAuth();
  const { positionYear, activeYear } = useContent();
  const { addToast } = useToast();

  /* =========================
     LOCAL STATE
  ========================= */
  const [rawData, setRawData] = useState([]);
  const [filters, setFilters] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tahun, setTahun] = useState(null);
  const [fakultasunit, setFakultasUnit] = useState(null);
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
    const token = getValidToken();
    if (isEmpty(token)) return [];

    setLoadingTahun(true);
    setErrorTahun(null);
    try {
      const res = await fetch(`http://localhost:3000/tahunprokers?mode=all`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      await throwIfResponseNotOk(res, "Gagal memuat tahun proker");

      const data = await res.json();
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
    const token = getValidToken();
    if (isEmpty(token)) return [];

    setLoadingFakultasUnit(true);
    setErrorFakultasUnit(null);
    try {
      const res = await fetch(`http://localhost:3000/fakultasunits?mode=all`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      await throwIfResponseNotOk(res, "Gagal memuat fakultas/unit");

      const data = await res.json();
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
      const token = getValidToken();
      if (isEmpty(token)) return;

      const tahunUuid = targetTahun?.UUID;
      const unitUuid = targetUnit?.UUID;

      if (!tahunUuid || !unitUuid) return;

      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:3000/monitoringproker/${tahunUuid}/${unitUuid}?mode=all`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          addToast("errors", err.message || "Gagal memuat data monitoring proker");
          return;
        }

        const json = await res.json();
        setRawData(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error("Fetch monitoring proker gagal:", err);
        addToast("errors", "Gagal memuat data monitoring dokumen program kerja");
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
      let matchedTahun = listTahun.find((t) => String(t.Tahun) === targetYearStr);
      if (!matchedTahun) {
        matchedTahun =
          listTahun.find((t) => t.Status === "aktif" || t.Status === "active") ||
          listTahun[0];
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
      // Jika bukan auditee, default ke unit pertama agar tabel tidak kosong
      if (!matchedUnit && !isAuditee && listUnit.length > 0) {
        matchedUnit = listUnit[0];
      }

      if (matchedTahun) {
        setTahun(matchedTahun);
        upsertFilter("tahun", matchedTahun);
      }
      if (matchedUnit) {
        setFakultasUnit(matchedUnit);
        upsertFilter("fakultasunit", matchedUnit);
      }

      if (matchedTahun && matchedUnit) {
        await fetchMonitoringProker(matchedTahun, matchedUnit);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

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

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-4 border-b bg-gray-50">
          <div>
            <h4 className="text-lg font-semibold text-gray-800">
              Monitoring Dokumen Program Kerja
            </h4>
            <p className="text-sm text-gray-500">
              Status kelengkapan dan verifikasi dokumen per mata program
              {fakultasunit?.nama ? ` — ${fakultasunit.nama}` : ""}
            </p>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            title="Filter Monitoring Dokumen Proker"
            className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm bg-purple-600 text-white hover:bg-purple-700 transition shadow-sm"
          >
            <BsFilter size={18} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>

        {/* LEGEND */}
        <div className="px-5 py-3 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4">
            {Object.values(STATUS_LEGEND).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <span className={`w-3.5 h-3.5 rounded-sm ${item.color}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FILTER BADGES */}
        {filters.some((f) => f.val != null) && (
          <div className="px-5 py-2.5 flex flex-wrap items-center gap-2 border-b bg-gray-50/50">
            <span className="text-xs text-gray-500 font-medium">Filter Aktif:</span>
            {filters.map(
              (f, i) =>
                f.val != null && (
                  <span
                    key={i}
                    className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium"
                  >
                    {f.key === "tahun" ? "Tahun" : "Unit"}:{" "}
                    {typeof f.val === "object"
                      ? f.val?.nama || f.val?.label || f.val?.Tahun
                      : f.val}
                  </span>
                ),
            )}
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/70 text-sm text-gray-700 border-t">
                <th className="px-4 py-3 font-semibold">Mata Program</th>
                <th className="px-4 py-3 w-28 text-center font-semibold">SK</th>
                <th className="px-4 py-3 w-28 text-center font-semibold">SOP</th>
                <th className="px-4 py-3 w-32 text-center font-semibold">Proposal/TOR</th>
                <th className="px-4 py-3 w-28 text-center font-semibold">Laporan</th>
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
                  <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">
                    {tahun && fakultasunit
                      ? `Belum ada dokumen program kerja untuk ${fakultasunit.nama || "unit ini"} pada tahun ${tahun.nama || tahun.Tahun}.`
                      : "Pilih tahun dan unit melalui tombol filter untuk menampilkan data."}
                  </td>
                </tr>
              )}

              {!loading &&
                tableData.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50/60 transition">
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
      </div>

      {/* FILTER DRAWER */}
      <MonitoringFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tahun={tahun}
        setTahun={setTahun}
        dataTahun={dataTahun}
        loadingTahun={loadingTahun}
        errorTahun={errorTahun}
        onRetryTahun={fetchDataTahun}
        fakultasunit={fakultasunit}
        setFakultasUnit={setFakultasUnit}
        dataFakultasUnit={dataFakultasUnit}
        loadingFakultasUnit={loadingFakultasUnit}
        errorFakultasUnit={errorFakultasUnit}
        onRetryFakultasUnit={fetchDataFakultasUnit}
        upsertFilter={upsertFilter}
        onApply={(t, u) => {
          fetchMonitoringProker(t, u);
          setDrawerOpen(false);
        }}
        isAuditee={isAuditee}
      />
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
        <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

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
                    * Akun Auditee terikat ke unit Anda sendiri ({fakultasunit?.nama || "BPSI"}).
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
