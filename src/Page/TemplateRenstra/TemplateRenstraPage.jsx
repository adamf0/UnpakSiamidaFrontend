import ChangeLevelModal from "@/Components/ChangeLevelModal";
import Navbar from "@/Components/Navbar";
import RemoteTable from "@/Components/RemoteTable";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Eye, Pencil, Trash2, LayoutTemplate, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/Components/PageHeader";
import { apiClient } from "@/Common/api";
import { useFeatureActionVisibility } from "@/Common/versionConfig";

const FIXED_TARGET_GROUPS = [
  {
    key: "fakultas#all",
    name: "Fakultas",
    type: "fakultas",
    badgeLabel: "Fakultas",
    badgeClass: "bg-blue-600 text-white",
  },
  {
    key: "prodi#s1",
    name: "Prodi (S1)",
    type: "prodi",
    badgeLabel: "Prodi (S1)",
    badgeClass: "bg-cyan-400 text-gray-900",
  },
  {
    key: "prodi#s2",
    name: "Prodi (S2)",
    type: "prodi",
    badgeLabel: "Prodi (S2)",
    badgeClass: "bg-cyan-400 text-gray-900",
  },
  {
    key: "prodi#s3",
    name: "Prodi (S3)",
    type: "prodi",
    badgeLabel: "Prodi (S3)",
    badgeClass: "bg-cyan-400 text-gray-900",
  },
  {
    key: "prodi#d3",
    name: "Prodi (D3)",
    type: "prodi",
    badgeLabel: "Prodi (D3)",
    badgeClass: "bg-cyan-400 text-gray-900",
  },
  {
    key: "prodi#d4",
    name: "Prodi (D4)",
    type: "prodi",
    badgeLabel: "Prodi (D4)",
    badgeClass: "bg-cyan-400 text-gray-900",
  },
  {
    key: "prodi#profesi",
    name: "Prodi (Profesi)",
    type: "prodi",
    badgeLabel: "Prodi (Profesi)",
    badgeClass: "bg-cyan-400 text-gray-900",
  },
];

const getTargetCardKey = (t) => {
  const kat = (t?.Kategori || "").trim().toLowerCase();
  if (!kat || kat === "unit") {
    return String(t?.FakultasUnitID ?? "");
  }
  if (kat === "fakultas") {
    return "fakultas#all";
  }
  return kat;
};

