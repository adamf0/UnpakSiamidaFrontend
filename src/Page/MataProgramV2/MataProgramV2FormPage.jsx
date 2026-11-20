import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  CheckCircle2,
  BookOpen,
  LayoutTemplate,
  Search,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { apiClient } from "@/Common/api";
import { formatFetchError } from "@/Common/Utils";
import { templateRenstraAdapter } from "@/Page/TemplateRenstra/TemplateRenstraPage";

export default function MataProgramV2FormPage() {
  const navigate = useNavigate();
  const { uuid } = useParams();
  const isEdit = Boolean(uuid);

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
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Raw and adapted template renstra
  const [rawTemplates, setRawTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Selected template IDs map: { [templateId]: true }
  const [selectedTemplateIds, setSelectedTemplateIds] = useState({});

  // Filter & expand states
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndikators, setExpandedIndikators] = useState({});

  const [submitting, setSubmitting] = useState(false);

  const curRole = String(
    level || localStorage.getItem("activeLevel") || user?.level || ""
  ).toLowerCase().trim();

  const isAdmin =
    curRole === "admin" ||
    user?.level === "admin" ||
    user?.Level === "admin";

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  // Fetch master tahun options
  const fetchTahunOptions = async () => {
    setLoadingTahun(true);
    try {
      const res = await apiClient.get("/tahunprokers?mode=all");
      const json = res.data;
      const mapped = (Array.isArray(json) ? json : []).map((item) => ({
        id: item.UUID,
        UUID: item.UUID,
        nama: String(item.Tahun),
        Tahun: String(item.Tahun),
        ...item,
      }));
      setTahunOptions(mapped);
      return mapped;
    } catch (err) {
      console.error("Fetch master tahun gagal:", err);
      addToast("error", formatFetchError(err, "Gagal memuat master tahun"));
      return [];
    } finally {
      setLoadingTahun(false);
    }
  };

  // Fetch template renstra for selected year
  const fetchTemplatesForYear = async (yearStr) => {
    if (!yearStr) {
      setRawTemplates([]);
      return;
    }
    setLoadingTemplates(true);
    try {
      const res = await apiClient.get(`/templaterenstras?mode=all&tahun=${encodeURIComponent(yearStr)}`);
      const body = res?.data ?? res;
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setRawTemplates(list);
    } catch (err) {
      console.error("Fetch template renstra gagal:", err);
      addToast("error", formatFetchError(err, "Gagal memuat template renstra"));
      setRawTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Initial load
  useEffect(() => {
    let active = true;

    const initData = async () => {
      const years = await fetchTahunOptions();
      if (!active) return;

      if (isEdit && uuid) {
        setLoadingDetail(true);
        try {
          const detailRes = await apiClient.get(`/mataprogramv2/${uuid}`);
          const detail = detailRes?.data ?? detailRes;

          if (!active) return;

          setNamaProgram(detail.MataProgram || detail.nama || "");

          const targetYear = String(detail.Tahun || "");
          const foundTahun = years.find((t) => String(t.Tahun) === targetYear);
          if (foundTahun) {
            setSelectedTahun(foundTahun);
          } else if (targetYear) {
            setSelectedTahun({ id: targetYear, nama: targetYear, Tahun: targetYear });
          }

          // Pre-select template renstra IDs
          if (Array.isArray(detail.TemplateRenstraIDs)) {
            const preMap = {};
            detail.TemplateRenstraIDs.forEach((id) => {
              if (id) preMap[String(id)] = true;
            });
            setSelectedTemplateIds(preMap);
          }

          if (targetYear) {
            await fetchTemplatesForYear(targetYear);
          }
        } catch (err) {
          console.error("Gagal memuat detail mata program:", err);
          addToast("error", formatFetchError(err, "Gagal memuat detail mata program"));
        } finally {
          if (active) setLoadingDetail(false);
        }
      } else {
        // Create mode: preselect default year
        const targetYear = positionYear && positionYear !== "all" ? String(positionYear) : "2027";
        const found = years.find((t) => String(t.Tahun || t.nama) === targetYear) || years[0];
        if (found) {
          setSelectedTahun(found);
          await fetchTemplatesForYear(found.Tahun || found.nama);
        }
      }
    };

    initData();
    return () => {
      active = false;
    };
  }, [isEdit, uuid, positionYear]);

  // Handle year change by user
  const handleYearChange = (newTahun) => {
    setSelectedTahun(newTahun);
    const yr = newTahun?.Tahun || newTahun?.nama || "";
    if (yr) {
      fetchTemplatesForYear(yr);
      // Reset selected templates if user changes year in create mode
      if (!isEdit) {
        setSelectedTemplateIds({});
      }
    }
  };

  // Group raw template rows by Indikator
  const adaptedIndicators = useMemo(() => {
    return templateRenstraAdapter(rawTemplates);
  }, [rawTemplates]);

  // Filter adapted indicators by search query
  const filteredIndicators = useMemo(() => {
    if (!searchQuery.trim()) return adaptedIndicators;
    const q = searchQuery.toLowerCase().trim();
    return adaptedIndicators.filter((item) => {
      const matchIndikator = (item.Indikator || "").toLowerCase().includes(q);
      const matchStandar = (item.StandarRenstra || "").toLowerCase().includes(q);
      const matchTarget = (item.Targets || []).some(
        (t) =>
          (t.FakultasUnit || "").toLowerCase().includes(q) ||
          (t.Kategori || "").toLowerCase().includes(q)
      );
      return matchIndikator || matchStandar || matchTarget;
    });
  }, [adaptedIndicators, searchQuery]);

  // Toggle all targets under an indicator
  const handleToggleIndikator = (item) => {
    const targets = Array.isArray(item.Targets) ? item.Targets : [];
    if (targets.length === 0) return;

    const allChecked = targets.every((t) => Boolean(selectedTemplateIds[String(t.ID)]));

    setSelectedTemplateIds((prev) => {
      const next = { ...prev };
      targets.forEach((t) => {
        const idStr = String(t.ID);
        if (allChecked) {
          delete next[idStr];
        } else {
          next[idStr] = true;
        }
      });
      return next;
    });
  };

  // Toggle single target item
  const handleToggleSingleTarget = (targetId) => {
    const idStr = String(targetId);
    setSelectedTemplateIds((prev) => {
      const next = { ...prev };
      if (next[idStr]) {
        delete next[idStr];
      } else {
        next[idStr] = true;
      }
      return next;
    });
  };

  // Select all visible targets
  const handleSelectAllVisible = () => {
    const next = { ...selectedTemplateIds };
    filteredIndicators.forEach((item) => {
      (item.Targets || []).forEach((t) => {
        next[String(t.ID)] = true;
      });
    });
    setSelectedTemplateIds(next);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedTemplateIds({});
  };

  // Toggle accordion expand
  const toggleExpand = (indId) => {
    setExpandedIndikators((prev) => ({
      ...prev,
      [indId]: !prev[indId],
    }));
  };

  const totalSelectedCount = useMemo(() => {
    return Object.keys(selectedTemplateIds).length;
  }, [selectedTemplateIds]);

  // Form submission
  const handleSubmit = async (e) => {
    e?.preventDefault();

    const resolvedTahun = selectedTahun?.Tahun || selectedTahun?.nama || "";
    if (!resolvedTahun) {
      addToast("warning", "Tahun Periode wajib dipilih");
      return;
    }

    if (!namaProgram.trim()) {
      addToast("warning", "Nama Program Kerja wajib diisi");
      return;
    }

    const selectedIds = Object.keys(selectedTemplateIds);
    if (selectedIds.length === 0) {
      addToast("warning", "Pilih minimal satu Template Renstra sasaran");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("mata_program", namaProgram.trim());
      fd.append("tahun", String(resolvedTahun));

      selectedIds.forEach((tId) => {
        fd.append("template_renstras[]", String(tId));
      });

      let res;
      if (isEdit) {
        res = await apiClient.put(`/mataprogramv2/${uuid}?scope=group`, fd);
      } else {
        res = await apiClient.post("/mataprogramv2", fd);
      }

      addToast(
        "success",
        res?.data?.message ||
          (isEdit
            ? "Berhasil memperbarui master Mata Program"
            : `Berhasil menyimpan Mata Program dengan ${selectedIds.length} target Template Renstra`)
      );
      navigate("/mata_programv3");
    } catch (err) {
      console.error("Gagal simpan mata program v2:", err);
      addToast(
        "error",
        err?.response?.data?.message || err?.message || "Gagal menyimpan mata program ke server"
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
        {/* Header Breadcrumb & Actions */}
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
              title={isEdit ? "Edit Mata Program" : "Tambah Mata Program"}
              subtitle="Kelola master mata program kerja dan hubungkan dengan Template Renstra sasaran"
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
              disabled={submitting || loadingDetail}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? "Menyimpan..."
                  : isEdit
                  ? `Simpan Perubahan (${totalSelectedCount} Template)`
                  : `Simpan (${totalSelectedCount} Template)`}
              </span>
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
                onChange={handleYearChange}
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

        {/* Template Renstra Selection Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
              <LayoutTemplate className="w-4 h-4 text-purple-600" />
              <span>2. Template Renstra Sasaran</span>
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                {totalSelectedCount} Target Terpilih
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari indikator / standar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 w-52"
                />
              </div>
              <button
                type="button"
                onClick={handleSelectAllVisible}
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

          {loadingTemplates ? (
            <div className="py-16 text-center text-xs text-gray-500">
              <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p>Memuat daftar template renstra tahun {selectedTahun?.Tahun || ""}...</p>
            </div>
          ) : filteredIndicators.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400">
              {rawTemplates.length === 0
                ? `Tidak ada data template renstra untuk tahun ${selectedTahun?.Tahun || "-"}.`
                : "Tidak ada indikator yang sesuai dengan kata kunci pencarian."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIndicators.map((item) => {
                const targets = Array.isArray(item.Targets) ? item.Targets : [];
                const indKey = `${item.IndikatorRenstraID}-${item.Tahun}`;
                const isExpanded = Boolean(expandedIndikators[indKey]);

                const checkedCount = targets.filter((t) =>
                  Boolean(selectedTemplateIds[String(t.ID)])
                ).length;
                const allChecked = targets.length > 0 && checkedCount === targets.length;
                const someChecked = checkedCount > 0 && !allChecked;

                return (
                  <div
                    key={indKey}
                    className={`border rounded-xl transition-all ${
                      allChecked
                        ? "border-purple-300 bg-purple-50/20"
                        : someChecked
                        ? "border-purple-200 bg-purple-50/10"
                        : "border-gray-200 bg-white hover:border-purple-200"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="p-3.5 flex items-start gap-3">
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleToggleIndikator(item)}
                          className="cursor-pointer text-purple-700 hover:text-purple-900 transition"
                          title={allChecked ? "Batal pilih semua sasaran" : "Pilih semua sasaran indikator ini"}
                        >
                          {allChecked ? (
                            <CheckSquare className="w-5 h-5 text-purple-700" />
                          ) : someChecked ? (
                            <MinusSquare className="w-5 h-5 text-purple-500" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                          )}
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        {item.StandarRenstra && (
                          <div className="text-[11px] font-semibold text-purple-700 mb-0.5 truncate">
                            {item.StandarRenstra}
                          </div>
                        )}
                        <h4
                          onClick={() => handleToggleIndikator(item)}
                          className="text-xs font-bold text-gray-900 leading-snug cursor-pointer hover:text-purple-700 transition"
                          title={allChecked ? "Batal pilih sasaran indikator ini" : "Pilih sasaran indikator ini"}
                        >
                          {item.Indikator}
                        </h4>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[11px] text-gray-500">
                            Sasaran:{" "}
                            <strong className="text-gray-800">
                              {checkedCount} / {targets.length} unit
                            </strong>
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleExpand(indKey)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 transition cursor-pointer"
                          >
                            <span>{isExpanded ? "Sembunyikan Sasaran" : "Lihat Sasaran Unit"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Targets Section */}
                    {isExpanded && (
                      <div className="px-4 pb-3.5 pt-1 border-t border-gray-100 bg-gray-50/60 rounded-b-xl space-y-2">
                        <div className="text-[11px] font-semibold text-gray-600">
                          Pilih unit / prodi sasaran spesifik untuk indikator ini:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {targets.map((tg) => {
                            const isTgSelected = Boolean(selectedTemplateIds[String(tg.ID)]);
                            return (
                              <label
                                key={tg.ID}
                                className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                                  isTgSelected
                                    ? "bg-purple-100/70 border-purple-300 text-purple-950 font-medium"
                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isTgSelected}
                                  onChange={() => handleToggleSingleTarget(tg.ID)}
                                  className="mt-0.5 w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold truncate" title={tg.FakultasUnit}>
                                    {tg.FakultasUnit || "Unit"}
                                  </div>
                                  <div className="text-[10px] text-gray-500 truncate">
                                    Target: {tg.Target || "-"} {tg.Satuan || ""}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
              Total Sasaran Terpilih:{" "}
              <strong className="text-purple-700 font-bold">{totalSelectedCount}</strong> Template Renstra
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
              disabled={submitting || loadingDetail}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? "Menyimpan..."
                  : isEdit
                  ? "Simpan Perubahan"
                  : "Simpan Mata Program"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
