import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import { useToast } from "@/Providers/ToastProvider";
import { apiClient } from "@/Common/api";
import { Pencil, X } from "lucide-react";

const TYPE_LABEL = {
  fakultas: "Fakultas",
  prodi: "Program Studi",
  unit: "Unit",
};

export default function ManajemenTargetRenameModal({
  open,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { nama: "" } });

  useEffect(() => {
    if (open && data) {
      reset({ nama: data.NamaRaw || data.Nama || "" });
    } else if (!open) {
      reset({ nama: "" });
    }
  }, [open, data, reset]);

  const onSubmit = async (form) => {
    if (!data?.UUID) return;
    const trimmed = String(form.nama || "").trim();
    if (!trimmed) {
      addToast("error", "Nama target wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.put(`/fakultasunit/${data.UUID}`, {
        nama: trimmed,
      });
      const updated = res?.data ?? null;
      addToast("success", "Nama target berhasil diperbarui");
      onSuccess?.(updated, data.UUID, trimmed);
      onClose();
    } catch (err) {
      addToast(
        "error",
        err?.response?.data?.Message ||
          err?.message ||
          "Gagal memperbarui nama target"
      );
    } finally {
      setSaving(false);
    }
  };

  const typeKey = String(data?.Type || "").toLowerCase();
  const typeLabel = TYPE_LABEL[typeKey] || data?.Type || "-";

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => {
          if (!saving) onClose();
        }}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-150">
              <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
                    <Pencil className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-bold text-gray-900">
                      Ubah Nama Target
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Perbarui nama tampilan pada tabel sijamu_fakultas_unit
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
                  aria-label="Tutup modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {data && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200/80 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">
                    {typeLabel}
                  </span>
                  {data.Jenjang && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 font-semibold uppercase text-[11px]">
                      {data.Jenjang}
                    </span>
                  )}
                  {data.KodeFakultas && (
                    <span className="text-gray-500">
                      Kode: <strong className="text-gray-700">{data.KodeFakultas}</strong>
                    </span>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <TextInput
                    label="Nama Target"
                    required
                    placeholder="Masukkan nama target baru"
                    error={errors.nama?.message}
                    {...register("nama", {
                      required: "Nama target wajib diisi",
                      validate: (v) =>
                        String(v || "").trim() !== "" ||
                        "Nama target tidak boleh kosong",
                      maxLength: {
                        value: 100,
                        message: "Maksimal 100 karakter",
                      },
                    })}
                  />
                  {typeKey === "prodi" && data?.Jenjang && (
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Jenjang ({String(data.Jenjang).toUpperCase()}) ditambahkan otomatis pada tampilan daftar target.
                    </p>
                  )}
                </div>

                <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-60"
                  >
                    {saving && (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{saving ? "Menyimpan..." : "Simpan Nama"}</span>
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
