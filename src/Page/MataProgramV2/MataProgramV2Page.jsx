import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RemoteTable from "@/Components/RemoteTable";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { Plus, Pencil, Trash2, Layers, RotateCcw, Archive } from "lucide-react";
import { useAuth } from "@/Providers/AuthProvider";
import { apiClient } from "@/Common/api";
import PageHeader from "@/Components/PageHeader";

export default function MataProgramV2Page() {
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const { addToast } = useToast();
  const { getValidToken, user } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
    positionYear,
  } = useContent();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const curRole = String(
    level || localStorage.getItem("activeLevel") || user?.level || ""
  ).toLowerCase().trim();

  const isAdmin =
    curRole === "admin" ||
    user?.level === "admin" ||
    user?.Level === "admin";

  React.useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  const activeUnit = React.useMemo(() => {
    let userFU = user?.fakultas_unit || user?.id_fakultas_unit || user?.FakultasUnit;
    if (Array.isArray(user?.extra_role)) {
      const match =
        user.extra_role.find(
          (r) =>
            String(r.role || "").toLowerCase() === "user" &&
            (!positionYear || String(r.tahun ?? r.Tahun) === String(positionYear)) &&
            (r.id_fakultas_unit || r.IdFakultasUnit)
        ) ||
        user.extra_role.find(
          (r) =>
            String(r.role || "").toLowerCase() === "user" &&
            (r.id_fakultas_unit || r.IdFakultasUnit)
        );
      if (match?.id_fakultas_unit || match?.IdFakultasUnit) {
        userFU = match.id_fakultas_unit || match.IdFakultasUnit;
      }
    }
    const fuStr = String(userFU ?? "").trim();
    if (!fuStr || fuStr === "0" || fuStr === "null" || fuStr === "undefined") return null;
    return fuStr;
  }, [user, positionYear]);

  const isUnrestrictedData =
    curRole === "anggaran" ||
    curRole === "keuangan" ||
    curRole === "evaluator" ||
    curRole === "admin";

  const endpoint = React.useMemo(() => {
    const params = new URLSearchParams();
    if (positionYear && positionYear !== "all") {
      params.append("filter_tahun", String(positionYear));
      params.append("tahun", String(positionYear));
    }
    if (!isUnrestrictedData && activeUnit) {
      params.append("id_fakultas_unit", activeUnit);
      params.append("filter_fakultas_unit", activeUnit);
    }
    if (showDeleted) {
      params.append("show_deleted", "true");
    }
    const qs = params.toString();
    return `/mataprogramv2s${qs ? `?${qs}` : ""}`;
  }, [positionYear, isUnrestrictedData, activeUnit, showDeleted]);

  // Soft delete mata program
  const handleDelete = async () => {
    const targetUuid = selectedRow?.UUID || selectedRow?.uuid;
    if (!targetUuid) return;
    try {
      await apiClient.delete(`/mataprogramv2/${targetUuid}`);
      addToast("success", "Berhasil menghapus mata program (soft delete)");
    } catch (err) {
      console.error("Hapus gagal:", err);
      addToast("error", err?.response?.data?.message || err?.message || "Gagal menghapus data");
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

  // Restore mata program
  const handleRestore = async (row) => {
    const targetUuid = row?.UUID || row?.uuid;
    if (!targetUuid) return;
    try {
      await apiClient.post(`/mataprogramv2/${targetUuid}/restore`);
      addToast(
        "success",
        `Berhasil memulihkan program "${row.MataProgram || ""}"`
      );
      tableRef.current?.reload?.({ resetPage: true });
    } catch (err) {
      console.error("Restore gagal:", err);
      addToast("error", err?.response?.data?.message || err?.message || "Gagal memulihkan mata program");
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

      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-4">
        <PageHeader
          icon={Layers}
          title="Mata Program"
          subtitle="Kelola master mata program kerja dan hubungkan dengan Template IKU"
        />

        {showDeleted && (
          <div className="px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Menampilkan <strong>data mata program yang di-softdelete</strong>. Klik menu aksi untuk memulihkan data.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleted(false)}
              className="text-rose-900 font-semibold underline hover:text-rose-950 cursor-pointer ml-3 shrink-0"
            >
              Kembali ke Data Aktif
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            key={`${level}-${activeUnit || "all"}-${positionYear || "all"}-${showDeleted ? "deleted" : "active"}`}
            ref={tableRef}
            endpoint={endpoint}
            mode="paging"
            forceShowActions={true}
            token={getValidToken()}
            onError={(err) => {
              console.error("MATA PROGRAM V2 TABLE ERROR:", err);
            }}
            renderAddAction={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold shadow-2xs transition shrink-0 cursor-pointer border ${
                    showDeleted
                      ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setShowDeleted((prev) => !prev)}
                  title={showDeleted ? "Kembali ke data mata program aktif" : "Lihat data mata program yang terhapus"}
                >
                  {showDeleted ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      <span>Kembali ke Data Aktif</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Show Deleted</span>
                    </>
                  )}
                </button>

                {isAdmin && !showDeleted && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition shrink-0 cursor-pointer"
                    onClick={() => navigate("/mata_programv3/new")}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Mata Program</span>
                  </button>
                )}
              </div>
            }
            listcolumns={[
              { key: "Tahun", label: "Tahun", searchable: true, width: "w-24 text-center" },
              { key: "MataProgram", label: "Nama Program Kerja", searchable: true, width: "w-64" },
              {
                key: "TemplateRenstraSasaran",
                label: "Template IKU Sasaran",
                searchable: true,
                renderKey: (row, ctx) => {
                  const colFilterVal = String(ctx?.filterValue || "").toLowerCase().trim();
                  const globalSearchVal = String(ctx?.search || "").toLowerCase().trim();
                  const templates = Array.isArray(row.TemplateRenstras) ? row.TemplateRenstras : [];
                  if (templates.length > 0) {
                    const groupedIndikators = {};
                    templates.forEach((t) => {
                      const key = t.Indikator || `Indikator #${t.IndikatorRenstraID}`;
                      if (!groupedIndikators[key]) {
                        groupedIndikators[key] = {
                          name: key,
                          standar: t.StandarRenstra,
                          targetsByUnit: new Map(),
                          targets: [],
                        };
                      }
                      const unitKey = t.FakultasUnitID
                        ? `fu:${t.FakultasUnitID}`
                        : `name:${String(t.FakultasUnit || "").trim().toLowerCase()}`;
                      const prev = groupedIndikators[key].targetsByUnit.get(unitKey);
                      if (!prev || Number(t.ID) > Number(prev.ID)) {
                        groupedIndikators[key].targetsByUnit.set(unitKey, t);
                      }
                    });
                    Object.values(groupedIndikators).forEach((g) => {
                      g.targets = Array.from(g.targetsByUnit.values());
                    });

                    const formatTargetUnitWithJenjang = (t) => {
                      const base = String(t?.FakultasUnit || "Unit").trim();
                      let jenjang = String(t?.Jenjang || "").trim().toUpperCase();
                      if (!jenjang) {
                        const kat = String(t?.Kategori || "").trim().toLowerCase();
                        if (kat.startsWith("prodi#")) {
                          jenjang = kat.slice("prodi#".length).trim().toUpperCase();
                        }
                      }
                      if (!jenjang || jenjang === "ALL") return base;
                      const suffix = `(${jenjang})`;
                      if (base.toUpperCase().endsWith(suffix)) return base;
                      return `${base} ${suffix}`;
                    };

                    let displayItems = Object.values(groupedIndikators);
                    if (colFilterVal) {
                      displayItems = displayItems.filter((item) => {
                        const matchName = (item.name || "").toLowerCase().includes(colFilterVal);
                        const matchStandar = (item.standar || "").toLowerCase().includes(colFilterVal);
                        const matchUnit = item.targets.some((tg) =>
                          formatTargetUnitWithJenjang(tg).toLowerCase().includes(colFilterVal)
                        );
                        return matchName || matchStandar || matchUnit;
                      });
                    } else if (globalSearchVal) {
                      const matched = displayItems.filter((item) => {
                        const matchName = (item.name || "").toLowerCase().includes(globalSearchVal);
                        const matchStandar = (item.standar || "").toLowerCase().includes(globalSearchVal);
                        const matchUnit = item.targets.some((tg) =>
                          formatTargetUnitWithJenjang(tg).toLowerCase().includes(globalSearchVal)
                        );
                        return matchName || matchStandar || matchUnit;
                      });
                      if (matched.length > 0) {
                        displayItems = matched;
                      }
                    }

                    if (displayItems.length === 0) {
                      return (
                        <span className="text-xs text-gray-400 italic">
                          Tidak ada indikator yang sesuai pencarian
                        </span>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-2 py-1 max-w-xl">
                        {displayItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl border bg-purple-50/50 border-purple-200/80 shadow-2xs space-y-1 transition hover:bg-purple-50"
                            title={`${item.standar ? `[${item.standar}]\n` : ""}${item.name}\n\nSasaran Unit (${item.targets.length}):\n${item.targets.map((t) => `• ${formatTargetUnitWithJenjang(t)} (Target: ${t.Target || "-"} ${t.Satuan || ""})`).join("\n")}`}
                          >
                            {item.standar && (
                              <div className="text-[10px] font-semibold text-purple-700 leading-tight">
                                {item.standar}
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-xs font-bold text-gray-900 leading-snug">
                                {item.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-purple-100 text-purple-900 border-purple-300 shrink-0 whitespace-nowrap">
                                {item.targets.length} unit sasaran
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <span className="text-xs text-gray-400 italic">
                      Belum ada Template IKU sasaran
                    </span>
                  );
                },
              },
              {
                key: "Informasi",
                label: "Info",
                searchable: true,
                width: "w-72",
                renderKey: (row, ctx) => {
                  const colFilterVal = String(ctx?.filterValue || "").toLowerCase().trim();
                  const globalSearchVal = String(ctx?.search || "").toLowerCase().trim();
                  const pUnits = Array.isArray(row.ProkerUnits) ? row.ProkerUnits : [];
                  if (pUnits.length === 0) {
                    return (
                      <span className="text-xs text-gray-400 italic">
                        Belum ada unit proker
                      </span>
                    );
                  }

                  let displayUnits = pUnits;
                  if (colFilterVal) {
                    displayUnits = pUnits.filter(
                      (u) =>
                        (u.Label || "").toLowerCase().includes(colFilterVal) ||
                        (u.NamaFakultasUnit || "").toLowerCase().includes(colFilterVal)
                    );
                  } else if (globalSearchVal) {
                    const matched = pUnits.filter(
                      (u) =>
                        (u.Label || "").toLowerCase().includes(globalSearchVal) ||
                        (u.NamaFakultasUnit || "").toLowerCase().includes(globalSearchVal)
                    );
                    if (matched.length > 0) {
                      displayUnits = matched;
                    }
                  }

                  if (displayUnits.length === 0) {
                    return (
                      <span className="text-xs text-gray-400 italic">
                        Tidak ada unit yang sesuai pencarian
                      </span>
                    );
                  }

                  return (
                    <div className="flex flex-wrap items-center gap-1.5 py-1 max-w-sm">
                      {displayUnits.map((u, idx) => (
                        <span
                          key={u.UUID || u.Id || idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200"
                          title={`${u.Label || u.NamaFakultasUnit}${u.Status ? ` • Status: ${u.Status}` : ""}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>{u.Label || u.NamaFakultasUnit}</span>
                        </span>
                      ))}
                    </div>
                  );
                },
              },
            ]}
            renderAction={({ row, close }) => (
              <div className="flex flex-col gap-0.5">
                {showDeleted ? (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer text-left group"
                    onClick={() => {
                      handleRestore(row);
                      close();
                    }}
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Pulihkan Mata Program</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition-all cursor-pointer text-left group"
                      onClick={() => {
                        navigate(`/mata_programv3/${row.UUID || row.uuid}/edit`);
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
                        setSelectedRow(row);
                        setConfirmDelete(true);
                        close();
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                      <span>Hapus</span>
                    </button>
                  </>
                )}
              </div>
            )}
          />
        </div>

        <ConfirmDeleteDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      </div>
    </>
  );
}
