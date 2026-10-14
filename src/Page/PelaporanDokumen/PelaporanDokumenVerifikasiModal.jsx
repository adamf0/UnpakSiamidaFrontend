import React, { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";

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

      const res = await fetch(
        `http://localhost:3000/pelaporandokumen/${data.UUID}/verifikasi`,
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

      addToast("success", "Berhasil verifikasi pelaporan dokumen");
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

  const fileUrl = data?.File
    ? `http://localhost:3000/upload/pelaporan_dokumen/${data.File}`
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
            <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Verifikasi Pelaporan Dokumen
              </Dialog.Title>

              {data && (
                <div className="bg-gray-50 border rounded p-3 mb-4 text-sm space-y-1">
                  <div>
                    <span className="font-medium text-gray-700">Mata Program:</span>{" "}
                    {data.MataProgram || "-"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Jenis Dokumen:</span>{" "}
                    {data.JenisDokumen || "-"}
                  </div>
                  {data.FakultasUnit && (
                    <div>
                      <span className="font-medium text-gray-700">Fakultas / Unit:</span>{" "}
                      {data.FakultasUnit}
                    </div>
                  )}
                  {fileUrl && (
                    <div>
                      <span className="font-medium text-gray-700">File:</span>{" "}
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 underline font-medium"
                      >
                        {data.File} (Buka file)
                      </a>
                    </div>
                  )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catatan Verifikasi{" "}
                    {selectedStatus?.id === "gagal_terverifikasi" && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Masukkan catatan bila diperlukan (wajib jika Gagal Terverifikasi)"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-purple-600 outline-none text-sm"
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
                    <p className="text-xs text-red-600 mt-1">
                      {errors.catatan.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50 font-medium"
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
