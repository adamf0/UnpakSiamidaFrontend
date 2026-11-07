import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { Calendar, X } from "lucide-react";

export default function MasterTahunFormModal({
  open,
  mode,
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
    formState: { errors },
  } = useForm({
    defaultValues: {
      tahun: "",
      status: "aktif",
    },
  });

  useEffect(() => {
    if (mode === "edit" && data) {
      reset({
        tahun: data.Tahun ?? "",
        status: data.Status ?? "aktif",
      });
    } else {
      reset({
        tahun: "",
        status: "aktif",
      });
    }
  }, [mode, data, open, reset]);

  const onSubmit = async (form) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("tahun", form.tahun);
      fd.append("status", form.status);

      if (mode === "edit") {
        await apiClient.put(`/tahunproker/${data.UUID}`, fd);
      } else {
        await apiClient.post("/tahunproker", fd);
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
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-150">
              <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-bold text-gray-900">
                      {mode === "edit" ? "Edit" : "Tambah"} Master Tahun
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Kelola periode tahun akademik program kerja
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
                <TextInput
                  type="number"
                  label="Tahun"
                  required
                  placeholder="Contoh: 2025"
                  error={errors.tahun?.message}
                  {...register("tahun", {
                    required: "Tahun wajib diisi",
                  })}
                />

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Status Periode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    {...register("status", {
                      required: "Status wajib dipilih",
                    })}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white outline-none transition cursor-pointer ${
                      errors.status
                        ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                        : "border-gray-200 focus:border-purple-600 focus:ring-3 focus:ring-purple-600/15"
                    }`}
                  >
                    <option value="">-- Pilih Status --</option>
                    <option value="aktif">Aktif</option>
                    <option value="non-aktif">Non-Aktif</option>
                  </select>
                  {errors.status?.message && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.status.message}
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
