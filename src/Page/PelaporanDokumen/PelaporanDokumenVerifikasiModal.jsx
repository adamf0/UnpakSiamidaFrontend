import React, { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";
import { apiClient, API_BASE_URL } from "@/Common/api";
import { CheckSquare, X } from "lucide-react";

const LIST_STATUS_VERIFIKASI = [
  { id: "terverifikasi", UUID: "terverifikasi", nama: "Terverifikasi" },
  { id: "gagal_terverifikasi", UUID: "gagal_terverifikasi", nama: "Gagal Terverifikasi" },
  { id: "belum_terverifikasi", UUID: "belum_terverifikasi", nama: "Belum Terverifikasi" },
];

export default function PelaporanDokumenVerifikasiModal({
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
      status_verifikasi: null,
      catatan: "",
    },
  });

  const selectedStatus = watch("status_verifikasi");

  useEffect(() => {
    if (open && data) {
      const currentStatusId = (data.Status || "").trim().toLowerCase();
      const currentStatus =
        LIST_STATUS_VERIFIKASI.find((s) => s.id === currentStatusId) ||
        (currentStatusId
          ? { id: currentStatusId, UUID: currentStatusId, nama: currentStatusId }
          : null);

      reset({
        status_verifikasi: currentStatus,
        catatan: data.Catatan ?? "",
      });
    }
  }, [open, data, reset]);

  const onSubmit = async (form) => {
    if (isEmpty(getValidToken()) || !data?.UUID) return;

    const statusValue = form.status_verifikasi?.id ?? "";
    if (statusValue === "gagal_terverifikasi" && !form.catatan?.trim()) {
      addToast("error", "Catatan wajib diisi jika status Gagal Terverifikasi");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("status_verifikasi", statusValue);
      fd.append("catatan", form.catatan ?? "");

      await apiClient.put(`/pelaporandokumen/${data.UUID}/verifikasi`, fd);

      addToast("success", "Berhasil verifikasi pelaporan dokumen");
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

  const fileUrl = data?.File
    ? `${API_BASE_URL}/upload/pelaporan_dokumen/${data.File}`
    : null;

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
            <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-bold text-gray-900">
                      Verifikasi Pelaporan Dokumen
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Periksa kelengkapan dan keabsahan berkas bukti dukung
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

              {data && (
                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 mb-5 text-xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500 block">Mata Program:</span>
                      <span className="font-semibold text-gray-900">{data.MataProgram || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Jenis Dokumen:</span>
                      <span className="font-semibold text-gray-900">{data.JenisDokumen || "-"}</span>
                    </div>
                    {data.FakultasUnit && (
                      <div>
                        <span className="text-gray-500 block">Fakultas / Unit:</span>
                        <span className="font-semibold text-gray-900">{data.FakultasUnit}</span>
                      </div>
                    )}
                    {fileUrl && (
                      <div>
                        <span className="text-gray-500 block">Berkas Terunggah:</span>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-700 hover:text-purple-900 underline font-medium"
                        >
                          {data.File} (Buka file)
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <SearchSelect
                  label="Status Verifikasi"
                  required
                  options={LIST_STATUS_VERIFIKASI}
                  placeholder="Pilih status verifikasi"
                  value={watch("status_verifikasi")}
                  error={errors.status_verifikasi?.message}
                  onChange={(item) =>
                    setValue("status_verifikasi", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("status_verifikasi", {
                    required: "Status verifikasi wajib dipilih",
                  })}
                />

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Catatan Verifikasi{" "}
                    {selectedStatus?.id === "gagal_terverifikasi" && (
                      <span className="text-rose-500">*</span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Masukkan catatan evaluasi (wajib diisi jika status Gagal Terverifikasi)"
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white outline-none transition ${
                      errors.catatan
                        ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                        : "border-gray-200 focus:border-purple-600 focus:ring-3 focus:ring-purple-600/15"
                    }`}
                    {...register("catatan", {
                      validate: (val) => {
                        if (
                          selectedStatus?.id === "gagal_terverifikasi" &&
                          !val?.trim()
                        ) {
                          return "Catatan wajib diisi jika gagal terverifikasi";
                        }
                        return true;
                      },
                    })}
                  />
                  {errors.catatan && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.catatan.message}
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
