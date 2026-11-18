import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import {
  isEmpty,
  throwIfResponseNotOk,
  formatFetchError,
  fetchFakultasUnits,
} from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { ShieldCheck, AlertTriangle, TrendingUp, AlertCircle, Building2, Calendar, X } from "lucide-react";

const KATEGORI_OPTIONS = [
  {
    id: "Kekuatan",
    label: "Kekuatan (Strength)",
    desc: "Kekuatan internal unit/fakultas",
    color: "emerald",
    icon: ShieldCheck,
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500",
  },
  {
    id: "Kelemahan",
    label: "Kelemahan (Weakness)",
    desc: "Kelemahan internal yang perlu diperbaiki",
    color: "rose",
    icon: AlertCircle,
    badgeBg: "bg-rose-50 text-rose-700 border-rose-300 ring-rose-500",
  },
  {
    id: "Peluang",
    label: "Peluang (Opportunity)",
    desc: "Faktor eksternal yang dapat dimanfaatkan",
    color: "blue",
    icon: TrendingUp,
    badgeBg: "bg-blue-50 text-blue-700 border-blue-300 ring-blue-500",
  },
  {
    id: "Ancaman",
    label: "Ancaman (Threat)",
    desc: "Faktor eksternal yang menjadi hambatan/risiko",
    color: "amber",
    icon: AlertTriangle,
    badgeBg: "bg-amber-50 text-amber-700 border-amber-300 ring-amber-500",
  },
];

