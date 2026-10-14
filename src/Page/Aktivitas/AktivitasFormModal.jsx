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
    const token = getValidToken();
    if (isEmpty(token)) return;

    setLoadingMp(true);
    setErrorMp(null);
    try {
      const resMp = await fetch("http://localhost:3000/mataprograms?mode=all", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      await throwIfResponseNotOk(resMp, "Gagal memuat mata program");

      const jsonMp = await resMp.json();
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

      const res = await fetch(
        mode === "edit"
          ? `http://localhost:3000/aktivitasproker/${data.UUID}`
          : "http://localhost:3000/aktivitasproker",
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
        addToast(
          "error",
          json.message || json.Message || "Gagal menyimpan data"
        );
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
            <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold mb-4">
                {mode === "edit" ? "Edit" : "Tambah"} Aktivitas
              </Dialog.Title>

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
                  placeholder="Masukkan aktivitas"
                  error={errors.aktivitas}
                  {...register("aktivitas", {
                    required: "Aktivitas wajib diisi",
                  })}
                />

                <TextInput
                  label="PIC"
                  required
                  placeholder="Masukkan PIC"
                  error={errors.pic}
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
