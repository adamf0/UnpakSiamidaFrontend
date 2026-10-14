import React, { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import SearchSelect from "@/Components/SearchSelect";
import DateRangeInput from "@/Components/DateRangeInput";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import {
  isEmpty,
  formatTanggalIndo,
  renderLabelFakultasUnit,
} from "@/Common/Utils";
import { CheckSquare, FileText } from "lucide-react";

const STATUS_REALISASI_OPTIONS = [
  { id: "terlaksana", UUID: "terlaksana", nama: "Terlaksana" },
  { id: "belum_terlaksana", UUID: "belum_terlaksana", nama: "Belum Terlaksana" },
];

const toDateInput = (val) => {
  if (!val) return "";
  const str = String(val).split("T")[0];
  if (str.startsWith("0001-01-01")) return "";
  return str;
};

export default function PelaporanPelaksanaanVerifikasiModal({
  open,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const { getValidToken } = useAuth();
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
      status_realisasi: null,
      target_r_awal: "",
      target_r_akhir: "",
      detail: "",
    },
  });

  useEffect(() => {
    if (open && data) {
      const currentStatusId = (data.StatusRealisasi || "").trim().toLowerCase();
      const selectedStatus =
        STATUS_REALISASI_OPTIONS.find((item) => item.id === currentStatusId) || null;

      reset({
        status_realisasi: selectedStatus,
        target_r_awal: toDateInput(data.TanggalRAwal),
        target_r_akhir: toDateInput(data.TanggalRAkhir),
        detail: data.Detail ?? "",
      });
    }
  }, [open, data, reset]);

  const onSubmit = async (form) => {
    if (isEmpty(getValidToken()) || !data?.UUID) return;

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
      fd.append("status_realisasi", form.status_realisasi?.id ?? "");
      fd.append("target_r_awal", form.target_r_awal ?? "");
      fd.append("tanggal_r_awal", form.target_r_awal ?? "");
      fd.append("target_r_akhir", form.target_r_akhir ?? "");
      fd.append("tanggal_r_akhir", form.target_r_akhir ?? "");
      fd.append("detail", form.detail ?? "");

      const res = await fetch(
        `http://localhost:3000/pelaporanpelaksanaan/${data.UUID}`,
        {
          method: "PUT",
          body: fd,
          headers: {
            Authorization: `Bearer ${getValidToken()}`,
          },
        }
      );

      const json = await res.json();

      if (!res.ok) {
        addToast(
          "error",
          json.message || json.Message || "Gagal menyimpan verifikasi"
        );
        return;
      }

      addToast("success", "Berhasil verifikasi pelaporan pelaksanaan");
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
            <Dialog.Panel className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <Dialog.Title className="text-lg font-bold text-gray-800">
                  Verifikasi Pelaporan Pelaksanaan
                </Dialog.Title>
              </div>

              {data && (
                <div className="space-y-4 mb-6">
                  {/* Planned Info Card */}
                  <div className="bg-purple-50/60 border border-purple-100 rounded-lg p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wide">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Rencana Kegiatan (Planned)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 block">Tahun / Mata Program</span>
                        <span className="font-medium text-gray-900">
                          {data.Tahun ? `[${data.Tahun}] ` : ""}
                          {data.MataProgram || "-"}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500 block">Fakultas / Unit</span>
                        <span className="font-medium text-gray-900">
                          {renderLabelFakultasUnit(data) || "-"}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500 block">Aktivitas</span>
                        <span className="font-medium text-gray-900">
                          {data.Aktivitas || "-"}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500 block">PIC</span>
                        <span className="font-medium text-gray-900">
                          {data.PIC || "-"}
                        </span>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-xs text-gray-500 block">Target Rencana Kegiatan (RK)</span>
                        <span className="font-medium text-gray-800">
                          {formatTanggalIndo(data.TanggalRKAwal)} s/d {formatTanggalIndo(data.TanggalRKAkhir)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Verification & Realization Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">
                    Status & Realisasi Pelaksanaan
                  </h4>

                  <div className="space-y-4">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Detail Pelaporan Pelaksanaan <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Masukkan detail pelaporan / verifikasi"
                        {...register("detail", {
                          required: "Detail Pelaporan wajib diisi",
                        })}
                        className={`w-full px-3 py-2 text-sm rounded border outline-none transition ${
                          errors.detail
                            ? "border-red-500 focus:ring-0"
                            : "border-gray-300 focus:ring-2 focus:ring-emerald-500"
                        }`}
                      />
                      {errors.detail?.message && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.detail.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium text-sm disabled:opacity-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium text-sm disabled:opacity-50 transition shadow-xs"
                  >
                    {submitting ? "Menyimpan..." : "Simpan Verifikasi"}
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
