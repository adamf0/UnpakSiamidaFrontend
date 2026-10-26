import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty, throwIfResponseNotOk, fetchFakultasUnits } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import {
  ShieldAlert,
  AlertTriangle,
  Building2,
  Calendar,
  Flame,
  AlertOctagon,
  CheckCircle2,
  FileText,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function RiskAssessmentFormModal({
  open,
  mode,
  data,
  onClose,
  onSuccess,
  isAdmin = false,
  userUnit = null,
}) {
  const { addToast } = useToast();
  const { getValidToken, user } = useAuth();

  // Master Data States (Loaded strictly from Database)
  const [tahunOptions, setTahunOptions] = useState([]);
  const [loadingTahun, setLoadingTahun] = useState(false);

  const [fakultasOptions, setFakultasOptions] = useState([]);
  const [loadingFakultas, setLoadingFakultas] = useState(false);

  const [allPrograms, setAllPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [kemungkinanOptions, setKemungkinanOptions] = useState([]);
  const [dampakOptions, setDampakOptions] = useState([]);
  const [riskLevels, setRiskLevels] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      tahun: null,
      fakultas_unit: null,
      program: null,
      isu_internal_eksternal: "",
      deskripsi_risiko: "",
      kemungkinan_awal: 3,
      dampak_awal: 3,
      tindakan_mitigasi: "",
      peluang: "",
      kenyataan_residu: "",
      kemungkinan_residu: "",
      dampak_residu: "",
      rencana_tindak_lanjut: "",
    },
  });

  const selectedTahun = watch("tahun");
  const selectedFakultas = watch("fakultas_unit");
  const kemungkinanAwalVal = watch("kemungkinan_awal");
  const dampakAwalVal = watch("dampak_awal");
  const kemungkinanResiduVal = watch("kemungkinan_residu");
  const dampakResiduVal = watch("dampak_residu");

  // Dynamic Score & Level Calculation based on DB risk_levels
  const awalAnalysis = useMemo(() => {
    const k = parseInt(kemungkinanAwalVal, 10);
    const d = parseInt(dampakAwalVal, 10);
    if (!isNaN(k) && !isNaN(d) && k > 0 && d > 0) {
      const score = k * d;
      const matched = riskLevels.find(
        (lvl) => score >= (lvl.min_skor ?? 1) && score <= (lvl.max_skor ?? 25)
      );
      const kode = matched?.kode || (score >= 15 ? "T" : score >= 5 ? "M" : "R");
      const label = matched?.nama_level || (score >= 15 ? "Tinggi" : score >= 5 ? "Menengah" : "Rendah");

      let badgeColor = "bg-rose-100 text-rose-800 border-rose-300 ring-rose-500";
      if (kode === "R" || label.toLowerCase().includes("rendah")) {
        badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-500";
      } else if (kode === "M" || label.toLowerCase().includes("menengah") || label.toLowerCase().includes("sedang")) {
        badgeColor = "bg-amber-100 text-amber-800 border-amber-300 ring-amber-500";
      } else if (kode === "T" || label.toLowerCase().includes("tinggi")) {
        badgeColor = "bg-rose-100 text-rose-800 border-rose-300 ring-rose-500";
      }

      return { score, kode, label, badgeColor };
    }
    return { score: "-", kode: "-", label: "Belum Dinilai", badgeColor: "bg-gray-100 text-gray-700 border-gray-300" };
  }, [kemungkinanAwalVal, dampakAwalVal, riskLevels]);

  const residuAnalysis = useMemo(() => {
    const k = parseInt(kemungkinanResiduVal, 10);
    const d = parseInt(dampakResiduVal, 10);
    if (!isNaN(k) && !isNaN(d) && k > 0 && d > 0) {
      const score = k * d;
      const matched = riskLevels.find(
        (lvl) => score >= (lvl.min_skor ?? 1) && score <= (lvl.max_skor ?? 25)
      );
      const kode = matched?.kode || (score >= 15 ? "T" : score >= 5 ? "M" : "R");
      const label = matched?.nama_level || (score >= 15 ? "Tinggi" : score >= 5 ? "Menengah" : "Rendah");

      let badgeColor = "bg-rose-100 text-rose-800 border-rose-300 ring-rose-500";
      if (kode === "R" || label.toLowerCase().includes("rendah")) {
        badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-500";
      } else if (kode === "M" || label.toLowerCase().includes("menengah") || label.toLowerCase().includes("sedang")) {
        badgeColor = "bg-amber-100 text-amber-800 border-amber-300 ring-amber-500";
      } else if (kode === "T" || label.toLowerCase().includes("tinggi")) {
        badgeColor = "bg-rose-100 text-rose-800 border-rose-300 ring-rose-500";
      }

      return { score, kode, label, badgeColor };
    }
    return { score: "-", kode: "", label: "Belum Dinilai / N/A", badgeColor: "bg-gray-100 text-gray-500 border-gray-200" };
  }, [kemungkinanResiduVal, dampakResiduVal, riskLevels]);

  // Fetch Master Metadata from DB (risk_criteria, risk_levels, programs)
  const fetchMetadata = async () => {
    setLoadingMetadata(true);
    try {
      const res = await apiClient.get("/risk_options");
      const json = res.data;
      if (json) {
        if (Array.isArray(json.kemungkinan)) {
          setKemungkinanOptions(
            json.kemungkinan.map((k) => ({
              val: k.skor,
              skor: k.skor,
              label: `${k.skor} - ${k.label}${k.deskripsi ? ` (${k.deskripsi})` : ""}`,
            }))
          );
        }
        if (Array.isArray(json.dampak)) {
          setDampakOptions(
            json.dampak.map((d) => ({
              val: d.skor,
              skor: d.skor,
              label: `${d.skor} - ${d.label}${d.deskripsi ? ` (${d.deskripsi})` : ""}`,
            }))
          );
        }
        if (Array.isArray(json.levels)) {
          setRiskLevels(json.levels);
        }
        if (Array.isArray(json.programs) && json.programs.length > 0) {
          setAllPrograms(
            json.programs.map((p) => {
              const thn = p.tahun ? String(p.tahun) : "";
              const mpName = p.mata_program || "";
              const label = thn ? `[${thn}] ${mpName}` : mpName;
              return {
                id: p.id,
                rawId: p.id,
                UUID: p.uuid,
                nama: label,
                mata_program: mpName,
                id_fakultas_unit: p.id_fakultas_unit,
                id_master_tahun: p.id_master_tahun,
                tahun: thn,
                subText: thn ? `Tahun Anggaran: ${thn}` : undefined,
              };
            })
          );
        } else {
          try {
            const resMp = await apiClient.get("/mataprograms?mode=all");
            const jsonMp = resMp.data;
            if (Array.isArray(jsonMp)) {
              setAllPrograms(
                jsonMp.map((p) => {
                  const thn = p.Tahun ? String(p.Tahun) : "";
                  const mpName = p.MataProgram || "";
                  const label = thn ? `[${thn}] ${mpName}` : mpName;
                  return {
                    id: p.Id || p.ID,
                    rawId: p.Id || p.ID,
                    UUID: p.UUID || p.uuid,
                    nama: label,
                    mata_program: mpName,
                    id_master_tahun: p.TahunId,
                    tahun: thn,
                    subText: thn ? `Tahun Anggaran: ${thn}` : undefined,
                  };
                })
              );
            }
          } catch (eMp) {
            console.warn("Fallback fetch /mataprograms failed:", eMp);
          }
        }
      }
    } catch (err) {
      console.error("Gagal mengambil master data risiko dari database:", err);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const fetchTahunOptions = async () => {
    setLoadingTahun(true);
    try {
      const res = await apiClient.get("/tahunprokers?mode=all");
      const json = res.data;
      const mapped = (Array.isArray(json) ? json : []).map((item) => ({
        id: item.UUID,
        UUID: item.UUID,
        rawId: item.ID,
        nama: item.Tahun,
        ...item,
      }));
      setTahunOptions(mapped);
    } catch (err) {
      console.error("Fetch tahun gagal:", err);
    } finally {
      setLoadingTahun(false);
    }
  };

  const fetchFakultasOptions = async () => {
    setLoadingFakultas(true);
    try {
      const opts = await fetchFakultasUnits();
      setFakultasOptions(opts);
    } catch (err) {
      console.error("Fetch fakultas gagal:", err);
    } finally {
      setLoadingFakultas(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMetadata();
      fetchTahunOptions();
      fetchFakultasOptions();
    }
  }, [open]);

  // Filter Mata Program by selected unit & tahun
  const filteredPrograms = useMemo(() => {
    if (!Array.isArray(allPrograms)) return [];
    let list = allPrograms;

    if (selectedFakultas) {
      const fuId = selectedFakultas.rawId || selectedFakultas.ID || selectedFakultas.id;
      const hasUnitPrograms = list.some((p) => p.id_fakultas_unit);
      if (hasUnitPrograms) {
        list = list.filter((p) => !p.id_fakultas_unit || String(p.id_fakultas_unit) === String(fuId));
      }
    }

    if (selectedTahun) {
      const thnName = String(selectedTahun.Tahun || selectedTahun.nama || "").trim();
      const thnId = String(selectedTahun.rawId || selectedTahun.ID || "").trim();
      const filteredByYear = list.filter((p) => {
        const pThn = String(p.tahun || "").trim();
        const pThnId = String(p.id_master_tahun || "").trim();
        if (pThn && thnName) return pThn === thnName;
        if (pThnId && thnId) return pThnId === thnId;
        return true;
      });
      if (filteredByYear.length > 0) {
        list = filteredByYear;
      }
    }

    return list;
  }, [allPrograms, selectedFakultas, selectedTahun]);

  // Reset form when modal opens or edit data changes
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && data) {
      // Find Matching Master Data
      let thnObj = null;
      if (data.TahunUuid || data.Tahun) {
        thnObj = tahunOptions.find(
          (t) => t.UUID === data.TahunUuid || t.nama === data.Tahun
        ) || { id: data.TahunUuid || data.Tahun, nama: data.Tahun || "" };
      }

      let fuObj = null;
      if (data.UuidFakultasUnit || data.IdFakultasUnit) {
        fuObj = fakultasOptions.find(
          (f) =>
            f.UUID === data.UuidFakultasUnit ||
            String(f.rawId) === String(data.IdFakultasUnit)
        ) || {
          id: data.UuidFakultasUnit || data.IdFakultasUnit,
          nama: data.NamaFakultasUnit || "",
        };
      }

      let progObj = null;
      if (data.IdMataProgram || data.MataProgram) {
        const thn = data.Tahun || data.tahun || "";
        const mpName = data.MataProgram || "";
        const expectedNama = thn ? `[${thn}] ${mpName}` : mpName;

        progObj = allPrograms.find(
          (p) =>
            p.id === data.IdMataProgram ||
            p.UUID === data.MataProgramUuid ||
            p.mata_program === mpName ||
            p.nama === expectedNama ||
            p.nama === mpName
        ) || {
          id: data.IdMataProgram,
          UUID: data.MataProgramUuid,
          nama: expectedNama,
          mata_program: mpName,
          tahun: thn,
        };
      }

      reset({
        tahun: thnObj,
        fakultas_unit: fuObj,
        program: progObj,
        isu_internal_eksternal: data.IsuInternalEksternal || data.Penyebab || "",
        deskripsi_risiko: data.DeskripsiRisiko || data.PernyataanRisiko || "",
        kemungkinan_awal: data.KemungkinanAwal || data.Kemungkinan || 3,
        dampak_awal: data.DampakAwal || data.Keparahan || 3,
        tindakan_mitigasi: data.TindakanMitigasi || data.RencanaMitigasi || "",
        peluang: data.Peluang || "",
        kenyataan_residu: data.KenyataanResidu || "",
        kemungkinan_residu: data.KemungkinanResidu ?? "",
        dampak_residu: data.DampakResidu ?? "",
        rencana_tindak_lanjut: data.RencanaTindakLanjut || "",
      });
    } else {
      // New Mode: Default to active year & current user unit
      let defaultTahun = null;
      if (tahunOptions.length > 0) {
        defaultTahun = tahunOptions.find((t) => t.Status === "aktif") || tahunOptions[0];
      }

      let defaultUnit = null;
      if (!isAdmin && userUnit) {
        defaultUnit = userUnit;
      }

      reset({
        tahun: defaultTahun,
        fakultas_unit: defaultUnit,
        program: null,
        isu_internal_eksternal: "",
        deskripsi_risiko: "",
        kemungkinan_awal: 3,
        dampak_awal: 3,
        tindakan_mitigasi: "",
        peluang: "",
        kenyataan_residu: "",
        kemungkinan_residu: "",
        dampak_residu: "",
        rencana_tindak_lanjut: "",
      });
    }
  }, [open, mode, data, tahunOptions, fakultasOptions, allPrograms, isAdmin, userUnit, reset]);

  // Submit Handler
  const onSubmit = async (formData) => {
    const token = getValidToken();
    if (isEmpty(token)) return;

    if (!formData.program) {
      addToast("error", "Program Kerja wajib dipilih");
      return;
    }
    if (!formData.isu_internal_eksternal?.trim()) {
      addToast("error", "Internal/External Issue wajib diisi");
      return;
    }
    if (!formData.deskripsi_risiko?.trim()) {
      addToast("error", "Pernyataan Potensi Risiko wajib diisi");
      return;
    }
    if (!formData.tindakan_mitigasi?.trim()) {
      addToast("error", "Tindakan Untuk Mengatasi Risiko wajib diisi");
      return;
    }

    setSubmitting(true);

    try {
      const fd = new FormData();
      if (formData.tahun?.UUID || formData.tahun?.id) fd.append("tahun_uuid", formData.tahun?.UUID || formData.tahun?.id);
      if (formData.tahun?.nama || formData.tahun?.Tahun) fd.append("tahun", formData.tahun?.nama || formData.tahun?.Tahun);
      if (formData.tahun?.rawId || formData.tahun?.ID) fd.append("id_master_tahun", String(formData.tahun?.rawId || formData.tahun?.ID));

      if (formData.fakultas_unit?.UUID || formData.fakultas_unit?.id) fd.append("fakultas_unit", formData.fakultas_unit?.UUID || formData.fakultas_unit?.id);
      if (formData.fakultas_unit?.rawId || formData.fakultas_unit?.ID) fd.append("id_fakultas_unit", String(formData.fakultas_unit?.rawId || formData.fakultas_unit?.ID));

      if (formData.program?.id || formData.program?.rawId) fd.append("id_mata_program", String(formData.program?.id || formData.program?.rawId));
      if (formData.program?.UUID || formData.program?.uuid) fd.append("mata_program_uuid", formData.program?.UUID || formData.program?.uuid);

      fd.append("isu_internal_eksternal", formData.isu_internal_eksternal.trim());
      fd.append("deskripsi_risiko", formData.deskripsi_risiko.trim());
      fd.append("kemungkinan_awal", String(parseInt(formData.kemungkinan_awal, 10)));
      fd.append("dampak_awal", String(parseInt(formData.dampak_awal, 10)));
      fd.append("tingkat_risiko_awal", awalAnalysis.kode);

      fd.append("tindakan_mitigasi", formData.tindakan_mitigasi.trim());
      if (formData.peluang) fd.append("peluang", formData.peluang.trim());
      if (formData.kenyataan_residu) fd.append("kenyataan_residu", formData.kenyataan_residu.trim());
      if (formData.kemungkinan_residu) fd.append("kemungkinan_residu", String(parseInt(formData.kemungkinan_residu, 10)));
      if (formData.dampak_residu) fd.append("dampak_residu", String(parseInt(formData.dampak_residu, 10)));
      if (residuAnalysis.kode) fd.append("tingkat_risiko_residu", residuAnalysis.kode);
      if (formData.rencana_tindak_lanjut) fd.append("rencana_tindak_lanjut", formData.rencana_tindak_lanjut.trim());

      const isEdit = mode === "edit" && data?.UUID;
      if (isEdit) {
        await apiClient.put(`/risk_assessment/${data.UUID}`, fd);
      } else {
        await apiClient.post("/risk_assessment", fd);
      }

      addToast("success", isEdit ? "Analisis risiko berhasil diperbarui" : "Analisis risiko berhasil ditambahkan");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      addToast("error", err.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition appear show={Boolean(open)} as={Fragment}>
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-150 overflow-hidden text-left align-middle">
                {/* PINNED HEADER (Matching Gambar 2) */}
                <div className="shrink-0 px-6 py-4 border-b border-gray-150 bg-white flex items-center justify-between">
                  <div>
                    <Dialog.Title className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <span>
                        {mode === "edit"
                          ? "Edit Analisis Risiko Program Kerja"
                          : "Tambah Analisis Risiko Program Kerja"}
                      </span>
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isAdmin
                        ? "Sebagai Admin, Anda dapat mengelola analisis risiko untuk seluruh fakultas/unit."
                        : `Form Analisis Risiko Proker khusus untuk unit kerja Anda (${userUnit?.nama || "Unit Anda"}).`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition cursor-pointer"
                    title="Tutup"
                  >
                    ✕
                  </button>
                </div>

                {/* FORM CONTAINER WRAPPING SCROLLABLE BODY AND PINNED FOOTER */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  {/* SCROLLABLE BODY */}
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {/* Bagian 1: Konteks & Program Kerja */}
                  <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider pb-2 border-b border-gray-200">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>1. Program Kerja & Konteks Analisis</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tahun */}
                      <SearchSelect
                        label="Tahun Program Kerja"
                        required
                        loading={loadingTahun}
                        options={tahunOptions}
                        value={watch("tahun")}
                        onChange={(val) => setValue("tahun", val)}
                        placeholder="Pilih Tahun"
                      />

                      {/* Fakultas / Unit */}
                      <SearchSelect
                        label="Fakultas / Unit Kerja"
                        required
                        disabled={!isAdmin && Boolean(userUnit)}
                        loading={loadingFakultas}
                        options={fakultasOptions}
                        value={watch("fakultas_unit")}
                        onChange={(val) => setValue("fakultas_unit", val)}
                        placeholder="Pilih Fakultas / Unit"
                      />
                    </div>

                    {/* Program Kerja (Mata Program) */}
                    <div>
                      <SearchSelect
                        label="Program Kerja (Mata Program)"
                        required
                        loading={loadingMetadata}
                        options={filteredPrograms}
                        value={watch("program")}
                        onChange={(val) => {
                          setValue("program", val);
                          if (val?.tahun && !watch("tahun")) {
                            const matchedT = tahunOptions.find(
                              (t) => String(t.Tahun || t.nama) === String(val.tahun)
                            );
                            if (matchedT) setValue("tahun", matchedT);
                          }
                        }}
                        placeholder="Pilih atau cari Program Kerja yang Dianalisis"
                      />
                      <p className="text-[11px] text-gray-500 mt-1 italic">
                        *Ketik untuk mencari program kerja atau tahun. Tahun program kerja disertakan pada setiap item.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Isu Internal / External */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Internal / External Issue <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          {...register("isu_internal_eksternal", { required: true })}
                          placeholder="Contoh: Perangkat kerja lama menurunkan produktivitas, perkembangan software baru memerlukan spesifikasi lebih tinggi..."
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                        />
                      </div>

                      {/* Risiko */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Pernyataan Potensi Risiko <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          {...register("deskripsi_risiko", { required: true })}
                          placeholder="Contoh: Keterlambatan pengadaan perangkat dan ketidaksesuaian spesifikasi operasional..."
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 2: Penilaian Risiko Awal */}
                  <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-100 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
                        <Activity className="w-4 h-4 text-purple-600" />
                        <span>2. Penilaian Risiko Awal (K × D = Nilai Risiko)</span>
                      </div>
                      <span className="text-[11px] font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        Matriks Matang
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Kemungkinan / Peluang (K) */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Kemungkinan / Peluang (K) <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register("kemungkinan_awal", { required: true })}
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          {kemungkinanOptions.map((opt) => (
                            <option key={opt.val} value={opt.val}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dampak (D) */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Dampak / Tingkat Kerugian (D) <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register("dampak_awal", { required: true })}
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          {dampakOptions.map((opt) => (
                            <option key={opt.val} value={opt.val}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Skor & Tingkat Risiko Awal */}
                      <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-xs flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-medium text-gray-500">Nilai & Tingkat Risiko</div>
                          <div className="text-lg font-black text-gray-900">
                            Skor: <span className="text-purple-700">{awalAnalysis.score}</span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${awalAnalysis.badgeColor}`}
                        >
                          {awalAnalysis.kode} - {awalAnalysis.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tindakan Mengatasi Risiko */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Tindakan Untuk Mengatasi Risiko (Mitigasi) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          {...register("tindakan_mitigasi", { required: true })}
                          placeholder="1. Membuat daftar kebutuhan teknis yang jelas&#10;2. Pengujian unit sebelum serah terima&#10;3. Koordinasi berkala..."
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition"
                        />
                      </div>

                      {/* Peluang Positif */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Peluang Positif (Opportunity)
                        </label>
                        <textarea
                          rows={3}
                          {...register("peluang")}
                          placeholder="Contoh: Meningkatkan efisiensi kerja staf, mempercepat layanan, keandalan sistem meningkat..."
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 3: Residu & Rencana Tindak Lanjut */}
                  <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/60 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                        <Layers className="w-4 h-4 text-amber-600" />
                        <span>3. Evaluasi Residu & Rencana Tindak Lanjut (RTL)</span>
                      </div>
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Setelah Mitigasi
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Kenyataan Yang Terjadi / Evaluasi Residu dan RTL
                      </label>
                      <textarea
                        rows={2}
                        {...register("kenyataan_residu")}
                        placeholder="Kenyataan setelah tindakan mitigasi dijalankan, kendala sisa yang dihadapi..."
                        className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Kemungkinan Residu */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Kemungkinan Residu (K)
                        </label>
                        <select
                          {...register("kemungkinan_residu")}
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                          <option value="">-- Kosong / Belum Dinilai --</option>
                          {kemungkinanOptions.map((opt) => (
                            <option key={opt.val} value={opt.val}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dampak Residu */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Dampak Residu (D)
                        </label>
                        <select
                          {...register("dampak_residu")}
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                          <option value="">-- Kosong / Belum Dinilai --</option>
                          {dampakOptions.map((opt) => (
                            <option key={opt.val} value={opt.val}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Skor & Tingkat Residu */}
                      <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-medium text-gray-500">Tingkat Residu</div>
                          <div className="text-lg font-black text-gray-900">
                            Skor: <span className="text-amber-700">{residuAnalysis.score}</span>
                          </div>
                        </div>
                        {residuAnalysis.kode ? (
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${residuAnalysis.badgeColor}`}
                          >
                            {residuAnalysis.kode} - {residuAnalysis.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">N/A</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Tindak Lanjut (Follow-Up Action)
                      </label>
                      <textarea
                        rows={2}
                        {...register("rencana_tindak_lanjut")}
                        placeholder="Langkah tindak lanjut lanjutan untuk mengendalikan sisa risiko..."
                        className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* PINNED FOOTER (Matching SwotFormModal) */}
                  <div className="shrink-0 px-6 py-4 bg-gray-50/80 border-t border-gray-150 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-300 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <>Menyimpan...</>
                      ) : (
                        <>
                          <span>{mode === "edit" ? "Perbarui Analisis" : "Simpan Analisis"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
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