export default function SwotFormModal({
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

  const [tahunOptions, setTahunOptions] = useState([]);
  const [loadingTahun, setLoadingTahun] = useState(false);

  const [fakultasOptions, setFakultasOptions] = useState([]);
  const [loadingFakultas, setLoadingFakultas] = useState(false);

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
      kategori: "Kekuatan",
      faktor: "",
    },
  });

  const selectedKategori = watch("kategori");

  const fetchTahunOptions = async () => {
    setLoadingTahun(true);
    try {
      const res = await apiClient.get("/tahunprokers?mode=all");
      const json = res.data;
      const mapped = (Array.isArray(json) ? json : []).map((item) => ({
        id: item.UUID,
        UUID: item.UUID,
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
      console.error("Fetch fakultas unit gagal:", err);
    } finally {
      setLoadingFakultas(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTahunOptions();
      fetchFakultasOptions();
    }
  }, [open]);

  // Filter options for non-admin to assigned units
  const availableFakultasOptions = useMemo(() => {
    if (isAdmin) return fakultasOptions;
    if (fakultasOptions.length === 0) {
      if (userUnit) return [userUnit];
      return [];
    }

    const assignedIds = new Set();
    const assignedNames = new Set();

    if (userUnit?.id) assignedIds.add(String(userUnit.id));
    if (userUnit?.UUID) assignedIds.add(String(userUnit.UUID));
    if (userUnit?.rawId) assignedIds.add(String(userUnit.rawId));
    if (user?.fakultas_unit) assignedIds.add(String(user?.fakultas_unit));
    if (user?.id_fakultas_unit) assignedIds.add(String(user?.id_fakultas_unit));
    if (user?.FakultasUnit) assignedIds.add(String(user?.FakultasUnit));
    if (user?.uuid_fakultas_unit) assignedIds.add(String(user?.uuid_fakultas_unit));

    if (userUnit?.nama) assignedNames.add(userUnit.nama.toLowerCase().trim());
    if (user?.nama_fakultas_unit) assignedNames.add(user.nama_fakultas_unit.toLowerCase().trim());
    if (user?.NamaFakultasUnit) assignedNames.add(user.NamaFakultasUnit.toLowerCase().trim());

    if (Array.isArray(user?.extra_role)) {
      user.extra_role.forEach((r) => {
        const uId = r.id_fakultas_unit ?? r.IdFakultasUnit ?? r.uuid_fakultas_unit;
        if (uId) assignedIds.add(String(uId));
        const uName = r.nama_fakultas_unit ?? r.NamaFakultasUnit;
        if (uName) assignedNames.add(String(uName).toLowerCase().trim());
      });
    }

    const filtered = fakultasOptions.filter((opt) => {
      const optId = String(opt.id || opt.UUID || opt.rawId || "");
      const optName = String(opt.nama || opt.label || "").toLowerCase().trim();
      if (assignedIds.has(optId)) return true;
      if (opt.rawId && assignedIds.has(String(opt.rawId))) return true;
      if (opt.UUID && assignedIds.has(String(opt.UUID))) return true;
      if (optName && assignedNames.has(optName)) return true;
      return false;
    });

    if (filtered.length > 0) return filtered;
    if (userUnit) return [userUnit];
    return [];
  }, [isAdmin, fakultasOptions, user, userUnit]);

  // Sync form values on open / data change
  useEffect(() => {
    if (open) {
      if (mode === "edit" && data) {
        const targetTahunUuid = data.TahunUuid || data.TahunUUID;
        const selectedTahun =
          tahunOptions.find((item) => item.UUID === targetTahunUuid) ||
          (targetTahunUuid && data.Tahun
            ? { id: targetTahunUuid, UUID: targetTahunUuid, nama: data.Tahun }
            : null);

        const targetUnitUuid = data.UuidFakultasUnit;
        const selectedUnit =
          availableFakultasOptions.find(
            (item) =>
              item.UUID === targetUnitUuid ||
              String(item.rawId) === String(data.IdFakultasUnit) ||
              String(item.id) === String(data.IdFakultasUnit)
          ) ||
          fakultasOptions.find(
            (item) =>
              item.UUID === targetUnitUuid ||
              String(item.rawId) === String(data.IdFakultasUnit) ||
              String(item.id) === String(data.IdFakultasUnit)
          ) ||
          (data.NamaFakultasUnit
            ? {
                id: targetUnitUuid || data.IdFakultasUnit,
                UUID: targetUnitUuid,
                nama: data.NamaFakultasUnit,
              }
            : null);

        reset({
          tahun: selectedTahun,
          fakultas_unit: selectedUnit,
          kategori: data.Kategori || "Kekuatan",
          faktor: data.Faktor || "",
        });
      } else {
        // Mode new
        const defaultUnit =
          !isAdmin && availableFakultasOptions.length > 0
            ? availableFakultasOptions[0]
            : null;

        reset({
          tahun: tahunOptions[0] || null,
          fakultas_unit: defaultUnit,
          kategori: "Kekuatan",
          faktor: "",
        });
      }
    }
  }, [mode, data, open, tahunOptions, availableFakultasOptions, fakultasOptions, isAdmin, reset]);

  const onSubmit = async (form) => {
    const token = getValidToken();
    if (isEmpty(token)) return;

    if (!form.tahun) {
      addToast("error", "Pilih Tahun terlebih dahulu");
      return;
    }

    if (isAdmin && !form.fakultas_unit && mode === "new") {
      addToast("error", "Pilih Fakultas / Unit terlebih dahulu");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("tahun_uuid", form.tahun?.UUID || form.tahun?.id || "");
      fd.append("tahun", form.tahun?.nama || form.tahun?.Tahun || "");
      fd.append("kategori", form.kategori || "Kekuatan");
      fd.append("faktor", form.faktor || "");

      if (form.fakultas_unit) {
        fd.append(
          "fakultas_unit",
          form.fakultas_unit.UUID || form.fakultas_unit.id || ""
        );
      } else {
        const myUnit = userUnit?.UUID || userUnit?.id || user?.fakultas_unit || "";
        if (myUnit) {
          fd.append("fakultas_unit", String(myUnit));
        }
      }

      if (mode === "edit") {
        await apiClient.put(`/swot/${data.UUID}`, fd);
      } else {
        await apiClient.post("/swot", fd);
      }

      addToast(
        "success",
        mode === "edit"
          ? "Berhasil memperbarui analisis SWOT"
          : "Berhasil menambahkan analisis SWOT"
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      addToast(
        "error",
        `Layanan tidak dapat dihubungi (${err?.message || "Network Error"})`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-5">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-150"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            {/* Modal Box: bounded height (not full height), flex-col with pinned header and pinned footer */}
            <Dialog.Panel className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-150 overflow-hidden">
              {/* PINNED HEADER */}
              <div className="shrink-0 px-6 py-4 border-b border-gray-150 bg-white flex items-center justify-between">
                <div>
                  <Dialog.Title className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span>
                      {mode === "edit" ? "Edit Analisis SWOT" : "Tambah Analisis SWOT Baru"}
                    </span>
                  </Dialog.Title>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isAdmin
                      ? "Sebagai Admin, Anda dapat mengelola SWOT untuk seluruh fakultas/unit."
                      : `Analisis SWOT khusus untuk unit kerja Anda${
                          watch("fakultas_unit")?.nama
                            ? ` (${watch("fakultas_unit").nama})`
                            : userUnit?.nama
                            ? ` (${userUnit.nama})`
                            : ""
                        }.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* FORM CONTAINER WRAPPING SCROLLABLE BODY AND PINNED FOOTER */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* SCROLLABLE BODY */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Baris 1: Tahun & Fakultas/Unit */}
                  <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span>Unit Kerja & Periode</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <SearchSelect
                          label="Tahun Periode"
                          required
                          options={tahunOptions}
                          placeholder="Pilih Tahun"
                          loading={loadingTahun}
                          value={watch("tahun")}
                          onChange={(item) => setValue("tahun", item)}
                        />
                      </div>

                      <div>
                        <SearchSelect
                          label="Fakultas / Unit Kerja"
                          required
                          icon={Building2}
                          options={availableFakultasOptions}
                          placeholder="Pilih Fakultas / Unit"
                          loading={loadingFakultas}
                          disabled={!isAdmin && availableFakultasOptions.length <= 1}
                          value={watch("fakultas_unit")}
                          onChange={(item) => setValue("fakultas_unit", item)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Baris 2: Kategori SWOT */}
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-800">
                      Kategori SWOT <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {KATEGORI_OPTIONS.map((kat) => {
                        const Icon = kat.icon;
                        const isSelected = selectedKategori === kat.id;
                        return (
                          <button
                            key={kat.id}
                            type="button"
                            onClick={() => setValue("kategori", kat.id)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                              isSelected
                                ? `${kat.badgeBg} ring-2 shadow-xs font-semibold`
                                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <Icon className={`w-5 h-5 mb-1 ${isSelected ? "" : "text-gray-400"}`} />
                            <span className="text-xs font-medium leading-tight">{kat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Baris 3: Nama Faktor */}
                  <div>
                    <TextInput
                      label="Faktor SWOT"
                      required
                      placeholder="Contoh: Kualifikasi Dosen S3, Fasilitas Lab Jaringan, Kerjasama Industri"
                      {...register("faktor", { required: "Faktor SWOT wajib diisi" })}
                      error={errors.faktor}
                    />
                  </div>

                </div>

                {/* PINNED FOOTER (ALWAYS VISIBLE, NEVER CUT OFF) */}
                <div className="shrink-0 px-6 py-3.5 border-t border-gray-150 bg-gray-50 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 rounded-xl hover:bg-purple-800 transition shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting && (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{mode === "edit" ? "Perbarui Analisis" : "Simpan Analisis SWOT"}</span>
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
