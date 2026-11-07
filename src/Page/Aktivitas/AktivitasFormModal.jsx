import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import SearchSelect from "@/Components/SearchSelect";
import DateRangeInput from "@/Components/DateRangeInput";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import {
  isEmpty,
  throwIfResponseNotOk,
  formatFetchError,
} from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { CheckSquare, X } from "lucide-react";

const toDateInput = (val) => {
  if (!val) return "";
  return String(val).split("T")[0];
};

export default function AktivitasFormModal({
  open,
  mode,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const { user, getValidToken } = useAuth();
  const [mataProgramOptions, setMataProgramOptions] = useState([]);
  const [loadingMp, setLoadingMp] = useState(false);
  const [errorMp, setErrorMp] = useState(null);
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
      mata_program: null,
      aktivitas: "",
      pic: "",
      tanggal_rk_awal: "",
      tanggal_rk_akhir: "",
    },
  });

  const fetchOptions = async () => {
    setLoadingMp(true);
    setErrorMp(null);
    try {
      const resMp = await apiClient.get("/mataprograms?mode=all");
      const jsonMp = resMp.data;
      const mappedMp = (Array.isArray(jsonMp) ? jsonMp : []).map((item) => ({
        id: item.UUID,
        UUID: item.UUID,
        nama: item.Tahun
          ? `[${item.Tahun}] ${item.MataProgram}`
          : item.MataProgram,
        ...item,
      }));
      setMataProgramOptions(mappedMp);
    } catch (err) {
      console.error("Fetch opsi mata program gagal:", err);
      setErrorMp(formatFetchError(err, "Gagal memuat mata program"));
    } finally {
      setLoadingMp(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOptions();
    }
  }, [open]);

  useEffect(() => {
    if (mode === "edit" && data) {
      const targetMpUuid = data.MataProgramUuid || data.MataProgramUUID;
      const selectedMp =
        mataProgramOptions.find((item) => item.UUID === targetMpUuid) ||
        (targetMpUuid && data.MataProgram
          ? {
              id: targetMpUuid,
              UUID: targetMpUuid,
              nama: data.Tahun
                ? `[${data.Tahun}] ${data.MataProgram}`
                : data.MataProgram,
            }
          : null);

      reset({
        mata_program: selectedMp,
        aktivitas: data.Aktivitas ?? "",
        pic: data.PIC ?? "",
        tanggal_rk_awal: toDateInput(data.TanggalRKAwal),
        tanggal_rk_akhir: toDateInput(data.TanggalRKAkhir),
      });
    } else {
      reset({
        mata_program: null,
        aktivitas: "",
        pic: "",
        tanggal_rk_awal: "",
        tanggal_rk_akhir: "",
      });
    }
  }, [mode, data, open, mataProgramOptions, reset]);

  const onSubmit = async (form) => {
    if (isEmpty(getValidToken())) return;

    const fakultasUnitValue =
      user?.fakultas_unit ||
      user?.FakultasUnit ||
      data?.FakultasUnitUuid ||
      data?.FakultasUnitUUID ||
      data?.FakultasUnitId ||
      "";

    if (isEmpty(String(fakultasUnitValue))) {
      addToast("error", "Akun tidak memiliki Fakultas / Unit");
      return;
    }

    if (
      form.tanggal_rk_awal &&
      form.tanggal_rk_akhir &&
      new Date(form.tanggal_rk_akhir) < new Date(form.tanggal_rk_awal)
    ) {
      addToast(
        "error",
        "Tanggal akhir tidak boleh lebih kecil dari tanggal awal"
      );
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("fakultas_unit", String(fakultasUnitValue));
      fd.append(
        "mata_program",
        form.mata_program?.UUID ?? form.mata_program?.id ?? ""
      );
      fd.append("aktivitas", form.aktivitas ?? "");
      fd.append("pic", form.pic ?? "");
      fd.append("tanggal_rk_awal", form.tanggal_rk_awal ?? "");
      fd.append("tangga_rk_awal", form.tanggal_rk_awal ?? "");
      fd.append("target_rk_awal", form.tanggal_rk_awal ?? "");
      fd.append("tanggal_rk_akhir", form.tanggal_rk_akhir ?? "");
      fd.append("target_rk_akhir", form.tanggal_rk_akhir ?? "");

      if (mode === "edit") {
        await apiClient.put(`/aktivitasproker/${data.UUID}`, fd);
      } else {
        await apiClient.post("/aktivitasproker", fd);
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" />
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
            <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-bold text-gray-900">
                      {mode === "edit" ? "Edit" : "Tambah"} Aktivitas
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Kelola butir kegiatan dan target rencana pelaksanaan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <SearchSelect
                  label="Mata Program"
                  required
                  options={mataProgramOptions}
                  placeholder="Pilih mata program"
                  loading={loadingMp}
                  loadError={errorMp}
                  onRetry={fetchOptions}
                  value={watch("mata_program")}
                  error={errors.mata_program?.message}
                  onChange={(item) =>
                    setValue("mata_program", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("mata_program", {
                    required: "Mata Program wajib dipilih",
                  })}
                />

                <TextInput
                  label="Aktivitas"
                  required
                  placeholder="Masukkan nama aktivitas kegiatan"
                  error={errors.aktivitas?.message}
                  {...register("aktivitas", {
                    required: "Aktivitas wajib diisi",
                  })}
                />

                <TextInput
                  label="Penanggung Jawab (PIC)"
                  required
                  placeholder="Masukkan nama / unit PIC"
                  error={errors.pic?.message}
                  {...register("pic", {
                    required: "PIC wajib diisi",
                  })}
                />

                <DateRangeInput
                  label="Target Rencana Kegiatan"
                  required
                  start={register("tanggal_rk_awal", {
                    required: "Tanggal mulai wajib diisi",
                  })}
                  end={register("tanggal_rk_akhir", {
                    required: "Tanggal akhir wajib diisi",
                  })}
                  startError={errors.tanggal_rk_awal?.message}
                  endError={errors.tanggal_rk_akhir?.message}
                />

                <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50"
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