const TemplateRenstraPage = () => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerTargets, setDrawerTargets] = useState([]);
  const [drawerMode, setDrawerMode] = useState("detail");
  const { getValidToken } = useAuth();

  const [tahunList, setTahunList] = useState([]);
  const [selectedTahun, setSelectedTahun] = useState("");
  const [userChangedTahun, setUserChangedTahun] = useState(false);
  const [unitTargets, setUnitTargets] = useState([]);
  const [allTemplateRows, setAllTemplateRows] = useState([]);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchMeta = async () => {
      const token = getValidToken();
      if (!token) return;
      setLoadingMeta(true);
      try {
        const [tahunRes, fuRes] = await Promise.all([
          apiClient.get("/tahunprokers?mode=all").catch(() => []),
          apiClient.get("/fakultasunits?mode=all").catch(() => []),
        ]);

        if (!active) return;

        const tahunBody = tahunRes?.data ?? tahunRes;
        const rawTahun = Array.isArray(tahunBody)
          ? tahunBody
          : Array.isArray(tahunBody?.data)
          ? tahunBody.data
          : [];
        const sortedTahun = [...rawTahun]
          .filter((item) => item?.Tahun)
          .sort((a, b) => Number(b.Tahun) - Number(a.Tahun));
        setTahunList(sortedTahun);

        const fuBody = fuRes?.data ?? fuRes;
        const rawFu = Array.isArray(fuBody)
          ? fuBody
          : Array.isArray(fuBody?.data)
          ? fuBody.data
          : [];
        const units = rawFu
          .filter(
            (u) =>
              (u?.Type || "").toLowerCase() === "unit" &&
              u?.Nama &&
              u?.UUID &&
              u.UUID !== "00000000-0000-0000-0000-000000000000"
          )
          .sort((a, b) => String(a.Nama).localeCompare(String(b.Nama), "id"));
        setUnitTargets(units);
      } catch (err) {
        console.error("Gagal memuat master tahun / fakultas unit:", err);
      } finally {
        if (active) setLoadingMeta(false);
      }
    };

    fetchMeta();
    return () => {
      active = false;
    };
  }, [getValidToken]);

  // Set default selectedTahun from master_tahun once metadata and template rows are available
  useEffect(() => {
    if (userChangedTahun || tahunList.length === 0) return;

    const yearsWithData = new Set(
      allTemplateRows.map((r) => String(r?.Tahun || "")).filter(Boolean)
    );

    if (yearsWithData.size > 0) {
      // Pick the latest year in master_tahun that has full or any template data
      const preferredYear =
        tahunList.find(
          (t) =>
            yearsWithData.has(String(t.Tahun)) &&
            allTemplateRows.some(
              (r) =>
                String(r.Tahun) === String(t.Tahun) &&
                Array.isArray(r.Targets) &&
                r.Targets.some((tg) => (tg?.Kategori || "").startsWith("fakultas"))
            )
        ) || tahunList.find((t) => yearsWithData.has(String(t.Tahun)));

      if (preferredYear) {
        setSelectedTahun(String(preferredYear.Tahun));
        return;
      }
    }

    if (!selectedTahun) {
      const activeYear =
        tahunList.find((t) => String(t.Status).toLowerCase() === "aktif") ||
        tahunList[0];
      if (activeYear) {
        setSelectedTahun(String(activeYear.Tahun));
      }
    }
  }, [tahunList, allTemplateRows, userChangedTahun, selectedTahun]);

  const handleAdapter = useCallback((rows = []) => {
    const adapted = templateRenstraAdapter(rows);
    setAllTemplateRows((prev) =>
      adapted.length >= prev.length || prev.length === 0 ? adapted : prev
    );
    return adapted;
  }, []);

  const allTargetsCatalog = useMemo(() => {
    const unitItems = unitTargets.map((u) => ({
      key: String(u.ID),
      name: `${u.Nama} (unit)`,
      unitName: u.Nama,
      type: "unit",
      badgeLabel: "Unit",
      badgeClass: "bg-slate-500 text-white",
    }));
    return [...FIXED_TARGET_GROUPS, ...unitItems];
  }, [unitTargets]);

  const targetSummary = useMemo(() => {
    const counts = {};
    const auditor1Counts = {};
    const auditor2Counts = {};

    const rowsForYear = selectedTahun
      ? allTemplateRows.filter((r) => String(r.Tahun) === String(selectedTahun))
      : allTemplateRows;

    for (const row of rowsForYear) {
      if (!Array.isArray(row.Targets)) continue;
      const seenInGroup = new Set();

      for (const t of row.Targets) {
        const kat = (t?.Kategori || "").trim().toLowerCase();
        const isUnit = !kat || kat === "unit";
        const dedupKey = isUnit
          ? `unit#${t.FakultasUnitID ?? t.FakultasUnit}`
          : `kat#${kat === "fakultas" ? "fakultas#all" : kat}`;

        if (seenInGroup.has(dedupKey)) continue;
        seenInGroup.add(dedupKey);

        const targetKey = getTargetCardKey(t);
        if (!targetKey) continue;

        counts[targetKey] = (counts[targetKey] || 0) + 1;
        if (t.Tugas === "auditor1") {
          auditor1Counts[targetKey] = (auditor1Counts[targetKey] || 0) + 1;
        } else if (t.Tugas === "auditor2") {
          auditor2Counts[targetKey] = (auditor2Counts[targetKey] || 0) + 1;
        }
      }
    }

    return allTargetsCatalog.map((target) => ({
      ...target,
      total: counts[target.key] || 0,
      auditor1: auditor1Counts[target.key] || 0,
      auditor2: auditor2Counts[target.key] || 0,
    }));
  }, [allTargetsCatalog, allTemplateRows, selectedTahun]);

  const toggleTargetCard = (key) => {
    const strKey = String(key);
    setSelectedTargets((prev) =>
      prev.includes(strKey)
        ? prev.filter((k) => k !== strKey)
        : [...prev, strKey]
    );
  };

  const getFilteredRowTargets = useCallback(
    (row) => {
      if (!Array.isArray(row?.Targets)) return [];
      if (selectedTargets.length === 0) return row.Targets;
      return row.Targets.filter((t) =>
        selectedTargets.includes(getTargetCardKey(t))
      );
    },
    [selectedTargets]
  );

  const filterTableRow = useCallback(
    (row) => {
      if (selectedTahun && String(row.Tahun) !== String(selectedTahun)) {
        return false;
      }
      if (selectedTargets.length > 0) {
        if (!Array.isArray(row.Targets)) return false;
        const hasMatch = row.Targets.some((t) =>
          selectedTargets.includes(getTargetCardKey(t))
        );
        if (!hasMatch) return false;
      }
      return true;
    },
    [selectedTahun, selectedTargets]
  );

  const formatKategori = (kategori) => {
    if (!kategori) return "unit";

    const parts = kategori.split("#");

    if (parts.length === 2) {
      const [scope, level] = parts;

      if (scope === "fakultas") {
        return "fakultas";
      }

      return `${level} (${scope})`;
    }

    return "unit";
  };

  const kategoriKey = (kategori) => {
    if (!kategori) return "unit";
    return kategori;
  };

  const openTargetDrawer = (row, kategoriLabel) => {
    const activeTargets = getFilteredRowTargets(row);
    let filtered = [];

    if (kategoriLabel === "fakultas") {
      filtered = activeTargets.filter(
        (t) => t.Kategori === "fakultas#all" || t.Kategori === "fakultas"
      );
    } else if (kategoriLabel === "unit") {
      filtered = activeTargets.filter(
        (t) => !t.Kategori || t.Kategori === "unit"
      );
    } else {
      const [level, scope] = kategoriLabel.replace(")", "").split(" (");
      const targetKategoriKey = `${scope}#${level}`;
      filtered = activeTargets.filter((t) => t.Kategori === targetKategoriKey);
    }

    setDrawerTitle(`${kategoriLabel} - ${row.Indikator}`);
    setDrawerTargets(filtered);
    setDrawerMode("detail");
    setDrawerOpen(true);
  };

  const openFakultasDrawer = (row, fakultasUnit) => {
    const activeTargets = getFilteredRowTargets(row);
    const filtered = activeTargets.filter((t) => t.FakultasUnit === fakultasUnit);

    setDrawerTitle(`${fakultasUnit} - ${row.Indikator}`);
    setDrawerTargets(filtered);
    setDrawerMode("detail");
    setDrawerOpen(true);
  };

  const openAllFakultasDrawer = (row) => {
    const activeTargets = getFilteredRowTargets(row);
    setDrawerTitle(row.Indikator);
    setDrawerTargets(activeTargets);
    setDrawerMode("list-fakultas");
    setDrawerOpen(true);
  };

  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } = useContent();
  const canShowActions = useFeatureActionVisibility();

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
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-4">
        <PageHeader
          icon={LayoutTemplate}
          title="Template Renstra"
          subtitle="Kelola matriks instrumen dan kriteria target capaian Renstra"
        />

        {/* SECTION TOTAL DATA PEMETAAN TARGET */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-gray-800">
                Total Data Pemetaan Target
              </h2>
              {selectedTargets.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedTargets.length} target dipilih
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {selectedTargets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTargets([])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-500 rounded-lg transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tampilkan Semua Target</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <label
                  htmlFor="template-renstra-tahun-select"
                  className="text-xs font-semibold text-gray-600 whitespace-nowrap"
                >
                  Tahun:
                </label>
                <select
                  id="template-renstra-tahun-select"
                  value={selectedTahun}
                  onChange={(e) => {
                    setUserChangedTahun(true);
                    setSelectedTahun(e.target.value);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition cursor-pointer"
                >
                  <option value="">Semua Tahun</option>
                  {tahunList.map((item) => (
                    <option
                      key={item.UUID || item.Id || item.Tahun}
                      value={String(item.Tahun)}
                    >
                      {item.Tahun}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-0.5">
            {loadingMeta && allTemplateRows.length === 0 ? (
              Array.from({ length: 7 }).map((_, idx) => (
                <div
                  key={idx}
                  className="min-w-[185px] sm:min-w-[195px] shrink-0 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 animate-pulse"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-5 w-16 rounded-full bg-gray-200" />
                    <div className="h-6 w-8 rounded bg-gray-200" />
                  </div>
                  <div className="h-4 w-28 rounded bg-gray-200 mb-3" />
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/80">
                    <div className="h-3 w-16 rounded bg-gray-200" />
                    <div className="h-3 w-16 rounded bg-gray-200" />
                  </div>
                </div>
              ))
            ) : (
              targetSummary.map((item) => {
                const isSelected = selectedTargets.includes(String(item.key));
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleTargetCard(item.key)}
                    title={`Klik untuk memfilter target: ${item.name}`}
                    className={`min-w-[185px] sm:min-w-[195px] shrink-0 text-left rounded-xl p-3.5 transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                      isSelected
                        ? "border-2 border-blue-600 bg-blue-50/30 shadow-xs"
                        : "border border-gray-200 bg-gray-50/60 hover:bg-white hover:border-blue-300 hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold leading-tight ${item.badgeClass}`}
                      >
                        {item.badgeLabel}
                      </span>
                      <span className="text-lg font-bold text-gray-900 leading-none">
                        {item.total}
                      </span>
                    </div>

                    <div
                      className="text-xs font-semibold text-gray-600 truncate mb-2.5"
                      title={item.name}
                    >
                      {item.name}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-200/80 text-[11px] text-gray-500">
                      <span>
                        Auditor 1:{" "}
                        <strong className="font-bold text-gray-800">
                          {item.auditor1}
                        </strong>
                      </span>
                      <span>
                        Auditor 2:{" "}
                        <strong className="font-bold text-gray-800">
                          {item.auditor2}
                        </strong>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            endpoint="/templaterenstras"
            mode="sse" //harus sse jangan paging (keporong), all (oom), ndjson (oom)
            token={getValidToken()}
            filterFn={filterTableRow}
            renderAddAction={
              canShowActions ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition shadow-2xs cursor-pointer"
                    onClick={() => navigate("/template_renstra/preview")}
                  >
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span>Pratinjau</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition shadow-2xs cursor-pointer"
                    onClick={() => navigate("/template_renstra/new")}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Template</span>
                  </button>
                </div>
              ) : null
            }
            adapter={handleAdapter}
            listcolumns={[
              {
                key: "Tahun",
                label: "Tahun",
                searchable: false,
                allowedOps: ["eq", "neq", "in"],
              },
              {
                key: "StandarRenstra",
                label: "Standar Renstra",
                searchable: false,
              },
              { key: "Indikator", label: "Indikator", searchable: true },
              {
                key: "Targets",
                label: "Target",
                renderKey: (row) => {
                  const activeTargets = getFilteredRowTargets(row);
                  if (!activeTargets.length) return "-";

                  const labels = new Map();

                  activeTargets.forEach((t) => {
                    const label = formatKategori(t.Kategori);
                    const key = kategoriKey(t.Kategori);

                    labels.set(key, label);
                  });

                  return (
                    <div className="flex flex-wrap gap-1">
                      {[...labels.values()].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => openTargetDrawer(row, label)}
                          className="px-2 py-0.5 text-xs rounded-full
                                  bg-blue-100 text-blue-700 hover:bg-blue-200
                                  whitespace-nowrap cursor-pointer transition"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  );
                },
                searchable: false,
              },
              {
                key: "Tags",
                label: "Tags",
                renderKey: (row) => {
                  const activeTargets = getFilteredRowTargets(row);
                  if (!activeTargets.length) return "-";

                  const unique = new Map();
                  activeTargets.forEach((t) => {
                    if (t.FakultasUnit) {
                      unique.set(t.FakultasUnit, t.FakultasUnit);
                    }
                  });

                  const all = [...unique.values()];
                  const visible = all.slice(0, 5);
                  const remaining = all.length - visible.length;

                  return (
                    <div className="flex flex-wrap gap-1">
                      {visible.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => openFakultasDrawer(row, label)}
                          className="px-2 py-0.5 text-xs rounded-full
                                    bg-emerald-100 text-emerald-700
                                    hover:bg-emerald-200 cursor-pointer"
                        >
                          {label}
                        </button>
                      ))}

                      {remaining > 0 && (
                        <button
                          type="button"
                          onClick={() => openAllFakultasDrawer(row)}
                          className="px-2 py-0.5 text-xs rounded-full
                                    bg-gray-200 text-gray-700
                                    hover:bg-gray-300 cursor-pointer"
                        >
                          +{remaining}
                        </button>
                      )}
                    </div>
                  );
                },
                searchable: false,
              },
            ]}
            renderAction={({ row, close }) => (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
                    navigate(
                      `/template_renstra/${row.Tahun}/${row.IndikatorRenstraUuid}`
                    );
                    close();
                  }}
                >
                  <Pencil className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Edit</span>
                </button>

                <div className="my-1 border-t border-gray-150" />

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
                    close();
                  }}
                >
                  <Trash2 className="w-4 h-4 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          />
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="flex-1 bg-black/30"
              onClick={() => setDrawerOpen(false)}
            />

            <div className="w-[420px] bg-white h-full shadow-xl p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-lg">{drawerTitle}</h2>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="text-gray-500 hover:text-black"
                >
                  ✕
                </button>
              </div>

              {/* ================= MODE LIST FAKULTAS ================= */}
              {drawerMode === "list-fakultas" && (
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Fakultas / Prodi / Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set(drawerTargets.map((t) => t.FakultasUnit))].map(
                      (fu) => (
                        <tr key={fu} className="border-b">
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() =>
                                openFakultasDrawer(
                                  {
                                    Targets: drawerTargets,
                                    Indikator: drawerTitle,
                                  },
                                  fu
                                )
                              }
                              className="w-full text-left hover:text-blue-500"
                            >
                              {fu}
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              )}

              {/* ================= MODE DETAIL TARGET ================= */}
              {drawerMode === "detail" &&
                drawerTargets.map((t, i) => (
                  <div key={i} className="mt-4 border rounded p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Fakultas</div>
                      <div>{t.FakultasUnit}</div>
                      <div className="font-medium">Kategori</div>
                      <div>{formatKategori(t.Kategori)}</div>
                      <div className="font-medium">Klasifikasi</div>
                      <div>{t.Klasifikasi}</div>
                      <div className="font-medium">Satuan</div>
                      <div>{t.Satuan}</div>
                      <div className="font-medium">Target</div>{" "}
                      <div>
                        {t.TipeTarget == "range" ? (
                          <>
                            {t.TargetMin ?? "0"} - {t.TargetMax ?? "0"}
                          </>
                        ) : t.TipeTarget == "kategori" ? (
                          <>
                            {">="} {t.Target}
                          </>
                        ) : (
                          t.Target
                        )}
                      </div>
                      <div className="font-medium">Tugas</div>
                      <div>{t.Tugas}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TemplateRenstraPage;

export const templateRenstraAdapter = (rows = []) => {
  const map = {};

  for (const r of rows) {
    const key = `${r.IndikatorRenstraID}-${r.Tahun}`;

    if (!map[key]) {
      map[key] = {
        IndikatorRenstraID: r.IndikatorRenstraID,
        Indikator: r.Indikator,
        IndikatorRenstraUuid: r.IndikatorRenstraUuid,
        Tahun: r.Tahun,
        StandarRenstra: r.StandarRenstra,
        Targets: [],
      };
    }

    map[key].Targets.push({
      ID: r.ID,
      UUID: r.UUID,
      IsPertanyaan: r.IsPertanyaan,
      FakultasUnitID: r.FakultasUnitID,
      FakultasUnit: r.FakultasUnit,
      Kategori: r.Kategori,
      Klasifikasi: r.Klasifikasi,
      Satuan: r.Satuan,
      Target: r.Target,
      TipeTarget: r.TipeTarget,
      Operator: r.Operator,
      TargetMin: r.TargetMin,
      TargetMax: r.TargetMax,
      Tugas: r.Tugas,
    });
  }

  return Object.values(map);
};

