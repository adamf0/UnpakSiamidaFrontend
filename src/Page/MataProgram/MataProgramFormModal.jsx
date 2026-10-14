import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import {
  isEmpty,
  throwIfResponseNotOk,
  formatFetchError,
} from "@/Common/Utils";
import { apiClient } from "@/Common/api";

export default function MataProgramFormModal({
  open,
  mode,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const { getValidToken } = useAuth();
  const [tahunOptions, setTahunOptions] = useState([]);
  const [loadingTahun, setLoadingTahun] = useState(false);
  const [errorTahun, setErrorTahun] = useState(null);
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

  useEffect(() => {
    if (open) {
      fetchTahunOptions();
    }
  }, [open]);

  useEffect(() => {
    if (mode === "edit" && data) {
      const targetTahunUuid = data.TahunUuid || data.TahunUUID;
      const selectedTahun =
        tahunOptions.find((item) => item.UUID === targetTahunUuid) ||
        (targetTahunUuid && data.Tahun
          ? { id: targetTahunUuid, UUID: targetTahunUuid, nama: data.Tahun }
          : null);

      reset({
        tahun: selectedTahun,
        mataprogram: data.MataProgram ?? "",
      });
    } else {
      reset({
        tahun: null,
        mataprogram: "",
      });
    }
  }, [mode, data, open, tahunOptions, reset]);

  const onSubmit = async (form) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("tahun", form.tahun?.UUID ?? form.tahun?.id ?? "");
      fd.append("mataprogram", form.mataprogram ?? "");

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
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <Dialog.Title className="text-lg font-semibold mb-4">
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

                <TextInput
                  label="Mata Program"
                  required
                  placeholder="Masukkan nama mata program"
                  error={errors.mataprogram}
                  {...register("mataprogram", {
                    required: "Mata Program wajib diisi",
                  })}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-3 py-2 text-red-600 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
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
