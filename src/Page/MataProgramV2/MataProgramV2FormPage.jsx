import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import PageHeader from "@/Components/PageHeader";
import SearchSelect from "@/Components/SearchSelect";
import TextInput from "@/Components/TextInput";
import {
  Layers,
  ArrowLeft,
  CheckSquare,
  Square,
  Sparkles,
  CheckCircle2,
  Building2,
  BookOpen,
} from "lucide-react";
import { apiClient } from "@/Common/api";
import { fetchFakultasUnits, formatFetchError } from "@/Common/Utils";

const getTargetKey = (t) => {
  if (!t) return "";
  if (typeof t === "string" || typeof t === "number") return String(t);
  return String(t.rawId ?? t.id_numeric ?? t.ID ?? t.id ?? t.UUID ?? "");
};

const groupDataAdapter = (rows = []) => {
  const map = {};
  for (const r of rows) {
    const rawType = String(r.type || r.Type || "unit").toLowerCase().trim();
    const jenjang = String(r.jenjang || r.Jenjang || "").toUpperCase().trim();
    const key = jenjang ? `${rawType}#${jenjang}` : `${rawType}#all`;

    if (!map[key]) {
      map[key] = {
        Key: key,
        Type: rawType,
        Jenjang: jenjang,
        Targets: [],
      };
    }
    const resolvedId = getTargetKey(r);
    map[key].Targets.push({
      ID: resolvedId,
      UUID: r.UUID || r.uuid,
      Nama: r.nama || r.label || r.pureName || r.Nama,
      Badge: r.badge,
      BadgeClass: r.badgeClass,
      raw: r,
    });
  }
  return Object.values(map);
};

