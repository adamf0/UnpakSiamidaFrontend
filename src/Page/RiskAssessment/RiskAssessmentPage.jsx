import React, { useRef, useState, useEffect, useMemo } from "react";
import RemoteTable from "@/Components/RemoteTable";
import RiskAssessmentFormModal from "./RiskAssessmentFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import { useAuth } from "@/Providers/AuthProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import Tooltip from "@/Components/Tooltip";
import { isEmpty } from "@/Common/Utils";
import {
  Plus,
  Pencil,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  Flame,
  AlertOctagon,
  CheckCircle2,
  Building2,
  Calendar,
  Activity,
  Layers,
  FileSpreadsheet,
  RotateCcw,
  Skull,
} from "lucide-react";

const RiskAssessmentPage = () => {
  const tableRef = useRef(null);
  const { addToast } = useToast();
  const { getValidToken, user } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  const isAdmin = level === "admin" || user?.level === "admin";

  // Filter States
  const [selectedTahun, setSelectedTahun] = useState("");
  const [selectedTahunObj, setSelectedTahunObj] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState("");
  const [selectedFakultasObj, setSelectedFakultasObj] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedProgramObj, setSelectedProgramObj] = useState(null);

  // Metadata Lists (from database)
  const [tahunList, setTahunList] = useState([]);
  const [fakultasList, setFakultasList] = useState([]);
  const [programList, setProgramList] = useState([]);
  const [riskLevels, setRiskLevels] = useState([]);
  const [userUnitData, setUserUnitData] = useState(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch Options from Database
  useEffect(() => {
    const fetchMetadata = async () => {
      const token = getValidToken();
      if (isEmpty(token)) return;

      try {
        // 1. Fetch Master Tahun
        const resTahun = await fetch("http://localhost:3000/tahunprokers?mode=all", {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (resTahun.ok) {
          const jsonTahun = await resTahun.json();
          setTahunList(Array.isArray(jsonTahun) ? jsonTahun : []);
        }

        // 2. Fetch Risk Master Options (Levels, Criteria, Programs)
        const resRisk = await fetch("http://localhost:3000/risk_options", {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (resRisk.ok) {
          const jsonRisk = await resRisk.json();
          if (Array.isArray(jsonRisk.levels)) {
            setRiskLevels(jsonRisk.levels);
          }
          if (Array.isArray(jsonRisk.programs)) {
            setProgramList(jsonRisk.programs);
          }
        }

        // 3. Fetch Fakultas / Unit
        const resFu = await fetch("http://localhost:3000/fakultasunits?mode=all", {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (resFu.ok) {
          const jsonFu = await resFu.json();
          const list = Array.isArray(jsonFu) ? jsonFu : [];
          setFakultasList(list);

          // Cari unit milik akun auditee
          if (user?.fakultas_unit) {
            const myUnit = list.find(
              (u) =>
                u.UUID === user.fakultas_unit ||
                String(u.ID) === String(user.fakultas_unit)
            );
            if (myUnit) {
              setUserUnitData({
                id: myUnit.UUID,
                UUID: myUnit.UUID,
                rawId: myUnit.ID,
                nama: `${myUnit.Nama || ""}${
                  myUnit.Jenjang ? ` (${myUnit.Jenjang})` : ""
                }`.trim(),
              });
            }
          }
        }
      } catch (err) {
        console.error("Gagal mengambil master data filter risiko:", err);
      }
    };

    fetchMetadata();
  }, [getValidToken, user?.fakultas_unit]);

  // Mapped Options for SearchSelect Filters
  const tahunOptions = useMemo(() => {
    return (tahunList || []).map((t) => ({
      id: String(t.Tahun),
      UUID: t.UUID,
      nama: String(t.Tahun),
      ...t,
    }));
  }, [tahunList]);

  const fakultasOptions = useMemo(() => {
    return (fakultasList || []).map((fu) => ({
      id: fu.UUID,
      UUID: fu.UUID,
      rawId: fu.ID,
      nama: `${fu.Nama || ""}${fu.Jenjang ? ` (${fu.Jenjang})` : ""}`.trim(),
      ...fu,
    }));
  }, [fakultasList]);

  const programOptions = useMemo(() => {
    let list = programList || [];
    if (selectedTahun) {
      const filteredByYear = list.filter(
        (p) => String(p.tahun || "").trim() === String(selectedTahun).trim()
      );
      if (filteredByYear.length > 0) {
        list = filteredByYear;
      }
    }
    if (selectedFakultas) {
      const fuObj = fakultasOptions.find((f) => f.UUID === selectedFakultas);
      const fuId = fuObj?.rawId || fuObj?.ID;
      const hasUnit = list.some((p) => p.id_fakultas_unit);
      if (hasUnit && fuId) {
        const filteredByUnit = list.filter(
          (p) => !p.id_fakultas_unit || String(p.id_fakultas_unit) === String(fuId)
        );
        if (filteredByUnit.length > 0) {
          list = filteredByUnit;
        }
      }
    }

    return list.map((p) => {
      const thn = p.tahun ? String(p.tahun) : "";
      const mpName = p.mata_program || "";
      const label = thn ? `[${thn}] ${mpName}` : mpName;
      return {
        id: String(p.id),
        rawId: p.id,
        UUID: p.uuid,
        nama: label,
        mata_program: mpName,
        tahun: thn,
        ...p,
      };
    });
  }, [programList, selectedTahun, selectedFakultas, fakultasOptions]);

  // Construct Dynamic RemoteTable Endpoint
  const tableEndpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedTahun && selectedTahun !== "all") {
      params.append("filter_tahun", selectedTahun);
    }
    if (selectedLevel && selectedLevel !== "all") {
      params.append("filter_level_risiko", selectedLevel);
    }
    if (selectedProgram && selectedProgram !== "all") {
      params.append("filter_program", selectedProgram);
    }

    if (isAdmin) {
      if (selectedFakultas && selectedFakultas !== "all") {
        params.append("filter_fakultas_unit", selectedFakultas);
      }
    } else {
      // Auditee: mutlak terkunci ke unit kerja sendiri
      if (user?.fakultas_unit) {
        params.append("filter_fakultas_unit", String(user.fakultas_unit));
      }
    }

    const qs = params.toString();
    return `http://localhost:3000/risk_assessments${qs ? `?${qs}` : ""}`;
  }, [selectedTahun, selectedLevel, selectedProgram, selectedFakultas, isAdmin, user?.fakultas_unit]);

  const openNew = () => {
    setModalMode("new");
    setSelectedRow(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setModalMode("edit");
    setSelectedRow(row);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    const token = getValidToken();
    if (isEmpty(token) || !selectedRow?.UUID) return;

    try {
      const res = await fetch(`http://localhost:3000/risk_assessment/${selectedRow.UUID}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        addToast("success", "Berhasil menghapus analisis risiko");
      } else {
        addToast(
          "error",
          data?.message || data?.Message || data?.error || "Gagal menghapus data"
        );
      }
    } catch (err) {
      addToast(
        "error",
        `Layanan tidak dapat dihubungi (${err?.message || "Network Error"})`
      );
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

  // Helper render Level Badge dari DB risk_levels
  const renderLevelBadge = (levelCode, levelLabel) => {
    const matched = riskLevels.find(
      (l) => l.kode === levelCode || l.nama_level === levelCode || l.nama_level === levelLabel
    );
    const kode = matched?.kode || levelCode || "-";
    const label = matched?.nama_level || levelLabel || (kode === "T" ? "Tinggi" : kode === "M" ? "Menengah" : "Rendah");

    let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";
    let Icon = AlertTriangle;

    if (kode === "T" || label.toLowerCase().includes("tinggi")) {
      badgeClass = "bg-rose-100 text-rose-800 border-rose-300 ring-rose-500";
      Icon = Flame;
    } else if (kode === "M" || label.toLowerCase().includes("menengah") || label.toLowerCase().includes("sedang")) {
      badgeClass = "bg-amber-100 text-amber-800 border-amber-300 ring-amber-500";
      Icon = AlertTriangle;
    } else if (kode === "R" || label.toLowerCase().includes("rendah")) {
      badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-500";
      Icon = CheckCircle2;
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{kode} - {label}</span>
      </span>
    );
  };

  // Columns definition for RemoteTable matching FORM EXCEL sheet ANALISIS RISIKO
  const listColumns = [
    {
      key: "Tahun",
      label: "Tahun",
      width: "80px",
      renderKey: (r) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
          {r.Tahun || "-"}
        </span>
      ),
    },
    {
      key: "program",
      label: "Program Kerja",
      minWidth: "220px",
      renderKey: (r) => (
        <div className="space-y-1">
          <div className="text-xs font-bold text-gray-900 leading-snug">
            {r.MataProgram || <span className="text-gray-400 italic">Program Kerja Terdaftar</span>}
          </div>
          {r.NamaFakultasUnit && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="line-clamp-1">{r.NamaFakultasUnit}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "isu_internal_eksternal",
      label: "Internal / External Issue",
      minWidth: "220px",
      searchable: true,
      renderKey: (r) => (
        <div className="text-xs text-gray-700 leading-relaxed line-clamp-3">
          {r.IsuInternalEksternal || r.Penyebab || <span className="text-gray-400 italic">-</span>}
        </div>
      ),
    },
    {
      key: "deskripsi_risiko",
      label: "Risiko (Potensi Risiko)",
      minWidth: "220px",
      searchable: true,
      renderKey: (r) => (
        <div className="text-xs text-gray-900 font-medium leading-relaxed line-clamp-3">
          {r.DeskripsiRisiko || r.PernyataanRisiko || <span className="text-gray-400 italic">-</span>}
        </div>
      ),
    },
    {
      key: "matriks_awal",
      label: "Nilai Risiko Awal (K × D = T)",
      width: "140px",
      minWidth: "140px",
      renderKey: (r) => {
        const k = r.KemungkinanAwal ?? r.Kemungkinan ?? "-";
        const d = r.DampakAwal ?? r.Keparahan ?? "-";
        const t = r.TotalSkorAwal ?? (typeof k === "number" && typeof d === "number" ? k * d : "-");
        return (
          <div className="text-xs space-y-0.5 bg-purple-50/50 p-2 rounded-lg border border-purple-100">
            <div className="text-gray-600 flex items-center justify-between text-[11px]">
              <span>K: <b>{k}</b></span>
              <span>D: <b>{d}</b></span>
            </div>
            <div className="text-purple-900 flex items-center justify-between font-bold pt-1 border-t border-purple-200">
              <span>Total:</span>
              <span className="text-sm font-black text-purple-700">{t}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "tingkat_risiko_awal",
      label: "Tingkat Risiko Awal",
      width: "150px",
      minWidth: "150px",
      renderKey: (r) => renderLevelBadge(r.TingkatRisikoAwal || r.LevelRisiko, r.NamaTingkatAwal),
    },
    {
      key: "tindakan_mitigasi",
      label: "Tindakan Untuk Mengatasi Risiko",
      minWidth: "240px",
      searchable: true,
      renderKey: (r) => (
        <div className="text-xs text-gray-800 leading-relaxed line-clamp-3 whitespace-pre-line">
          {r.TindakanMitigasi || r.RencanaMitigasi || <span className="text-gray-400 italic">-</span>}
        </div>
      ),
    },
    {
      key: "peluang",
      label: "Peluang (Opportunity)",
      minWidth: "180px",
      renderKey: (r) => (
        <div className="text-xs text-emerald-800 leading-relaxed line-clamp-2">
          {r.Peluang || <span className="text-gray-400 italic">-</span>}
        </div>
      ),
    },
    {
      key: "kenyataan_residu",
      label: "Kenyataan Residu & RTL",
      minWidth: "200px",
      renderKey: (r) => (
        <div className="text-xs text-gray-700 leading-relaxed line-clamp-2">
          {r.KenyataanResidu || <span className="text-gray-400 italic">-</span>}
        </div>
      ),
    },
    {
      key: "matriks_residu",
      label: "Nilai Residu (K × D = T)",
      width: "140px",
      minWidth: "140px",
      renderKey: (r) => {
        if (!r.KemungkinanResidu && !r.DampakResidu) {
          return <span className="text-xs text-gray-400 italic">-</span>;
        }
        const k = r.KemungkinanResidu ?? "-";
        const d = r.DampakResidu ?? "-";
        const t = r.TotalSkorResidu ?? (typeof k === "number" && typeof d === "number" ? k * d : "-");
        return (
          <div className="text-xs space-y-0.5 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
            <div className="text-gray-600 flex items-center justify-between text-[11px]">
              <span>K: <b>{k}</b></span>
              <span>D: <b>{d}</b></span>
            </div>
            <div className="text-amber-900 flex items-center justify-between font-bold pt-1 border-t border-amber-200">
              <span>Total:</span>
              <span className="text-sm font-black text-amber-700">{t}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "tingkat_risiko_residu",
      label: "Tingkat Residu",
      width: "150px",
      minWidth: "150px",
      renderKey: (r) => {
        if (!r.TingkatRisikoResidu) {
          return <span className="text-xs text-gray-400 italic">-</span>;
        }
        return renderLevelBadge(r.TingkatRisikoResidu, r.NamaTingkatResidu);
      },
    },
    {
      key: "rencana_tindak_lanjut",
      label: "Tindak Lanjut (Follow-Up)",
      minWidth: "180px",
      renderKey: (r) => (
        <div className="text-xs text-gray-700 leading-relaxed line-clamp-2">
          {r.RencanaTindakLanjut || <span className="text-gray-400 italic">-</span>}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Aksi",
      width: "100px",
      renderKey: (r) => (
        <div className="flex items-center gap-1">
          <Tooltip title="Edit Analisis Risiko">
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip title="Hapus Analisis Risiko">
            <button
              type="button"
              onClick={() => {
                setSelectedRow(r);
                setConfirmDelete(true);
              }}
              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

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
        {/* Page Header */}
        <PageHeader
          title="Analisis Risiko Program Kerja"
          subtitle={
            isAdmin
              ? "Tabel Analisis Risiko, Residu dan Rencana Tindak Lanjut Proker (Data Seluruh Fakultas & Unit)"
              : `Tabel Analisis Risiko, Residu dan Rencana Tindak Lanjut Proker (${
                  userUnitData?.nama || "Unit Kerja Terdaftar"
                })`
          }
          icon={FileSpreadsheet}
          iconColor="text-purple-600"
          actions={
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Analisis Risiko</span>
            </button>
          }
        />

        {/* Section Filter Atas */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider shrink-0">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Filter Kategori & Indikator</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
            {/* Filter Tahun */}
            <div className="w-44 min-w-[140px]">
              <SearchSelect
                icon={Calendar}
                placeholder="Semua Tahun"
                options={tahunOptions}
                value={selectedTahunObj}
                onChange={(item) => {
                  setSelectedTahunObj(item);
                  setSelectedTahun(item ? String(item.Tahun || item.nama || item.id) : "");
                }}
                className="!py-1.5 !text-xs !rounded-xl !bg-gray-50/80 hover:!bg-white focus:!bg-white !border-gray-200"
              />
            </div>

            {/* Filter Fakultas / Unit (Khusus Admin) */}
            {isAdmin && (
              <div className="w-56 min-w-[180px]">
                <SearchSelect
                  icon={Building2}
                  placeholder="Semua Fakultas/Unit"
                  options={fakultasOptions}
                  value={selectedFakultasObj}
                  onChange={(item) => {
                    setSelectedFakultasObj(item);
                    setSelectedFakultas(item ? String(item.UUID || item.id) : "");
                  }}
                  className="!py-1.5 !text-xs !rounded-xl !bg-gray-50/80 hover:!bg-white focus:!bg-white !border-gray-200"
                />
              </div>
            )}

            {/* Filter Program Kerja */}
            <div className="w-72 min-w-[220px]">
              <SearchSelect
                icon={FileSpreadsheet}
                placeholder="Semua Program Kerja"
                options={programOptions}
                value={selectedProgramObj}
                onChange={(item) => {
                  setSelectedProgramObj(item);
                  setSelectedProgram(item ? String(item.id || item.rawId) : "");
                  if (item?.tahun && !selectedTahun) {
                    const matchedT = tahunOptions.find(
                      (t) => String(t.Tahun || t.nama) === String(item.tahun)
                    );
                    if (matchedT) {
                      setSelectedTahunObj(matchedT);
                      setSelectedTahun(matchedT.Tahun || matchedT.nama);
                    }
                  }
                }}
                className="!py-1.5 !text-xs !rounded-xl !bg-gray-50/80 hover:!bg-white focus:!bg-white !border-gray-200"
              />
            </div>

            {/* Reset Filter Button */}
            {(selectedTahun || selectedFakultas || selectedProgram || selectedLevel) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTahun("");
                  setSelectedTahunObj(null);
                  setSelectedFakultas("");
                  setSelectedFakultasObj(null);
                  setSelectedProgram("");
                  setSelectedProgramObj(null);
                  setSelectedLevel("");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold rounded-lg transition cursor-pointer"
                title="Reset semua filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Level Risiko Quick Filter Cards (Dynamic dari database risk_levels: R, M, T) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {riskLevels.map((lvl) => {
            const isSelected = selectedLevel === lvl.kode || selectedLevel === lvl.nama_level;
            let Icon = Skull;
            let iconColor = "text-black";
            let cardBg = "bg-gradient-to-br from-amber-500/10 via-amber-50 to-white border-amber-200 text-amber-900";
            let ringColor = "ring-amber-500";

            if (lvl.kode === "T" || lvl.nama_level?.toLowerCase().includes("tinggi")) {
              Icon = Flame;
              iconColor = "text-rose-600";
              cardBg = "bg-gradient-to-br from-rose-500/10 via-rose-50 to-white border-rose-200 text-rose-900";
              ringColor = "ring-rose-600";
            } else if (lvl.kode === "M" || lvl.nama_level?.toLowerCase().includes("menengah") || lvl.nama_level?.toLowerCase().includes("sedang")) {
              Icon = AlertTriangle;
              iconColor = "text-amber-600";
              cardBg = "bg-gradient-to-br from-amber-500/10 via-amber-50 to-white border-amber-200 text-amber-900";
              ringColor = "ring-amber-500";
            } else if (lvl.kode === "R" || lvl.nama_level?.toLowerCase().includes("rendah")) {
              Icon = CheckCircle2;
              iconColor = "text-emerald-600";
              cardBg = "bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white border-emerald-200 text-emerald-900";
              ringColor = "ring-emerald-600";
            }

            return (
              <button
                key={lvl.id || lvl.kode}
                type="button"
                onClick={() =>
                  setSelectedLevel((prev) => (prev === lvl.kode ? "" : lvl.kode))
                }
                className={`p-4 rounded-xl border text-left transition relative cursor-pointer ${
                  isSelected
                    ? `${cardBg} ring-2 ${ringColor} shadow-md`
                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected ? "bg-white/80 shadow-xs" : "bg-gray-100"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/70 border border-gray-200 font-mono">
                    Level {lvl.kode}
                  </span>
                </div>
                <div className="font-bold text-sm text-gray-900">{lvl.nama_level}</div>
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{lvl.keterangan}</div>
              </button>
            );
          })}
        </div>

        {/* Remote Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            ref={tableRef}
            endpoint={tableEndpoint}
            listcolumns={listColumns}
            token={getValidToken()}
            mode="paging"
            onError={(err) => {
              console.error("TABLE RISK ERROR:", err);
            }}
          />
        </div>
      </div>

      {/* Form Modal */}
      <RiskAssessmentFormModal
        open={modalOpen}
        mode={modalMode}
        data={selectedRow}
        onClose={() => setModalOpen(false)}
        onSuccess={() => tableRef.current?.reload?.({ resetPage: false })}
        isAdmin={isAdmin}
        userUnit={userUnitData}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Hapus Analisis Risiko?"
        message={`Apakah Anda yakin ingin menghapus analisis risiko untuk program "${
          selectedRow?.MataProgram || selectedRow?.PernyataanRisiko || "ini"
        }"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </>
  );
};

export default RiskAssessmentPage;
