import React, { Fragment, useEffect, useState, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useAuth } from "@/Providers/AuthProvider";
import { useToast } from "@/Providers/ToastProvider";
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
  onClose,
  onSuccess,
}) {
  const { getValidToken, user } = useAuth();
  const { addToast } = useToast();

  const isAdmin = user?.level === "admin";
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTargetUnpak, setLoadingTargetUnpak] = useState(false);

  // Form Fields - Step 1: Identitas Unit & Program Kerja
  const [noProker, setNoProker] = useState(1);
  const [namaProgram, setNamaProgram] = useState("");
  const [idFakultasUnit, setIdFakultasUnit] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [tahun, setTahun] = useState("2026");
  const [selectedTahun, setSelectedTahun] = useState(null);
  const [pic, setPic] = useState("");

  // Form Fields - Step 2: Standar Renstra, Indikator & Target
  const [selectedStandar, setSelectedStandar] = useState(null);
  const [standarSubStandar, setStandarSubStandar] = useState("");
  const [selectedIndikator, setSelectedIndikator] = useState(null);
  const [indikatorKinerja, setIndikatorKinerja] = useState("");
  const [targetUnpak, setTargetUnpak] = useState("");
  const [capaianUnitLalu, setCapaianUnitLalu] = useState("");
  const [targetUnit, setTargetUnit] = useState("");

  // Form Fields - Step 3: Luaran & Dampak Program
  const [output, setOutput] = useState("");
  const [outcome, setOutcome] = useState("");

  // Map Standar Options for SearchSelect
  const formattedStandarOptions = useMemo(() => {
    return (standarOptions || []).map((s) => ({
      ...s,
      id: s.id,
      label: s.nama,
      nama: s.nama,
    }));
  }, [standarOptions]);

  // Filtered Indikator Options based on selected standard
  const formattedIndikatorOptions = useMemo(() => {
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
  }, [indikatorOptions, selectedStandar]);

  // Reset or Populate form on open
  useEffect(() => {
    if (!open) return;
    setStep(1);

    if (mode === "edit" && initialData) {
      setNoProker(initialData.NoProker || 1);
      setNamaProgram(initialData.NamaProgram || "");
      setIdFakultasUnit(initialData.IdFakultasUnit || null);
      setTahun(initialData.Tahun || "2026");
      setStandarSubStandar(initialData.StandarSubStandar || "");
      setIndikatorKinerja(initialData.IndikatorKinerja || "");
      setTargetUnpak(initialData.TargetUnpak || "");
      setCapaianUnitLalu(initialData.CapaianUnitLalu || "");
      setTargetUnit(initialData.TargetUnit || "");
      setOutput(initialData.Output || "");
      setOutcome(initialData.Outcome || "");
      setPic(initialData.PIC || "");

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

      // Match Standar Obj by name or id
      const sObj = (standarOptions || []).find(
        (s) =>
          s.nama === initialData.StandarSubStandar ||
          s.id === initialData.IdMasterStandar
      );
      setSelectedStandar(sObj ? { ...sObj, label: sObj.nama, nama: sObj.nama } : null);

      // Match Indikator Obj by name or id
      const iObj = (indikatorOptions || []).find(
        (i) =>
          i.indikator === initialData.IndikatorKinerja ||
          i.id === initialData.IdMasterIndikator
      );
      setSelectedIndikator(iObj ? { ...iObj, label: iObj.indikator, nama: iObj.indikator } : null);
    } else {
      // Create mode
      setNoProker(1);
      setNamaProgram("");
      setTahun("2026");
      setSelectedStandar(null);
      setStandarSubStandar("");
      setSelectedIndikator(null);
      setIndikatorKinerja("");
      setTargetUnpak("");
      setCapaianUnitLalu("");
      setTargetUnit("");
      setOutput("");
      setOutcome("");
      setPic(user?.nama || "");

      // Default unit from user
      const userUnitId = user?.id_fakultas_unit || user?.fakultas_unit;
      const uObj = unitOptions.find(
        (u) =>
          String(u.id) === String(userUnitId) ||
          String(u.uuid) === String(userUnitId) ||
          String(u.nama).toLowerCase() === String(userUnitId).toLowerCase()
      );
      setSelectedUnit(uObj || null);
      setIdFakultasUnit(uObj ? uObj.id : null);

      const tObj = tahunOptions.find((t) => String(t.tahun || t.Tahun) === "2026");
      setSelectedTahun(tObj || null);
    }
  }, [open, mode, initialData, unitOptions, tahunOptions, standarOptions, indikatorOptions, user]);

  // Handle Standar selection
  const handleSelectStandar = (item) => {
    setSelectedStandar(item);
    setStandarSubStandar(item ? item.nama || item.label : "");

    // If current selected indikator doesn't belong to this standard, clear it
    if (selectedIndikator && item && selectedIndikator.id_master_standar !== item.id) {
      setSelectedIndikator(null);
      setIndikatorKinerja("");
      setTargetUnpak("");
    }
  };

  // Auto-fetch Target Unpak from template_renstra (handles target & min/max)
  const fetchTargetUnpak = async (overrideIndikator = null) => {
    const targetInd = overrideIndikator || selectedIndikator;
    const currentIndikatorId = targetInd?.id;
    if (!currentIndikatorId) {
      if (mode === "create") setTargetUnpak("");
      return;
    }

    const currentTahun = selectedTahun?.tahun || selectedTahun?.Tahun || tahun || "2026";
    const currentUnitId = selectedUnit?.id || idFakultasUnit;

    setLoadingTargetUnpak(true);
    try {
      const token = getValidToken();
      const params = new URLSearchParams({
        tahun: String(currentTahun),
        id_indikator: String(currentIndikatorId),
      });
      if (currentUnitId) {
        params.append("id_fakultas_unit", String(currentUnitId));
      }

      const res = await fetch(`http://localhost:3000/proker_v3/target_unpak?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        const val =
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
        setTargetUnpak(val || "");
      }
    } catch (err) {
      console.error("Gagal mengambil target unpak:", err);
    } finally {
      setLoadingTargetUnpak(false);
    }
  };

  // Handle Indikator selection
  const handleSelectIndikator = (item) => {
    setSelectedIndikator(item);
    setIndikatorKinerja(item ? item.indikator || item.label : "");

    // If standard not yet selected, auto-select standard
    if (item?.id_master_standar && (!selectedStandar || selectedStandar.id !== item.id_master_standar)) {
      const parentStandar = (standarOptions || []).find((s) => s.id === item.id_master_standar);
      if (parentStandar) {
        setSelectedStandar({ ...parentStandar, label: parentStandar.nama, nama: parentStandar.nama });
        setStandarSubStandar(parentStandar.nama);
      }
    }

    if (item?.id) {
      fetchTargetUnpak(item);
    } else {
      setTargetUnpak("");
    }
  };

  useEffect(() => {
    if (!open) return;
    if (selectedIndikator?.id) {
      fetchTargetUnpak(selectedIndikator);
    }
  }, [open, selectedTahun, tahun, selectedUnit, idFakultasUnit]);

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

  // Step Navigation Handlers
  const handleNextStep1 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleNextStep2 = () => {
    setStep(3);
  };

  // Full Submit Handler (Sends all data from Steps 1, 2, and 3)
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateStep1()) {
      setStep(1);
      return;
    }

    const currentTahun = selectedTahun?.tahun || selectedTahun?.Tahun || tahun || "2026";
    const currentUnitId = selectedUnit?.id || idFakultasUnit;
    const currentUnitUuid = selectedUnit?.uuid || (currentUnitId ? String(currentUnitId) : "");

    setSubmitting(true);
    try {
      const token = getValidToken();

      // FULL DATA PAYLOAD from all 3 steps
      const payload = {
        no_proker: Number(noProker) || 1,
        nama_program: namaProgram.trim(),
        id_fakultas_unit: currentUnitId ? Number(currentUnitId) : null,
        fakultas_unit: currentUnitUuid,
        id_mata_program: initialData?.IdMataProgram || null,
        id_indikator: selectedIndikator?.id || initialData?.IdIndikator || null,
        tahun: String(currentTahun),
        standar_sub_standar: standarSubStandar.trim(),
        indikator_kinerja: indikatorKinerja.trim(),
        target_unpak: targetUnpak.trim(),
        capaian_unit_lalu: capaianUnitLalu.trim(),
        target_unit: targetUnit.trim(),
        output: output.trim(),
        outcome: outcome.trim(),
        pic: pic.trim(),
      };

      const url =
        mode === "edit"
          ? `http://localhost:3000/proker_v3/${initialData.UUID}`
          : "http://localhost:3000/proker_v3";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Gagal menyimpan program kerja");
      }

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
                        if (validateStep1()) setStep(3);
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
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* STEP 2: STANDAR RENSTRA, INDIKATOR & TARGET              */}
                  {/* ======================================================== */}
                  {step === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-purple-700">
                        <Target className="w-4 h-4 text-purple-600" />
                        <span>2. Standar Renstra, Indikator & Target</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        {/* Standar & Sub Standar */}
                        <div className="sm:col-span-12">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-gray-700">
                              Standar & Sub Standar (master_standar_renstra)
                            </label>
                            {selectedStandar && (
                              <button
                                type="button"
                                onClick={() => handleSelectStandar(null)}
                                className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                              >
                                Reset Standar
                              </button>
                            )}
                          </div>
                          <SearchSelect
                            options={formattedStandarOptions}
                            value={selectedStandar}
                            onChange={handleSelectStandar}
                            placeholder="Cari & pilih standar renstra..."
                            icon={Layers}
                          />
                        </div>

                        {/* Indikator Kinerja Utama (IKU) / IKT */}
                        <div className="sm:col-span-12">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-gray-700">
                              Indikator Kinerja Utama (IKU) / IKT (master_indikator_renstra)
                            </label>
                            {selectedStandar && (
                              <span className="text-[10px] text-purple-600 font-medium">
                                (Terfilter berdasarkan standar yang dipilih)
                              </span>
                            )}
                          </div>
                          <SearchSelect
                            options={formattedIndikatorOptions}
                            value={selectedIndikator}
                            onChange={handleSelectIndikator}
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
                                onClick={() => fetchTargetUnpak()}
                                disabled={loadingTargetUnpak || !selectedIndikator}
                                className="text-[10px] text-purple-600 hover:text-purple-800 flex items-center gap-0.5 disabled:opacity-40 cursor-pointer"
                                title="Muat ulang target dari template renstra"
                              >
                                <RefreshCw className={`w-3 h-3 ${loadingTargetUnpak ? "animate-spin" : ""}`} />
                                <span>Sinkronkan</span>
                              </button>
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Otomatis Template Renstra
                              </span>
                            </div>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={targetUnpak}
                              onChange={(e) => setTargetUnpak(e.target.value)}
                              placeholder={
                                loadingTargetUnpak
                                  ? "Memuat target renstra..."
                                  : "Target Unpak (terisi otomatis target / min-max)"
                              }
                              className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-emerald-50/40 text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {loadingTargetUnpak && (
                              <div className="absolute right-3 top-2.5">
                                <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">
                            Target institusi terisi otomatis dari template renstra (target single / target min-max). Anda juga dapat menyesuaikannya bila diperlukan.
                          </p>
                        </div>

                        {/* Target Unit */}
                        <div className="sm:col-span-6">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Target Unit Kerja
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: (5) Maintenance rutin terdokumentasi / 80%"
                            value={targetUnit}
                            onChange={(e) => setTargetUnit(e.target.value)}
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
                            value={capaianUnitLalu}
                            onChange={(e) => setCapaianUnitLalu(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
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
                        <span>3. Luaran & Dampak Program (Output & Outcome)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Output (Hasil Langsung)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Contoh: Modul CDC berjalan; dokumentasi integrasi database."
                            value={output}
                            onChange={(e) => setOutput(e.target.value)}
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
                            value={outcome}
                            onChange={(e) => setOutcome(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Ringkasan / Summary Card Sebelum Kirim */}
                      <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span>Ringkasan Data Program Kerja (Siap Dikirim Lengkap):</span>
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
                          <div>
                            <span className="text-gray-400">Standar:</span>{" "}
                            <span className="text-gray-800">{standarSubStandar || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Indikator:</span>{" "}
                            <span className="text-gray-800">{indikatorKinerja || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Target Unpak:</span>{" "}
                            <span className="font-semibold text-emerald-700">{targetUnpak || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Target Unit:</span>{" "}
                            <span className="font-semibold text-purple-700">{targetUnit || "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Catatan Terkait Aktivitas & Status */}
                      <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-800">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Alur Pengisian Aktivitas:</p>
                          <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                            Data program kerja di atas akan disimpan ke tabel <b>matrix_proker</b>.
                            Setelah tersimpan, klik tombol <b>"Aktivitas"</b> pada baris tabel untuk menambah detail kegiatan, anggaran, luaran produk, dan jadwal mingguan [RK] & [R].
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wizard Action Buttons */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
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
                          className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 transition flex items-center gap-1.5 cursor-pointer"
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
