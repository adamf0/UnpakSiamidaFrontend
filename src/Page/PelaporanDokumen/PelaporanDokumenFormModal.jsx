import React, { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import {
  isEmpty,
  throwIfResponseNotOk,
  formatFetchError,
} from "@/Common/Utils";
import { apiClient, API_BASE_URL } from "@/Common/api";
import { FolderArchive, X } from "lucide-react";

const LIST_JENIS_DOKUMEN = [
  { id: "SK", UUID: "SK", nama: "SK (Wajib)" },
  { id: "SOP", UUID: "SOP", nama: "SOP (Wajib)" },
  { id: "PROPOSAL/TOR", UUID: "PROPOSAL/TOR", nama: "Proposal/TOR (Wajib)" },
  { id: "LAPORAN", UUID: "LAPORAN", nama: "Laporan (Wajib)" },
  { id: "DOCUMENT PENDUKUNG", UUID: "DOCUMENT PENDUKUNG", nama: "Dokumen Pendukung" },
];

export default function PelaporanDokumenFormModal({
  open,
  mode,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const { user, getValidToken } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [mataProgramOptions, setMataProgramOptions] = useState([]);
  const [loadingMp, setLoadingMp] = useState(false);
  const [errorMp, setErrorMp] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);

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
      jenis_dokumen: null,
    },
  });

  const fetchOptions = async () => {
    const token = getValidToken();
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
      setSelectedFile(null);
      setFileError(null);
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

      const targetJenis = (data.JenisDokumen || "").trim().toUpperCase();
      const selectedJenis =
        LIST_JENIS_DOKUMEN.find((j) => j.id === targetJenis) ||
        (targetJenis
          ? { id: targetJenis, UUID: targetJenis, nama: targetJenis }
          : null);

      reset({
        mata_program: selectedMp,
        jenis_dokumen: selectedJenis,
      });
    } else if (mode === "new") {
      reset({
        mata_program: null,
        jenis_dokumen: null,
      });
    }
  }, [mode, data, open, mataProgramOptions, reset]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("Ukuran file maksimal 10MB");
      setSelectedFile(null);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["pdf", "doc", "docx", "xls", "xlsx"];
    if (!allowed.includes(ext)) {
      setFileError("Format file harus .pdf, .doc, .docx, .xls, atau .xlsx");
      setSelectedFile(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
  };

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

    if (mode === "new" && !selectedFile) {
      setFileError("File dokumen wajib diunggah");
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
      fd.append(
        "jenis_dokumen",
        form.jenis_dokumen?.id ?? form.jenis_dokumen?.UUID ?? ""
      );

      if (selectedFile) {
        fd.append("file", selectedFile);
      }

      if (mode === "edit") {
        await apiClient.put(`/pelaporandokumen/${data.UUID}`, fd);
      } else {
        await apiClient.post("/pelaporandokumen", fd);
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
                    <FolderArchive className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-bold text-gray-900">
                      {mode === "edit" ? "Edit" : "Tambah"} Pelaporan Dokumen
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Unggah berkas bukti dukung dan pelaporan program kerja
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

                <SearchSelect
                  label="Jenis Dokumen"
                  required
                  options={LIST_JENIS_DOKUMEN}
                  placeholder="Pilih jenis dokumen"
                  value={watch("jenis_dokumen")}
                  error={errors.jenis_dokumen?.message}
                  onChange={(item) =>
                    setValue("jenis_dokumen", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("jenis_dokumen", {
                    required: "Jenis Dokumen wajib dipilih",
                  })}
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Berkas Dokumen {mode === "new" && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 border border-gray-200 rounded-xl p-1.5 bg-white cursor-pointer"
                  />
                  {mode === "edit" && data?.File && (
                    <p className="text-xs text-gray-500">
                      File saat ini:{" "}
                      <a
                        href={`${API_BASE_URL}/upload/pelaporan_dokumen/${data.File}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-700 hover:text-purple-900 underline font-medium"
                      >
                        {data.File}
                      </a>{" "}
                      (Biarkan kosong jika tidak ingin mengubah)
                    </p>
                  )}
                  <p className="text-3xs text-gray-400">
                    *Maksimal 10MB. Format yang didukung: .pdf, .doc, .docx, .xls, .xlsx
                  </p>
                  {fileError && (
                    <p className="text-xs text-rose-500 mt-1">{fileError}</p>
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
