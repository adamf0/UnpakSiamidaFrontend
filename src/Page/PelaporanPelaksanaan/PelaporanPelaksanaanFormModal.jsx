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
  formatTanggalIndo,
} from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { ClipboardCheck, X } from "lucide-react";

const STATUS_REALISASI_OPTIONS = [
  { id: "terlaksana", nama: "Terlaksana" },
  { id: "belum_terlaksana", nama: "Belum Terlaksana" },
];

const toDateInput = (val) => {
  if (!val) return "";
  const str = String(val).split("T")[0];
  if (str.startsWith("0001-01-01")) return "";
  return str;
};

export default function PelaporanPelaksanaanFormModal({
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

  const isEdit = mode === "edit";

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
      status_realisasi: null,
      target_r_awal: "",
      target_r_akhir: "",
      detail: "",
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

      const selectedStatus =
        STATUS_REALISASI_OPTIONS.find(
          (item) => item.id === data.StatusRealisasi
        ) || null;

      reset({
        mata_program: selectedMp,
        aktivitas: data.Aktivitas ?? "",
        pic: data.PIC ?? "",
        tanggal_rk_awal: toDateInput(data.TanggalRKAwal),
        tanggal_rk_akhir: toDateInput(data.TanggalRKAkhir),
        status_realisasi: selectedStatus,
        target_r_awal: toDateInput(data.TanggalRAwal),
        target_r_akhir: toDateInput(data.TanggalRAkhir),
        detail: data.Detail ?? "",
      });
    } else {
      reset({
        mata_program: null,
        aktivitas: "",
        pic: "",
        tanggal_rk_awal: "",
        tanggal_rk_akhir: "",
        status_realisasi: null,
        target_r_awal: "",
        target_r_akhir: "",
        detail: "",
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
      !isEdit &&
      form.tanggal_rk_awal &&
      form.tanggal_rk_akhir &&
      new Date(form.tanggal_rk_akhir) < new Date(form.tanggal_rk_awal)
    ) {
      addToast(
        "error",
        "Tanggal RK akhir tidak boleh lebih kecil dari tanggal RK awal"
      );
      return;
    }

    if (
      form.target_r_awal &&
      form.target_r_akhir &&
      new Date(form.target_r_akhir) < new Date(form.target_r_awal)
    ) {
      addToast(
        "error",
        "Target Realisasi Akhir tidak boleh lebih kecil dari Target Realisasi Awal"
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
      fd.append("target_rk_awal", form.tanggal_rk_awal ?? "");
      fd.append("tanggal_rk_akhir", form.tanggal_rk_akhir ?? "");
      fd.append("target_rk_akhir", form.tanggal_rk_akhir ?? "");
      fd.append("status_realisasi", form.status_realisasi?.id ?? "");
      fd.append("target_r_awal", form.target_r_awal ?? "");
      fd.append("tanggal_r_awal", form.target_r_awal ?? "");
      fd.append("target_r_akhir", form.target_r_akhir ?? "");
      fd.append("tanggal_r_akhir", form.target_r_akhir ?? "");
      fd.append("detail", form.detail ?? "");

      if (isEdit) {
        await apiClient.put(`/pelaporanpelaksanaan/${data.UUID}`, fd);
      } else {
        await apiClient.post("/pelaporanpelaksanaan", fd);
      }

      addToast(
        "success",
        isEdit ? "Berhasil update data" : "Berhasil simpan data"
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
                    <ClipboardCheck className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-bold text-gray-900">
                      {isEdit ? "Laporkan Pelaksanaan" : "Tambah Pelaporan Pelaksanaan"}
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Catat realisasi dan progres pelaksanaan aktivitas
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

              {isEdit && data && (
                <div className="bg-purple-50/60 border border-purple-100 rounded-lg p-3.5 mb-4 text-xs space-y-2">
                  <div className="font-semibold text-purple-700 uppercase tracking-wide">
                    Rencana Kegiatan (Planned)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                    <div>
                      <span className="text-gray-500 block">Mata Program:</span>
                      <span className="font-medium text-gray-900">
                        {data.Tahun ? `[${data.Tahun}] ` : ""}
                        {data.MataProgram || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Aktivitas:</span>
                      <span className="font-medium text-gray-900">{data.Aktivitas || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">PIC:</span>
                      <span className="font-medium text-gray-900">{data.PIC || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Target RK:</span>
                      <span className="font-medium text-gray-900">
                        {formatTanggalIndo(data.TanggalRKAwal)} s/d {formatTanggalIndo(data.TanggalRKAkhir)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {!isEdit && (
                  <>
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
                        validate: (val) =>
                          !isEmpty(val) || "Mata Program wajib dipilih",
                      })}
                    />

                    <TextInput
                      label="Aktivitas"
                      required
                      placeholder="Masukkan aktivitas"
                      error={errors.aktivitas}
                      {...register("aktivitas", {
                        validate: (val) =>
                          !isEmpty(val) || "Aktivitas wajib diisi",
                      })}
                    />

                    <TextInput
                      label="PIC"
                      required
                      placeholder="Masukkan PIC"
                      error={errors.pic}
                      {...register("pic", {
                        validate: (val) =>
                          !isEmpty(val) || "PIC wajib diisi",
                      })}
                    />

                    <DateRangeInput
                      label="Target Rencana Kegiatan"
                      required
                      start={register("tanggal_rk_awal", {
                        validate: (val) =>
                          !isEmpty(val) || "Tanggal RK awal wajib diisi",
                      })}
                      end={register("tanggal_rk_akhir", {
                        validate: (val) =>
                          !isEmpty(val) || "Tanggal RK akhir wajib diisi",
                      })}
                      startError={errors.tanggal_rk_awal?.message}
                      endError={errors.tanggal_rk_akhir?.message}
                    />
                  </>
                )}

                <SearchSelect
                  label="Status Realisasi"
                  required
                  options={STATUS_REALISASI_OPTIONS}
                  placeholder="Pilih status realisasi"
                  value={watch("status_realisasi")}
                  error={errors.status_realisasi?.message}
                  onChange={(item) =>
                    setValue("status_realisasi", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("status_realisasi", {
                    required: "Status Realisasi wajib dipilih",
                  })}
                />

                <DateRangeInput
                  label="Target Realisasi"
                  required
                  start={register("target_r_awal", {
                    required: "Target Realisasi Awal wajib diisi",
                  })}
                  end={register("target_r_akhir", {
                    required: "Target Realisasi Akhir wajib diisi",
                  })}
                  startError={errors.target_r_awal?.message}
                  endError={errors.target_r_akhir?.message}
                />

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Detail Pelaporan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Masukkan detail progres dan hasil pelaksanaan kegiatan"
                    {...register("detail", {
                      required: "Detail Pelaporan wajib diisi",
                    })}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white outline-none transition ${
                      errors.detail
                        ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                        : "border-gray-200 focus:border-purple-600 focus:ring-3 focus:ring-purple-600/15"
                    }`}
                  />
                  {errors.detail?.message && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.detail.message}
                    </p>
                  )}
                </div>

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
