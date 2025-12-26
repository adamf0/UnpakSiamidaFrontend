import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import { useToast } from "@/Providers/ToastProvider";

export default function StandarRenstraFormModal({
  open,
  mode,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { nama: "" } });

  useEffect(() => {
    if (mode === "edit" && data) {
      reset({ nama: data.Nama });
    } else {
      reset({ nama: "" });
    }
  }, [mode, data]);

  const onSubmit = async (form) => {
    try {
      const fd = new FormData();
      fd.append("nama", form.nama);

      const res = await fetch(
        mode === "edit"
          ? `http://localhost:3000/standarrenstra/${data.UUID}`
          : "http://localhost:3000/standarrenstra",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: fd,
        }
      );

      const json = await res.json();

      if (!res.ok) {
        addToast("error", json.message || "Gagal menyimpan");
        return;
      }

      addToast("success", "Berhasil disimpan");
      onSuccess?.();
      onClose();
    } catch {
      addToast("error", "Server tidak dapat dihubungi");
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
                {mode === "edit" ? "Edit" : "Tambah"} Jenis File
              </Dialog.Title>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <TextInput
                  label="Nama Jenis File"
                  error={errors.nama?.message}
                  {...register("nama", {
                    required: "Jenis File wajib diisi",
                  })}
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 text-red-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded"
                  >
                    Simpan
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