export default function MataProgramV2FormPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
    positionYear,
  } = useContent();

  const [tahunOptions, setTahunOptions] = useState([]);
  const [loadingTahun, setLoadingTahun] = useState(false);
  const [selectedTahun, setSelectedTahun] = useState(null);

  const [namaProgram, setNamaProgram] = useState("");
  const [fakultasUnits, setFakultasUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Map of selected unit IDs / UUIDs: { [unitId]: true }
  const [selectedTargets, setSelectedTargets] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Filter search stakeholder text
  const [filterUnitText, setFilterUnitText] = useState("");

  const fetchTahunOptions = async () => {
    setLoadingTahun(true);
    try {
      const res = await apiClient.get("/tahunprokers?mode=all");
      const json = res.data;
      const mapped = (Array.isArray(json) ? json : []).map((item) => ({
        id: item.UUID,
        UUID: item.UUID,
        nama: item.Tahun,
        Tahun: item.Tahun,
        ...item,
      }));
      setTahunOptions(mapped);

      // Preselect Tahun
      const targetYear = positionYear && positionYear !== "all" ? String(positionYear) : "2027";
      const found = mapped.find((t) => String(t.Tahun || t.nama) === targetYear);
      if (found) {
        setSelectedTahun(found);
      } else if (mapped.length > 0) {
        setSelectedTahun(mapped[0]);
      }
    } catch (err) {
      console.error("Fetch master tahun gagal:", err);
      addToast("error", formatFetchError(err, "Gagal memuat master tahun"));
    } finally {
      setLoadingTahun(false);
    }
  };

  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      const opts = await fetchFakultasUnits();
      setFakultasUnits(opts || []);
    } catch (err) {
      console.error("Fetch master unit gagal:", err);
      addToast("error", formatFetchError(err, "Gagal memuat daftar fakultas / unit"));
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    fetchTahunOptions();
    fetchUnits();
  }, []);

  const groups = useMemo(() => {
    return groupDataAdapter(fakultasUnits);
  }, [fakultasUnits]);

  // Toggle single target
  const handleToggleTarget = (target) => {
    const key = getTargetKey(target);
    if (!key) return;
    setSelectedTargets((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  };

  // Toggle all in group
  const handleToggleGroup = (group) => {
    const allSelected =
      group.Targets.length > 0 &&
      group.Targets.every((t) => Boolean(selectedTargets[getTargetKey(t)]));

    setSelectedTargets((prev) => {
      const next = { ...prev };
      group.Targets.forEach((t) => {
        const key = getTargetKey(t);
        if (!key) return;
        if (allSelected) {
          delete next[key];
        } else {
          next[key] = true;
        }
      });
      return next;
    });
  };

  // Select all everywhere
  const handleSelectAll = () => {
    const next = {};
    fakultasUnits.forEach((u) => {
      const key = getTargetKey(u);
      if (key) {
        next[key] = true;
      }
    });
    setSelectedTargets(next);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedTargets({});
  };

  const totalSelectedCount = useMemo(() => {
    return Object.keys(selectedTargets).length;
  }, [selectedTargets]);

  const handleSubmit = async (e) => {
    e?.preventDefault();

    const resolvedTahun = selectedTahun?.Tahun || selectedTahun?.nama || selectedTahun?.id || "";
    if (!resolvedTahun) {
      addToast("warning", "Tahun Periode wajib dipilih");
      return;
    }

    if (!namaProgram.trim()) {
      addToast("warning", "Nama Program Kerja wajib diisi");
      return;
    }

    const targetIds = Object.keys(selectedTargets);
    if (targetIds.length === 0) {
      addToast("warning", "Pilih minimal satu Fakultas / Prodi / Unit sasaran");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("mata_program", namaProgram.trim());
      fd.append("tahun", String(resolvedTahun));

      // Append each target
      targetIds.forEach((tId) => {
        fd.append("targets[]", String(tId));
      });

      const res = await apiClient.post("/mataprogramv2", fd);
      addToast(
        "success",
        res?.data?.message || `Berhasil menyimpan ${targetIds.length} target Mata Program`
      );
      navigate("/mata_programv3");
    } catch (err) {
      console.error("Gagal simpan mata program v2:", err);
      addToast(
        "error",
        err?.message || "Gagal menyimpan mata program v2 ke server"
      );
    } finally {
      setSubmitting(false);
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

      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-5">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/mata_programv3")}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 rounded-xl transition cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <PageHeader
              icon={Layers}
              title="Tambah Mata Program"
              subtitle="Kelola distribusi master mata program kerja ke berbagai Fakultas, Prodi, dan Unit"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => navigate("/mata_programv3")}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer shadow-2xs"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? "Menyimpan..." : `Simpan (${totalSelectedCount} Target)`}</span>
            </button>
          </div>
        </div>

        {/* Master Input Card: Tahun & Nama Program Kerja */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider pb-3 border-b border-gray-100">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>1. Identitas Mata Program Kerja</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-4">
              <SearchSelect
                label="Tahun Periode"
                required
                options={tahunOptions}
                placeholder="Pilih Tahun"
                loading={loadingTahun}
                value={selectedTahun}
                onChange={(item) => setSelectedTahun(item)}
              />
            </div>

            <div className="md:col-span-8">
              <TextInput
                label="Nama Program Kerja"
                required
                placeholder="Contoh: Maintenance Infrastruktur Server & Network / Pengembangan Sistem Baru"
                value={namaProgram}
                onChange={(e) => setNamaProgram(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stakeholder Selection Groups Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>2. Penugasan Fakultas / Prodi / Unit Sasaran</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                {totalSelectedCount} Terpilih
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Cari stakeholder..."
                value={filterUnitText}
                onChange={(e) => setFilterUnitText(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 w-44"
              />
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition cursor-pointer"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Batal Semua
              </button>
            </div>
          </div>

          {loadingUnits ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Memuat master stakeholder...
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const groupTitle = group.Jenjang
                  ? `${group.Type.toUpperCase()} - ${group.Jenjang}`
                  : group.Type.toUpperCase();

                const filteredTargets = group.Targets.filter((t) => {
                  if (!filterUnitText.trim()) return true;
                  return t.Nama.toLowerCase().includes(filterUnitText.toLowerCase());
                });

                if (filteredTargets.length === 0) return null;

                const allInGroupSelected =
                  group.Targets.length > 0 &&
                  group.Targets.every((t) => Boolean(selectedTargets[getTargetKey(t)]));
                const someInGroupSelected = group.Targets.some((t) =>
                  Boolean(selectedTargets[getTargetKey(t)])
                );

                return (
                  <div
                    key={group.Key}
                    className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                  >
                    {/* Group Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border-b border-gray-200">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                        <h3 className="text-xs font-bold text-gray-800 tracking-wide uppercase">
                          {groupTitle}
                        </h3>
                        <span className="text-[11px] font-semibold text-gray-500">
                          ({filteredTargets.length} Stakeholder)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleGroup(group)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          allInGroupSelected
                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{allInGroupSelected ? "Batal Kelompok" : "Pilih Kelompok"}</span>
                      </button>
                    </div>

                    {/* Stakeholder Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100/60 text-gray-600 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2.5 w-12 text-center">Pilih</th>
                            <th className="px-4 py-2.5">Stakeholder</th>
                            <th className="px-4 py-2.5 w-36 text-center">Kategori</th>
                            <th className="px-4 py-2.5 w-32 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredTargets.map((target) => {
                            const key = getTargetKey(target);
                            const isSelected = Boolean(selectedTargets[key]);

                            return (
                              <tr
                                key={key}
                                onClick={() => handleToggleTarget(key)}
                                className={`transition-colors cursor-pointer hover:bg-purple-50/40 ${
                                  isSelected ? "bg-purple-50/20" : ""
                                }`}
                              >
                                <td
                                  className="px-4 py-2.5 text-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleTarget(key)}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                                  />
                                </td>
                                <td className="px-4 py-2.5 font-medium text-gray-800">
                                  {target.Nama}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      target.BadgeClass || "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {target.Badge || group.Type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {isSelected ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Ditugaskan
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 font-medium">
                                      Belum dipilih
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-sm p-4 rounded-2xl border border-gray-200 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-gray-700 font-medium">
              Total Target Terpilih: <strong className="text-purple-700 font-bold">{totalSelectedCount}</strong> Fakultas / Prodi / Unit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/mata_programv3")}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? "Menyimpan..." : "Simpan Mata Program"}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
