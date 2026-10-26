import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import {
  isEmpty,
  renderLabelFakultasUnit,
  formatFetchError,
  fetchFakultasUnits,
} from "@/Common/Utils";
import { apiClient } from "@/Common/api";

export default function MataProgramFormModal({
  open,
  mode,
  data,
  onClose,
  onSuccess,
  defaultYear,
  defaultUnit,
  isAdmin,
}) {
  const { addToast } = useToast();
  const { getValidToken } = useAuth();
  const [tahunOptions, setTahunOptions] = useState([]);
  const [loadingTahun, setLoadingTahun] = useState(false);
  const [errorTahun, setErrorTahun] = useState(null);

  const [unitOptions, setUnitOptions] = useState([]);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [errorUnit, setErrorUnit] = useState(null);

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
      mataprogram: "",
    },
  });

  const fetchTahunOptions = async () => {
    setLoadingTahun(true);
    setErrorTahun(null);
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
      console.error("Fetch master tahun gagal:", err);
      setErrorTahun(formatFetchError(err, "Gagal memuat master tahun"));
    } finally {
      setLoadingTahun(false);
    }
  };

  const fetchUnitOptions = async () => {
    setLoadingUnit(true);
    setErrorUnit(null);
    try {
      const opts = await fetchFakultasUnits();
      setUnitOptions(opts);
    } catch (err) {
      console.error("Fetch master unit gagal:", err);
      setErrorUnit(formatFetchError(err, "Gagal memuat unit / fakultas"));
    } finally {
      setLoadingUnit(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTahunOptions();
      fetchUnitOptions();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && data) {
      const targetTahunUuid = data.TahunUuid || data.TahunUUID;
      const selectedTahun =
        tahunOptions.find(
          (item) =>
            item.UUID === targetTahunUuid ||
            String(item.Tahun) === String(data.Tahun)
        ) ||
        (targetTahunUuid && data.Tahun
          ? { id: targetTahunUuid, UUID: targetTahunUuid, nama: data.Tahun }
          : null);

      const targetUnitId = data.FakultasUnitId;
      const targetUnitUuid = data.FakultasUnitUuid;
      const selectedUnit =
        unitOptions.find(
          (u) =>
            (targetUnitId && String(u.id) === String(targetUnitId)) ||
            (targetUnitUuid && u.UUID === targetUnitUuid) ||
            (data.FakultasUnit && u.nama === data.FakultasUnit)
        ) ||
        (data.FakultasUnit
          ? {
              id: targetUnitId || targetUnitUuid,
              UUID: targetUnitUuid,
              nama: data.FakultasUnit,
            }
          : null);

      reset({
        tahun: selectedTahun,
        fakultas_unit: selectedUnit,
        mataprogram: data.MataProgram ?? "",
      });
    } else {
      // mode === "new"
      const preselectedTahun =
        tahunOptions.find(
          (item) =>
            defaultYear &&
            defaultYear !== "all" &&
            String(item.Tahun || item.nama) === String(defaultYear)
        ) || null;

      const preselectedUnit =
        unitOptions.find(
          (u) =>
            defaultUnit &&
            (String(u.id) === String(defaultUnit) ||
              u.UUID === defaultUnit ||
              String(u.nama_fak_prod_unit).toLowerCase() ===
                String(defaultUnit).toLowerCase())
        ) ||
        (defaultUnit
          ? { id: defaultUnit, UUID: defaultUnit, nama: `Unit (${defaultUnit})` }
          : null);

      reset({
        tahun: preselectedTahun,
        fakultas_unit: preselectedUnit,
        mataprogram: "",
      });
    }
  }, [mode, data, open, tahunOptions, unitOptions, defaultYear, defaultUnit, reset]);

  const onSubmit = async (form) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("tahun", form.tahun?.UUID ?? form.tahun?.id ?? "");
      fd.append("mataprogram", form.mataprogram ?? "");

      const resolvedUnitVal =
        form.fakultas_unit?.id ??
        form.fakultas_unit?.UUID ??
        (defaultUnit ? String(defaultUnit) : "");

      if (resolvedUnitVal) {
        fd.append("id_fakultas_unit", String(resolvedUnitVal));
        fd.append("fakultas_unit", String(resolvedUnitVal));
        fd.append("target", String(resolvedUnitVal));
      }

      if (mode === "edit") {
        await apiClient.put(`/mataprogram/${data.UUID}`, fd);
      } else {
        await apiClient.post("/mataprogram", fd);
      }

      addToast(
        "success",
        mode === "edit" ? "Berhasil update data" : "Berhasil simpan data"
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      addToast(
        "error",
        err?.message || "Layanan tidak dapat dihubungi"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUnitLabel =
    watch("fakultas_unit")?.nama ||
    (unitOptions.find(
      (u) =>
        defaultUnit &&
        (String(u.id) === String(defaultUnit) || u.UUID === defaultUnit)
    )?.nama) ||
    (defaultUnit ? `Unit #${defaultUnit}` : "Semua Unit");

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
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-150"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
              <Dialog.Title className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                {mode === "edit" ? "Edit" : "Tambah"} Mata Program
              </Dialog.Title>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <SearchSelect
                  label="Tahun"
                  required
                  options={tahunOptions}
                  placeholder="Pilih tahun"
                  loading={loadingTahun}
                  loadError={errorTahun}
                  onRetry={fetchTahunOptions}
                  value={watch("tahun")}
                  error={errors.tahun?.message}
                  onChange={(item) =>
                    setValue("tahun", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("tahun", {
                    required: "Tahun wajib dipilih",
                  })}
                />

                {isAdmin ? (
                  <SearchSelect
                    label="Fakultas / Prodi / Unit"
                    options={unitOptions}
                    placeholder="Pilih target fakultas / prodi / unit"
                    loading={loadingUnit}
                    loadError={errorUnit}
                    onRetry={fetchUnitOptions}
                    value={watch("fakultas_unit")}
                    onChange={(item) =>
                      setValue("fakultas_unit", item, {
                        shouldValidate: true,
                      })
                    }
                  />
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                      Target Unit / Sasaran
                    </label>
                    <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800">
                      {selectedUnitLabel}
                    </div>
                  </div>
                )}

                <TextInput
                  label="Mata Program"
                  required
                  placeholder="Masukkan nama mata program"
                  error={errors.mataprogram}
                  {...register("mataprogram", {
                    required: "Mata Program wajib diisi",
                  })}
                />

                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Menyimpan..." : "Simpan"}
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
