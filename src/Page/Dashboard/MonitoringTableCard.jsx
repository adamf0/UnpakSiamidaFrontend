import { getBackground, isEmpty, STATUS_LEGEND } from "@/Common/Utils";
import Portal from "@/Components/Portal";
import SearchSelect from "@/Components/SearchSelect";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useEffect, useMemo, useState } from "react";

 {/* //[note] cek lagi bagian select, kalau masih waiting dibuat skeleton */}
export default function MonitoringTableCard() {
  const { getValidToken } = useAuth();
  const { addToast } = useToast();

  /* =========================
     LOCAL STATE (HERE!)
  ========================= */
  const [rawData, setRawData] = useState([]);
  const [filters, setFilters] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tahun, setTahun] = useState(null);
  const [fakultasunit, setFakultasUnit] = useState(null);
  const [dataFakultasUnit, setDataFakultasUnit] = useState([]);
  const [dataTahun, setDataTahun] = useState([]);

  const fetchDataTahun = async () => {
    if (isEmpty(getValidToken())) return;

    try {
      const res = await fetch(`http://localhost:3000/tahunprokers?mode=all`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${getValidToken()}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Fetch error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      const mapped = data.map((j) => ({
        id: j.UUID,
        nama: j.Tahun,
        ...j,
      }));

      setDataTahun(mapped);
    } catch (err) {
      console.error("Fetch data tahun proker gagal:", err);
    }
  };

  const fetchDataFakultasUnit = async () => {
    if (isEmpty(getValidToken())) return;

    try {
      const res = await fetch(`http://localhost:3000/fakultasunits?mode=all`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${getValidToken()}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Fetch error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      const mapped = data.map((j) => ({
        id: j.UUID,
        nama: fullFakultasUnit(j),
        ...j,
      }));

      setDataFakultasUnit(mapped);
    } catch (err) {
      console.error("Fetch data fakultas unit gagal:", err);
    }
  };

  function fullFakultasUnit(item) {
    if (item.Type == "prodi") {
      return `${item.Nama} (${item.Jenjang})`;
    } else if (item.Type == "fakultas") {
      return `${item.Nama} (fakultas)`;
    }
    return `${item.Nama} (unit)`;
  }

  const fetchMonitoringProker = async () => {
    if (isEmpty(getValidToken())) return;
    console.log(tahun, fakultasunit);

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/monitoringproker/${tahun.UUID}/${fakultasunit.UUID}?mode=all`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${getValidToken()}`,
          },
        },
      );

      if (!res.ok) {
        const err = await res.json();
        addToast("errors", err.message);
        return;
      }

      setRawData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    (async () => {
      await fetchDataTahun();
      await fetchDataFakultasUnit();
    })();
  }, []);

  useEffect(() => {
    if (!tahun || !fakultasunit) return;

    fetchMonitoringProker();
  }, [tahun, fakultasunit]);

  useEffect(() => {
    if (!fakultasunit || !tahun) return;

    (async () => {
      await fetchMonitoringProker(tahun.UUID, fakultasunit.UUID);
    })();
  }, [tahun, fakultasunit]);

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
      sopstyle: getBackground({
        r0: d.SOPR0,
        r1: d.SOPR1,
        r2: d.SOPR2,
        r3: d.SOPR3,
      }),
      proposalstyle: getBackground({
        r0: d.ProposalTORR0,
        r1: d.ProposalTORR1,
        r2: d.ProposalTORR2,
        r3: d.ProposalTORR3,
      }),
      laporanstyle: getBackground({
        r0: d.LaporanR0,
        r1: d.LaporanR1,
        r2: d.LaporanR2,
        r3: d.LaporanR3,
      }),
    }));
  }, [rawData]);

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between px-5 py-4 border-b bg-gray-50">
          <div>
            <h4 className="text-lg font-semibold">
              Monitoring Dokumen Program Kerja
            </h4>
            <p className="text-sm text-gray-500">
              Status kelengkapan dan verifikasi dokumen
            </p>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="px-3 py-2 border rounded-lg text-sm bg-purple-500 text-white hover:bg-purple-600"
          >
            Filter
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
                <span className={`w-3 h-3 rounded-sm ${item.color}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FILTER BADGES */}
        <div className="px-5 py-3 flex flex-wrap gap-2 border-b bg-gray-50">
          {filters.map(
            (f, i) =>
              f.val != null && (
                <span
                  key={i}
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                >
                  {f.key}:{" "}
                  {typeof f.val === "object"
                    ? f.val?.nama || f.val?.label
                    : f.val}
                </span>
              ),
          )}
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-t">
                <th className="px-4 py-3">Mata Program</th>
                <th className={`px-4 py-3`}>SK</th>
                <th className={`px-4 py-3`}>SOP</th>
                <th className={`px-4 py-3`}>Proposal/TOR</th>
                <th className={`px-4 py-3`}>Laporan</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-6 text-center">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                tableData.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-3 font-light">{row.MataProgram}</td>
                    <td className={`px-4 py-3 ${row.skstyle}`} />
                    <td className={`px-4 py-3 ${row.sopstyle}`} />
                    <td className={`px-4 py-3 ${row.proposalstyle}`} />
                    <td className={`px-4 py-3 ${row.laporanstyle}`} />
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAWER DI SINI */}
      <MonitoringFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tahun={tahun}
        setTahun={setTahun}
        dataTahun={dataTahun}
        fakultasunit={fakultasunit}
        setFakultasUnit={setFakultasUnit}
        dataFakultasUnit={dataFakultasUnit}
        upsertFilter={upsertFilter}
        resetFilters={() => setFilters([])}
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
  fakultasunit,
  setFakultasUnit,
  dataFakultasUnit,
  upsertFilter,
  resetFilters,
}) {
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/30" onClick={onClose} />

        <div className="w-[420px] bg-white h-full shadow-xl p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">
              Filter Monitoring Dokumen Program Kerja
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 text-black"
            >
              ✕
            </button>
          </div>

          {/* ================= MODE FILTER ================= */}
          <div className="space-y-4">
            <SearchSelect
              label="Tahun Proker"
              required
              options={dataTahun}
              placeholder="Cari tahun"
              value={tahun}
              onChange={(item) => {
                setTahun(item);
                upsertFilter("tahun", item);
              }}
            />

            <SearchSelect
              label="Fakultas Unit"
              required
              options={dataFakultasUnit}
              placeholder="Cari fakultas / prodi / unit"
              value={fakultasunit}
              onChange={(item) => {
                setFakultasUnit(item);
                upsertFilter("fakultasunit", item);
              }}
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onClose();
                }}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm"
              >
                Terapkan
              </button>
              <button
                onClick={() => {
                  setTahun(null);
                  setFakultasUnit(null);
                  resetFilters();
                  onClose();
                }}
                className="flex-1 border rounded-lg py-2 text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
