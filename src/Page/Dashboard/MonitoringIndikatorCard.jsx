import {
  isEmpty,
  renderLabelFakultasUnit,
  STATUS_LEGEND,
} from "@/Common/Utils";
import Portal from "@/Components/Portal";
import SearchSelect from "@/Components/SearchSelect";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { useEffect, useMemo, useState } from "react";
import { BsFilter } from "react-icons/bs";

 {/* //[note] cek lagi bagian select, kalau masih waiting dibuat skeleton */}
export default function MonitoringIndikatorCard() {
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
  const [indikator, setIndikator] = useState(null);
  const [dataIndikator, setDataIndikator] = useState([]);
  const [dataTahun, setDataTahun] = useState([]);

  const fetchDataTahun = async () => {
    if (isEmpty(getValidToken())) return;

    try {
      const res = await fetch(`http://localhost:3000/tahunrenstras?mode=all`, {
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
        id: j.Tahun,
        nama: j.Tahun,
        ...j,
      }));

      setDataTahun(mapped);
    } catch (err) {
      console.error("Fetch data tahun proker gagal:", err);
    }
  };

  const fetchDataIndikator = async (tahun) => {
    if (isEmpty(getValidToken())) return;

    try {
      const res = await fetch(
        `http://localhost:3000/indikatorrenstra/tree/${tahun}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${getValidToken()}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error(`Fetch error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      const mapped = data.map((j) => ({
        id: j.IndikatorUuid,
        nama: `${j.Pointing}. ${j.Indikator}`,
        ...j,
      }));

      setDataIndikator(mapped);
      setIndikator((prev) => {
        if (!prev) return null;

        const stillExists = mapped.some(
          (item) => item.IndikatorUuid === prev.IndikatorUuid,
        );

        return stillExists ? prev : null;
      });

      // optional: sinkronkan filter badge
      setFilters((prev) =>
        prev.map((f) =>
          f.key === "indikator" && !mapped.some((i) => i.id === f.val?.id)
            ? { ...f, val: null }
            : f,
        ),
      );
    } catch (err) {
      console.error("Fetch data tahun proker gagal:", err);
      setDataIndikator([]);
      setIndikator(null);
    }
  };

  useEffect(() => {
    if (!tahun) return;

    (async () => {
      await fetchDataIndikator(tahun.nama);
    })();
  }, [tahun]);

  const fetchMonitoringIndikator = async () => {
    if (isEmpty(getValidToken())) return;

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/monitoringindikator/${tahun.Tahun}/${indikator.IndikatorUuid}?mode=all`,
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

      const datas = await res.json();
      setRawData(
        (datas ?? [])
          .filter((data) =>
            ["numerik", "range", "kategori"].includes(data.TipeTarget),
          )
          .map((data) => {
            const isCategory = data.TipeTarget == "kategori";

            if (isCategory) {
              data.Capaian =
                isEmpty(data?.Capaian) ||
                !["terlaksana", "tercapai"].includes(data?.Capaian)
                  ? 0
                  : 100;
              data.CapaianAuditor =
                isEmpty(data?.CapaianAuditor) ||
                !["terlaksana", "tercapai"].includes(data?.CapaianAuditor)
                  ? 0
                  : 100;
            }

            return data;
          }),
      );
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
    })();
  }, []);

  useEffect(() => {
    if (!tahun || !indikator) return;

    fetchMonitoringIndikator();
  }, [tahun, indikator]);

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
  const tableData = useMemo(() => rawData, [rawData]);

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between px-5 py-4 border-b bg-gray-50">
          <div>
            <h4 className="text-lg font-semibold">Monitoring Indikator</h4>
            <p className="text-sm text-gray-500">
              Status kelengkapan dan verifikasi dokumen
            </p>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="px-3 py-2 border rounded-lg text-sm bg-purple-500 text-white hover:bg-purple-600"
          >
            <BsFilter />
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
                <th className="px-4 py-3">Fakultas / Prodi / Unit</th>
                <th className={`px-4 py-3`}>Nilai</th>
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
                    <td className="px-4 py-3 font-light">
                      {renderLabelFakultasUnit(row)}
                    </td>
                    <td className={`px-4 py-3`}>{row.CapaianAuditor ?? 0}</td>
                  </tr>
                ))}
            </tbody>
            {!loading &&
              tableData.length > 0 &&
              (() => {
                const values = tableData
                  .map((r) => Number(r.CapaianAuditor))
                  .filter((v) => !isNaN(v));

                const total = values.reduce((sum, v) => sum + v, 0);
                const avg = values.length ? total / values.length : 0;

                return (
                  <tfoot>
                    <tr className="border-t font-semibold bg-gray-50">
                      <td className="px-4 py-3 text-right">Total</td>
                      <td className="px-4 py-3">{total.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t font-semibold bg-gray-50">
                      <td className="px-4 py-3 text-right">Rata-rata</td>
                      <td className="px-4 py-3">{avg.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                );
              })()}
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
        indikator={indikator}
        setIndikator={setIndikator}
        dataIndikator={dataIndikator}
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
  indikator,
  setIndikator,
  dataIndikator,
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
              className="text-gray-500 hover:text-black"
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
              label="Indikator"
              required
              options={dataIndikator}
              placeholder="Cari fakultas / prodi / unit"
              value={indikator}
              onChange={(item) => {
                setIndikator(item);
                upsertFilter("indikator", item);
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
                  setIndikator(null);
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
