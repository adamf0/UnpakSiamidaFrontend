import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";

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
    if (isEmpty(getValidToken())) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("tahun", form.tahun);
      fd.append("status", form.status);

      const res = await fetch(
        mode === "edit"
          ? `http://localhost:3000/tahunproker/${data.UUID}`
          : "http://localhost:3000/tahunproker",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: fd,
          headers: {
            Authorization: `Bearer ${getValidToken()}`,
          },
        }
      );

      const json = await res.json();

      if (!res.ok) {
        addToast("error", json.message || json.Message || "Gagal menyimpan data");
        return;
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
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <Dialog.Title className="text-lg font-semibold mb-4">
                {mode === "edit" ? "Edit" : "Tambah"} Master Tahun
              </Dialog.Title>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <TextInput
                  type="number"
                  label="Tahun"
                  required
                  placeholder="Contoh: 2025"
                  error={errors.tahun}
                  {...register("tahun", {
                    required: "Tahun wajib diisi",
                  })}
                />

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("status", {
                      required: "Status wajib dipilih",
                    })}
                    className={`w-full px-3 py-2 text-sm rounded border outline-none transition bg-white ${
                      errors.status
                        ? "border-red-500 focus:ring-0"
                        : "border-gray-300 focus:ring-2 focus:ring-purple-600"
                    }`}
                  >
                    <option value="">-- Pilih Status --</option>
                    <option value="aktif">Aktif</option>
                    <option value="non-aktif">Non-Aktif</option>
                  </select>
                  {errors.status?.message && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.status.message}
                    </p>
                  )}
                </div>

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
