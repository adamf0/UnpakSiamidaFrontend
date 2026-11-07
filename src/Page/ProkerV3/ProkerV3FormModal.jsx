import React, { Fragment, useEffect, useState, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
import { apiClient } from "@/Common/api";
import SearchSelect from "@/Components/SearchSelect";
import {
  X,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Target,
  User,
  Sparkles,
  Info,
  CheckCircle2,
  BookmarkCheck,
  RefreshCw,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import { BULAN_LIST, WEEKS, parseSlotArray } from "./prokerConstants";
export { BULAN_LIST, WEEKS, parseSlotArray };

export default function ProkerV3FormModal({
  open,
  mode = "create",
  initialData = null,
  unitOptions = [],
  tahunOptions = [],
  standarOptions = [],
  indikatorOptions = [],
  defaultYear,
  defaultUnit,
  onClose,
  onSuccess,
}) {
  const { getValidToken, user } = useAuth();
  const { addToast } = useToast();

  const isAdmin = user?.level === "admin";
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields - Step 1: Identitas Unit & Program Kerja
  const [noProker, setNoProker] = useState(1);
  const [namaProgram, setNamaProgram] = useState("");
  const [idFakultasUnit, setIdFakultasUnit] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [tahun, setTahun] = useState("2026");
  const [selectedTahun, setSelectedTahun] = useState(null);
  const [pic, setPic] = useState("");
  const [bebanYayasan, setBebanYayasan] = useState(false);

  // Dynamic Scopes (Standar, Indikator, Target, Output, Outcome per scope)
  const createNewScope = () => ({
    uuid: undefined,
    selectedStandar: null,
    standarSubStandar: "",
    selectedIndikator: null,
    indikatorKinerja: "",
    targetUnpak: "",
    capaianUnitLalu: "",
    targetUnit: "",
    output: "",
    outcome: "",
    loadingTargetUnpak: false,
  });

  const [scopes, setScopes] = useState([createNewScope()]);

  // Map Standar Options for SearchSelect
  const formattedStandarOptions = useMemo(() => {
    return (standarOptions || []).map((s) => ({
      ...s,
      id: s.id,
      label: s.nama,
      nama: s.nama,
    }));
  }, [standarOptions]);

  // Helper filter indikator based on given standard
  const getFilteredIndikators = (selectedStandar) => {
    let list = indikatorOptions || [];
    if (selectedStandar?.id) {
      list = list.filter((i) => i.id_master_standar === selectedStandar.id);
    }
    return list.map((i) => ({
      ...i,
      id: i.id,
      label: i.indikator,
      nama: i.indikator,
    }));
  };

  // Reset or Populate form on open
  useEffect(() => {
    if (!open) return;
    setStep(1);

    if (mode === "edit" && initialData) {
      setNoProker(initialData.NoProker || 1);
      setNamaProgram(initialData.NamaProgram || "");
      setIdFakultasUnit(initialData.IdFakultasUnit || null);
      setTahun(initialData.Tahun || "2026");
      setPic(initialData.PIC || "");
      setBebanYayasan(Boolean(initialData.BebanYayasan || initialData.beban_yayasan));

      // Match Unit Obj
      const uObj = unitOptions.find(
        (u) =>
          u.id === initialData.IdFakultasUnit ||
          u.uuid === initialData.UuidFakultasUnit
      );
      setSelectedUnit(uObj || null);

      // Match Tahun Obj
      const tObj = tahunOptions.find(
        (t) => String(t.tahun || t.Tahun) === String(initialData.Tahun)
      );
      setSelectedTahun(tObj || null);

      // Populate Scopes from initialData.Scopes or fallback to single scope
      if (initialData.Scopes && initialData.Scopes.length > 0) {
        const loadedScopes = initialData.Scopes.map((sc) => {
          const sObj = (standarOptions || []).find(
            (s) =>
              s.nama === sc.StandarSubStandar ||
              s.id === sc.IdMasterStandar
          );
          const iObj = (indikatorOptions || []).find(
            (i) =>
              i.indikator === sc.IndikatorKinerja ||
              i.id === sc.IdIndikator
          );
          return {
            uuid: sc.UUID || undefined,
            selectedStandar: sObj ? { ...sObj, label: sObj.nama, nama: sObj.nama } : null,
            standarSubStandar: sc.StandarSubStandar || "",
            selectedIndikator: iObj ? { ...iObj, label: iObj.indikator, nama: iObj.indikator } : null,
            indikatorKinerja: sc.IndikatorKinerja || "",
            targetUnpak: sc.TargetUnpak || "",
            capaianUnitLalu: sc.CapaianUnitLalu || sc.CapaianTerdahulu || "",
            targetUnit: sc.TargetUnit || "",
            output: sc.Output || "",
            outcome: sc.Outcome || "",
            loadingTargetUnpak: false,
          };
        });
        setScopes(loadedScopes);
      } else {
        const sObj = (standarOptions || []).find(
          (s) =>
            s.nama === initialData.StandarSubStandar ||
            s.id === initialData.IdMasterStandar
        );
        const iObj = (indikatorOptions || []).find(
          (i) =>
            i.indikator === initialData.IndikatorKinerja ||
            i.id === initialData.IdMasterIndikator
        );
        setScopes([
          {
            uuid: undefined,
            selectedStandar: sObj ? { ...sObj, label: sObj.nama, nama: sObj.nama } : null,
            standarSubStandar: initialData.StandarSubStandar || "",
            selectedIndikator: iObj ? { ...iObj, label: iObj.indikator, nama: iObj.indikator } : null,
            indikatorKinerja: initialData.IndikatorKinerja || "",
            targetUnpak: initialData.TargetUnpak || "",
            capaianUnitLalu: initialData.CapaianUnitLalu || "",
            targetUnit: initialData.TargetUnit || "",
            output: initialData.Output || "",
            outcome: initialData.Outcome || "",
            loadingTargetUnpak: false,
          },
        ]);
      }
    } else {
      // Create mode
      setNoProker(1);
      setNamaProgram("");
      const resolvedYear = defaultYear && defaultYear !== "all" ? String(defaultYear) : "2026";
      setTahun(resolvedYear);
      setPic(user?.nama || user?.name || "");
      setBebanYayasan(false);
      setScopes([createNewScope()]);

      // Default unit from user or defaultUnit prop
      const targetUnitValue =
        defaultUnit?.id ||
        defaultUnit?.uuid ||
        defaultUnit ||
        user?.fakultas_unit ||
        user?.id_fakultas_unit ||
        user?.FakultasUnit;
      const uObj =
        (defaultUnit && typeof defaultUnit === "object" && defaultUnit.id ? defaultUnit : null) ||
        unitOptions.find(
          (u) =>
            String(u.id) === String(targetUnitValue) ||
            String(u.uuid) === String(targetUnitValue) ||
            String(u.nama).toLowerCase() === String(targetUnitValue).toLowerCase()
        );
      setSelectedUnit(uObj || null);
      setIdFakultasUnit(uObj ? uObj.id : targetUnitValue ? Number(targetUnitValue) || targetUnitValue : null);

      const tObj = tahunOptions.find((t) => String(t.tahun || t.Tahun) === resolvedYear);
      setSelectedTahun(tObj || null);
    }
  }, [open, mode, initialData, unitOptions, tahunOptions, standarOptions, indikatorOptions, user, defaultYear, defaultUnit]);

  // Scopes management helpers
  const handleAddScope = () => {
    setScopes((prev) => [...prev, createNewScope()]);
  };

  const handleRemoveScope = (scopeIndex) => {
    if (scopes.length <= 1) return;
    setScopes((prev) => prev.filter((_, idx) => idx !== scopeIndex));
  };

  const updateScopeField = (index, field, value) => {
    setScopes((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  // Handle Standar selection for specific scope
  const handleSelectStandar = (scopeIndex, item) => {
    setScopes((prev) => {
      const next = [...prev];
      const sc = next[scopeIndex];
      if (!sc) return prev;
      const shouldResetInd =
        sc.selectedIndikator && item && sc.selectedIndikator.id_master_standar !== item.id;
      next[scopeIndex] = {
        ...sc,
        selectedStandar: item,
        standarSubStandar: item ? item.nama || item.label : "",
        selectedIndikator: shouldResetInd ? null : sc.selectedIndikator,
        indikatorKinerja: shouldResetInd ? "" : sc.indikatorKinerja,
        targetUnpak: shouldResetInd ? "" : sc.targetUnpak,
      };
      return next;
    });
  };

  // Auto-fetch Target Unpak from template_renstra for specific scope
  const fetchTargetUnpakForScope = async (scopeIndex, overrideIndikator = null) => {
    let targetInd = overrideIndikator;
    if (!targetInd) {
      targetInd = scopes[scopeIndex]?.selectedIndikator;
    }
    const currentIndikatorId = targetInd?.id;
    if (!currentIndikatorId) {
      setScopes((prev) => {
        const next = [...prev];
        if (next[scopeIndex]) next[scopeIndex] = { ...next[scopeIndex], targetUnpak: "" };
        return next;
      });
      return;
    }

    const currentTahun = selectedTahun?.tahun || selectedTahun?.Tahun || tahun || "2026";
    const currentUnitId = selectedUnit?.id || idFakultasUnit;

    setScopes((prev) => {
      const next = [...prev];
      if (next[scopeIndex]) next[scopeIndex] = { ...next[scopeIndex], loadingTargetUnpak: true };
      return next;
    });

    try {
      const params = new URLSearchParams({
        tahun: String(currentTahun),
        id_indikator: String(currentIndikatorId),
      });
      if (currentUnitId) {
        params.append("id_fakultas_unit", String(currentUnitId));
      }

      const res = await apiClient.get(`/proker_v3/target_unpak?${params.toString()}`);
      const data = res.data;
      let val = "";
      if (data) {
        val =
          data.target_unpak && data.target_unpak !== "-"
            ? data.target_unpak
            : data.target
            ? `${data.target} ${data.satuan || ""}`.trim()
            : data.target_min && data.target_max
            ? `${data.target_min} - ${data.target_max} ${data.satuan || ""}`.trim()
            : data.target_min
            ? `>= ${data.target_min} ${data.satuan || ""}`.trim()
            : data.target_max
            ? `<= ${data.target_max} ${data.satuan || ""}`.trim()
            : "";
      }
      setScopes((prev) => {
        const next = [...prev];
        if (next[scopeIndex]) {
          next[scopeIndex] = {
            ...next[scopeIndex],
            targetUnpak: val || "",
            loadingTargetUnpak: false,
          };
        }
        return next;
      });
    } catch (err) {
      console.error("Gagal mengambil target unpak:", err);
      setScopes((prev) => {
        const next = [...prev];
        if (next[scopeIndex]) {
          next[scopeIndex] = {
            ...next[scopeIndex],
            targetUnpak: "",
            loadingTargetUnpak: false,
          };
        }
        return next;
      });
    }
  };

  // Handle Indikator selection for specific scope
  const handleSelectIndikator = (scopeIndex, item) => {
    let parentStandar = null;
    if (item?.id_master_standar) {
      const sObj = (standarOptions || []).find((s) => s.id === item.id_master_standar);
      if (sObj) {
        parentStandar = { ...sObj, label: sObj.nama, nama: sObj.nama };
      }
    }

    setScopes((prev) => {
      const next = [...prev];
      const sc = next[scopeIndex];
      if (!sc) return prev;
      next[scopeIndex] = {
        ...sc,
        selectedIndikator: item,
        indikatorKinerja: item ? item.indikator || item.label : "",
        selectedStandar: parentStandar || sc.selectedStandar,
        standarSubStandar: parentStandar ? parentStandar.nama : sc.standarSubStandar,
        targetUnpak: "",
      };
      return next;
    });

    if (item?.id) {
      fetchTargetUnpakForScope(scopeIndex, item);
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!namaProgram.trim()) {
      addToast("warning", "Nama Program Kerja wajib diisi");
      return false;
    }
    const currentUnitId = selectedUnit?.id || idFakultasUnit;
    if (!currentUnitId && isAdmin) {
      addToast("warning", "Silakan pilih Fakultas / Unit Kerja");
      return false;
    }
    return true;
  };

  // Step 2 Validation (at least one valid scope, each scope has standard & indikator, and none unmapped)
  const validateStep2 = () => {
    if (scopes.length === 0) {
      addToast("warning", "Minimal 1 Standar & Indikator Renstra harus diisi");
      return false;
    }
    for (let i = 0; i < scopes.length; i++) {
      const sc = scopes[i];
      if (!sc.selectedStandar && !sc.standarSubStandar.trim()) {
        addToast("warning", `Silakan pilih Standar pada Lingkup #${i + 1}`);
        return false;
      }
      if (!sc.selectedIndikator && !sc.indikatorKinerja.trim()) {
        addToast(
          "warning",
          `Silakan pilih Indikator Kinerja pada Lingkup #${i + 1}`,
        );
        return false;
      }
      if (sc.loadingTargetUnpak) {
        addToast(
          "warning",
          `Target Unpak pada Lingkup #${i + 1} sedang dimuat`,
        );
        return false;
      }
      if (
        sc.selectedIndikator &&
        !sc.loadingTargetUnpak &&
        (!sc.targetUnpak || sc.targetUnpak.trim() === "")
      ) {
        addToast(
          "error",
          `Indikator pada Lingkup #${i + 1} belum mapping renstra. Tidak dapat melanjutkan.`,
        );
        return false;
      }
    }
    return true;
  };

  // Cek apakah ada indikator yang belum mapping renstra (salah satu saja menyebabkan tombol lanjut disable)
  const hasUnmappedRenstra = useMemo(() => {
    return scopes.some(
      (sc) =>
        sc.selectedIndikator &&
        !sc.loadingTargetUnpak &&
        (!sc.targetUnpak || sc.targetUnpak.trim() === ""),
    );
  }, [scopes]);

  const hasLoadingTarget = useMemo(() => {
    return scopes.some((sc) => sc.loadingTargetUnpak);
  }, [scopes]);

  const isNextStep2Disabled = hasUnmappedRenstra || hasLoadingTarget;

  // Step Navigation Handlers
  const handleNextStep1 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleNextStep2 = () => {
    if (validateStep2()) {
      setStep(3);
    }
  };

  // Full Submit Handler (Sends all data from Steps 1, 2, and 3)
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    const currentTahun = selectedTahun?.tahun || selectedTahun?.Tahun || tahun || "2026";
    const currentUnitId = selectedUnit?.id || idFakultasUnit;
    const currentUnitUuid = selectedUnit?.uuid || (currentUnitId ? String(currentUnitId) : "");

    const scopesPayload = scopes.map((sc) => ({
      uuid: sc.uuid || undefined,
      id_indikator: sc.selectedIndikator?.id || undefined,
      standar_sub_standar: (sc.selectedStandar?.nama || sc.standarSubStandar || "").trim(),
      indikator_kinerja: (sc.selectedIndikator?.indikator || sc.indikatorKinerja || "").trim(),
      target_unpak: (sc.targetUnpak || "").trim(),
      capaian_unit_lalu: (sc.capaianUnitLalu || "").trim(),
      target_unit: (sc.targetUnit || "").trim(),
      output: (sc.output || "").trim(),
      outcome: (sc.outcome || "").trim(),
    }));

    const primaryScope = scopesPayload[0] || {};

    setSubmitting(true);
    try {
      const token = getValidToken();

      const fd = new FormData();
      fd.append("no_proker", String(Number(noProker) || 1));
      fd.append("nama_program", namaProgram.trim());
      if (currentUnitId) fd.append("id_fakultas_unit", String(currentUnitId));
      if (currentUnitUuid) fd.append("fakultas_unit", currentUnitUuid);
      if (initialData?.IdMataProgram) fd.append("id_mata_program", String(initialData.IdMataProgram));
      fd.append("tahun", String(currentTahun));
      fd.append("pic", pic.trim());
      fd.append("beban_yayasan", bebanYayasan ? "1" : "0");

      // Dynamic scopes JSON
      fd.append("scopes", JSON.stringify(scopesPayload));

      // Mirror primary scope for backward-compatibility with matrix_proker fields
      if (primaryScope.id_indikator) fd.append("id_indikator", String(primaryScope.id_indikator));
      fd.append("standar_sub_standar", primaryScope.standar_sub_standar || "");
      fd.append("indikator_kinerja", primaryScope.indikator_kinerja || "");
      fd.append("target_unpak", primaryScope.target_unpak || "");
      fd.append("capaian_unit_lalu", primaryScope.capaian_unit_lalu || "");
      fd.append("target_unit", primaryScope.target_unit || "");
      fd.append("output", primaryScope.output || "");
      fd.append("outcome", primaryScope.outcome || "");

      let res;
      if (mode === "edit") {
        res = await apiClient.put(`/proker_v3/${initialData.UUID}`, fd);
      } else {
        res = await apiClient.post("/proker_v3", fd);
      }
      const data = res.data;

      addToast(
        "success",
        mode === "edit"
          ? "Matriks Program Kerja berhasil diperbarui"
          : "Matriks Program Kerja berhasil ditambahkan"
      );
      onSuccess?.();
      onClose?.();
    } catch (err) {
      addToast("error", err?.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-3xl border border-gray-100 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-linear-to-r from-purple-50/60 via-white to-indigo-50/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200 shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                        {mode === "edit"
                          ? "Edit Matriks Program Kerja"
                          : "Tambah Program Kerja Baru"}
                      </Dialog.Title>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Isi form matriks proker sesuai Standar & Indikator Renstra (3 Step)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 3-STEP WIZARD STEPPER */}
                <div className="px-6 py-3.5 bg-gray-50/80 border-b border-gray-100">
                  <div className="flex items-center justify-between max-w-xl mx-auto">
                    {/* Step 1 */}
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                          step === 1
                            ? "bg-purple-600 text-white ring-4 ring-purple-100 scale-105"
                            : step > 1
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-gray-400 border border-gray-300"
                        }`}
                      >
                        {step > 1 ? <Check className="w-4 h-4 stroke-[2.5]" /> : "1"}
                      </div>
                      <span
                        className={`text-[11px] font-bold transition ${
                          step === 1
                            ? "text-purple-700"
                            : step > 1
                            ? "text-emerald-700"
                            : "text-gray-400"
                        }`}
                      >
                        1. Identitas Program
                      </span>
                    </button>

                    {/* Connecting Line 1-2 */}
                    <div className="flex-1 h-0.5 mx-3 -mt-3.5 bg-gray-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          step >= 2 ? "bg-emerald-500 w-full" : "w-0"
                        }`}
                      />
                    </div>

                    {/* Step 2 */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep1()) setStep(2);
                      }}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                          step === 2
                            ? "bg-purple-600 text-white ring-4 ring-purple-100 scale-105"
                            : step > 2
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-gray-400 border border-gray-300"
                        }`}
                      >
                        {step > 2 ? <Check className="w-4 h-4 stroke-[2.5]" /> : "2"}
                      </div>
                      <span
                        className={`text-[11px] font-bold transition ${
                          step === 2
                            ? "text-purple-700"
                            : step > 2
                            ? "text-emerald-700"
                            : "text-gray-400"
                        }`}
                      >
                        2. Standar & Target
                      </span>
                    </button>

                    {/* Connecting Line 2-3 */}
                    <div className="flex-1 h-0.5 mx-3 -mt-3.5 bg-gray-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          step >= 3 ? "bg-emerald-500 w-full" : "w-0"
                        }`}
                      />
                    </div>

                    {/* Step 3 */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep1() && validateStep2()) setStep(3);
                      }}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                          step === 3
                            ? "bg-purple-600 text-white ring-4 ring-purple-100 scale-105"
                            : "bg-white text-gray-400 border border-gray-300"
                        }`}
                      >
                        3
                      </div>
                      <span
                        className={`text-[11px] font-bold transition ${
                          step === 3 ? "text-purple-700" : "text-gray-400"
                        }`}
                      >
                        3. Luaran & Dampak
                      </span>
                    </button>
                  </div>
                </div>

                {/* Form Body with 3 Step Views */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* ======================================================== */}
                  {/* STEP 1: IDENTITAS UNIT & PROGRAM KERJA                   */}
                  {/* ======================================================== */}
                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-purple-700">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span>1. Identitas Unit & Program Kerja</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        {/* Tahun */}
                        <div className="sm:col-span-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Tahun Renstra <span className="text-rose-500">*</span>
                          </label>
                          <SearchSelect
                            options={tahunOptions}
                            value={selectedTahun}
                            onChange={(val) => {
                              setSelectedTahun(val);
                              setTahun(val?.tahun || val?.Tahun || "2026");
                            }}
                            placeholder="Pilih Tahun"
                            icon={Calendar}
                          />
                        </div>

                        {/* Fakultas / Unit */}
                        <div className="sm:col-span-8">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Fakultas / Unit Kerja <span className="text-rose-500">*</span>
                          </label>
                          <SearchSelect
                            options={unitOptions}
                            value={selectedUnit}
                            disabled={!isAdmin && Boolean(selectedUnit)}
                            onChange={(val) => {
                              setSelectedUnit(val);
                              setIdFakultasUnit(val?.id || null);
                            }}
                            placeholder="Pilih Unit Kerja"
                            icon={Building2}
                          />
                        </div>

                        {/* Nama Program Kerja */}
                        <div className="sm:col-span-12">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Nama Program Kerja <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            required
                            placeholder="Contoh: Maintenance Infrastruktur Server & Network / Pengembangan Sistem Baru"
                            value={namaProgram}
                            onChange={(e) => setNamaProgram(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                          />
                        </div>

                        {/* PIC Program */}
                        <div className="sm:col-span-12">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Penanggung Jawab (PIC Program)
                          </label>
                          <div className="relative">
                            <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="Contoh: Kepala BPSI / Tim Pengembang / PIC Unit"
                              value={pic}
                              onChange={(e) => setPic(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>

                        {/* Toggle Beban Yayasan */}
                        <div className="sm:col-span-12">
                          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-50 transition">
                            <div>
                              <div className="text-xs font-semibold text-gray-800">
                                Beban Yayasan
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Aktifkan jika pembiayaan program kerja ini ditanggung oleh Yayasan
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={bebanYayasan}
                              onClick={() => setBebanYayasan((prev) => !prev)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                                bebanYayasan ? "bg-purple-600" : "bg-gray-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  bebanYayasan ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* STEP 2: STANDAR RENSTRA, INDIKATOR & TARGET (DINAMIS)   */}
                  {/* ======================================================== */}
                  {step === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
                          <Target className="w-4 h-4 text-purple-600" />
                          <span>2. Standar Renstra, Indikator & Target ({scopes.length} Lingkup)</span>
                        </div>
                        <span className="text-[11px] text-gray-500">
                          Bisa menambah lebih dari 1 Standar & Indikator
                        </span>
                      </div>

                      <div className="space-y-4">
                        {scopes.map((sc, index) => {
                          const isTargetUnpakEmpty = Boolean(
                            sc.selectedIndikator &&
                              !sc.loadingTargetUnpak &&
                              (!sc.targetUnpak || sc.targetUnpak.trim() === "")
                          );
                          const isTargetUnpakDisabled = Boolean(
                            !sc.selectedIndikator || sc.loadingTargetUnpak || isTargetUnpakEmpty
                          );
                          const filteredIndikators = getFilteredIndikators(sc.selectedStandar);

                          return (
                            <div
                              key={index}
                              className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4 relative transition hover:border-purple-200"
                            >
                              {/* Scope Header */}
                              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center shadow-2xs">
                                    {index + 1}
                                  </span>
                                  <span className="text-xs font-bold text-gray-900">
                                    Lingkup Standar & Target #{index + 1}
                                  </span>
                                </div>
                                {scopes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveScope(index)}
                                    className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition cursor-pointer font-medium"
                                    title="Hapus lingkup standar & indikator ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus Lingkup</span>
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                {/* Standar & Sub Standar */}
                                <div className="sm:col-span-12">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-semibold text-gray-700">
                                      Standar Mutu Renstra <span className="text-rose-500">*</span>
                                    </label>
                                    {sc.selectedStandar && (
                                      <button
                                        type="button"
                                        onClick={() => handleSelectStandar(index, null)}
                                        className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                                      >
                                        Reset Standar
                                      </button>
                                    )}
                                  </div>
                                  <SearchSelect
                                    options={formattedStandarOptions}
                                    value={sc.selectedStandar}
                                    onChange={(item) => handleSelectStandar(index, item)}
                                    placeholder="Cari & pilih standar renstra..."
                                    icon={Layers}
                                  />
                                </div>

                                {/* Indikator Kinerja Utama (IKU) / IKT */}
                                <div className="sm:col-span-12">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-semibold text-gray-700">
                                      Indikator Kinerja Utama (IKU / IKPT) <span className="text-rose-500">*</span>
                                    </label>
                                    {sc.selectedStandar && (
                                      <span className="text-[10px] text-purple-600 font-medium">
                                        (Terfilter berdasarkan standar yang dipilih)
                                      </span>
                                    )}
                                  </div>
                                  <SearchSelect
                                    options={filteredIndikators}
                                    value={sc.selectedIndikator}
                                    onChange={(item) => handleSelectIndikator(index, item)}
                                    placeholder="Cari & pilih indikator kinerja renstra..."
                                    icon={BookmarkCheck}
                                  />
                                </div>

                                {/* Target Unpak (Auto-fill & Editable) */}
                                <div className="sm:col-span-6">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-semibold text-gray-700">
                                      Target Unpak
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => fetchTargetUnpakForScope(index)}
                                        disabled={sc.loadingTargetUnpak || !sc.selectedIndikator}
                                        className="text-[10px] text-purple-600 hover:text-purple-800 flex items-center gap-0.5 disabled:opacity-40 cursor-pointer"
                                        title="Muat ulang target dari template renstra"
                                      >
                                        <RefreshCw className={`w-3 h-3 ${sc.loadingTargetUnpak ? "animate-spin" : ""}`} />
                                        <span>Sinkronkan</span>
                                      </button>
                                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                                        <Sparkles className="w-3 h-3 text-emerald-600" />
                                        Otomatis
                                      </span>
                                    </div>
                                  </div>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={sc.targetUnpak}
                                      onChange={(e) => updateScopeField(index, "targetUnpak", e.target.value)}
                                      disabled={isTargetUnpakDisabled}
                                      placeholder={
                                        sc.loadingTargetUnpak
                                          ? "Memuat target renstra..."
                                          : !sc.selectedIndikator
                                          ? "Pilih indikator terlebih dahulu"
                                          : isTargetUnpakEmpty
                                          ? "Target Unpak kosong (belum mapping renstra)"
                                          : "Target Unpak (terisi otomatis target / min-max)"
                                      }
                                      className={`w-full px-3 py-2 text-xs rounded-xl border font-bold transition ${
                                        isTargetUnpakEmpty
                                          ? "border-amber-300 bg-amber-50/50 text-gray-400 cursor-not-allowed"
                                          : !sc.selectedIndikator
                                          ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                                          : "border-emerald-300 bg-emerald-50/40 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                      }`}
                                    />
                                    {sc.loadingTargetUnpak && (
                                      <div className="absolute right-3 top-2.5">
                                        <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Alert jika indikator belum mapping renstra */}
                                  {isTargetUnpakEmpty ? (
                                    <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs shadow-2xs">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                      <span className="text-[11px] font-medium leading-tight">
                                        Indikator tersebut belum mapping renstra
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-gray-500 mt-1">
                                      Target institusi terisi otomatis dari template renstra (target single / min-max).
                                    </p>
                                  )}
                                </div>

                                {/* Target Unit */}
                                <div className="sm:col-span-6">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Target Unit Kerja
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: (5) Maintenance rutin terdokumentasi / 80%"
                                    value={sc.targetUnit}
                                    onChange={(e) => updateScopeField(index, "targetUnit", e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    Target capaian spesifik unit Anda untuk program ini.
                                  </p>
                                </div>

                                {/* Capaian Unit Lalu */}
                                <div className="sm:col-span-12">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Capaian Unit Tahun Lalu
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: (4) Maintenance rutin per bulan / Belum ada"
                                    value={sc.capaianUnitLalu}
                                    onChange={(e) => updateScopeField(index, "capaianUnitLalu", e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Tombol Tambah Standar & Indikator */}
                        <button
                          type="button"
                          onClick={handleAddScope}
                          className="w-full py-2.5 px-4 border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl bg-purple-50/40 hover:bg-purple-50 text-purple-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Tambah Standar & Indikator</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* STEP 3: LUARAN & DAMPAK PROGRAM (OUTPUT & OUTCOME)       */}
                  {/* ======================================================== */}
                  {step === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-purple-700">
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        <span>3. Luaran & Dampak Program ({scopes.length} Lingkup Output & Outcome)</span>
                      </div>

                      <div className="space-y-4">
                        {scopes.map((sc, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center shadow-2xs">
                                  {index + 1}
                                </span>
                                <span className="text-xs font-bold text-gray-900">
                                  Lingkup #{index + 1}: {sc.indikatorKinerja || sc.standarSubStandar || "Standar & Indikator"}
                                </span>
                              </div>
                              {sc.standarSubStandar && (
                                <span className="text-[10px] text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full font-medium">
                                  {sc.standarSubStandar}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Output (Hasil Langsung)
                                </label>
                                <textarea
                                  rows={3}
                                  placeholder="Contoh: Modul CDC berjalan; dokumentasi integrasi database."
                                  value={sc.output}
                                  onChange={(e) => updateScopeField(index, "output", e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Outcome (Dampak / Manfaat)
                                </label>
                                <textarea
                                  rows={3}
                                  placeholder="Contoh: Efisiensi sinkronisasi data civitas akademika tanpa jeda."
                                  value={sc.outcome}
                                  onChange={(e) => updateScopeField(index, "outcome", e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Ringkasan / Summary Card Sebelum Kirim */}
                      <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span>Ringkasan Data Program Kerja ({scopes.length} Lingkup):</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-700 pt-1">
                          <div>
                            <span className="text-gray-400">Program Kerja:</span>{" "}
                            <b className="text-gray-900">{namaProgram || "-"}</b>
                          </div>
                          <div>
                            <span className="text-gray-400">Tahun & Unit:</span>{" "}
                            <b className="text-gray-900">{tahun}</b> • {selectedUnit?.nama || selectedUnit?.label || "-"}
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-purple-200/50">
                          {scopes.map((sc, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-white/80 border border-purple-100 text-[11px] space-y-1">
                              <div className="flex items-center justify-between font-bold text-gray-900">
                                <span>#{idx + 1} {sc.standarSubStandar || "-"}</span>
                                <span className="text-purple-700 font-semibold">{sc.indikatorKinerja || "-"}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-gray-600 pt-0.5">
                                <div><span className="text-gray-400">Target Unpak:</span> <b className="text-emerald-700">{sc.targetUnpak || "-"}</b></div>
                                <div><span className="text-gray-400">Target Unit:</span> <b className="text-purple-700">{sc.targetUnit || "-"}</b></div>
                                {sc.output && <div className="col-span-2 text-gray-500"><span className="text-gray-400">Output:</span> {sc.output}</div>}
                                {sc.outcome && <div className="col-span-2 text-gray-500"><span className="text-gray-400">Outcome:</span> {sc.outcome}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Catatan Terkait Aktivitas & Status */}
                      <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-800">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Alur Pengisian Aktivitas:</p>
                          <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                            Data program kerja di atas akan disimpan ke tabel <b>matrix_proker</b> dan <b>matrix_proker_scope</b>.
                            Setelah tersimpan, klik tombol <b>"Aktivitas"</b> pada baris tabel untuk menambah detail kegiatan, anggaran, luaran produk, dan jadwal mingguan [RK] & [R].
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wizard Action Buttons */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {step === 1 ? (
                        <button
                          type="button"
                          onClick={onClose}
                          disabled={submitting}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                        >
                          Batal
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStep(step - 1)}
                          disabled={submitting}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Sebelumnya</span>
                        </button>
                      )}
                      {step === 2 && hasUnmappedRenstra && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Indikator belum mapping renstra</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {step === 1 && (
                        <button
                          type="button"
                          onClick={handleNextStep1}
                          className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Lanjut ke Standar & Target</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      {step === 2 && (
                        <button
                          type="button"
                          onClick={handleNextStep2}
                          disabled={isNextStep2Disabled}
                          className={`px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                            isNextStep2Disabled
                              ? "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed shadow-none"
                              : "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 cursor-pointer"
                          }`}
                          title={
                            hasUnmappedRenstra
                              ? "Tombol dinonaktifkan: terdapat indikator yang belum mapping renstra"
                              : hasLoadingTarget
                              ? "Sedang memuat data target renstra..."
                              : "Lanjut ke Luaran & Dampak"
                          }
                        >
                          <span>Lanjut ke Luaran & Dampak</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      {step === 3 && (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                          {submitting ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Menyimpan Seluruh Data...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>{mode === "edit" ? "Perbarui Matriks Proker" : "Simpan Matriks Proker"}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
