import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import { useToast } from "@/Providers/ToastProvider";
import SearchSelect from "@/Components/SearchSelect";
import { useAuth } from "@/Providers/AuthProvider";
import { formatYMD, isEmpty } from "@/Common/Utils";

export default function BeritaAcaraFormModal({
  open,
  mode,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const [targetOptions, setTargetOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const { getValidToken } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      Tahun: "",
      Tanggal: "",
      Auditee: null,
      Auditor1: null,
      Auditor2: null,
    },
  });

  useEffect(() => {
    if (mode === "edit" && data) {
      const auditeeSelected = userOptions.find(
        (item) => item.id == data.AuditeeUuid,
      );
      const auditor1Selected = userOptions.find(
        (item) => item.id == data.Auditor1Uuid,
      );
      const auditor2Selected = userOptions.find(
        (item) => item.id == data.Auditor2Uuid,
      );

      reset({
        Tahun: data.Tahun,
        Tanggal: formatYMD(data.Tanggal),
        Auditee: auditeeSelected,
        Auditor1: auditor1Selected,
        Auditor2: auditor2Selected,
      });
    } else {
      reset({
        Tahun: "",
        Tanggal: "",
        Auditee: null,
        Auditor1: null,
        Auditor2: null,
      });
    }
  }, [mode, data]);

  const fetchUserOptions = async () => {
    if (isEmpty(getValidToken())) return;

    try {
      const res = await fetch("http://localhost:3000/user-options", {
        headers: {
          Accept: "application/json", // ganti SSE → JSON
          Authorization: `Bearer ${getValidToken()}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json(); // langsung parse JSON

      const result = data
        .filter((item) => !isEmpty(item.Level))
        .map((item) => ({
          id: item.UUID,
          nama: `${item.Name} (${item.Level}) ${item.Level == "fakultas" ? `(${item.Fakultas})` : ""}`,
          ...item,
        }));

      setUserOptions(result);
    } catch (err) {
      console.error("Fetch user gagal:", err);
    }
  };

  useEffect(() => {
    fetchUserOptions();
  }, []);

  const onSubmit = async (form) => {
    console.log("SUBMIT:", form);
    try {
      const fd = new FormData();
      fd.append("tahun", form.tahun ?? "");
      fd.append("tanggal", form?.tanggal ?? "");
      fd.append("fakultasunit", data?.FakultasUnitUuid ?? "");
      fd.append("auditee", form?.auditee?.UUID ?? "");
      fd.append("auditor1", form?.auditor1?.UUID ?? "");
      fd.append("auditor2", form?.auditor2?.UUID ?? "");

    //   const res = await fetch(
    //     mode === "edit"
    //       ? `http://localhost:3000/beritaacara/${data.Uuid}`
    //       : "http://localhost:3000/beritaacara",
    //     {
    //       method: mode === "edit" ? "PUT" : "POST",
    //       body: fd,
    //       headers: {
    //         Authorization: `Bearer ${getValidToken()}`,
    //       },
    //     },
    //   );

    //   const json = await res.json();

    //   if (!res.ok) {
    //     addToast("error", json.message || "Gagal menyimpan");
    //     return;
    //   }

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
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold mb-4">
                {mode === "edit" ? "Edit" : "Tambah"} Berita Acara
              </Dialog.Title>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <TextInput
                  label="Tahun" //hanya tahun, tidak boleh ada text melainkan number 4 digit
                  type="number"
                  required
                  error={errors.Tahun}
                  {...register("Tahun", {
                    required: "Tahun wajib diisi",
                    min: { value: 1900, message: "Tahun minimal 1900" },
                    max: {
                      value: 4000,
                      message: "Tahun tidak boleh lebih dari 4000",
                    },
                    validate: (val) =>
                      /^\d{4}$/.test(val) || "Tahun harus 4 digit",
                  })}
                />

                <TextInput
                  label="Tanggal"
                  type="date"
                  required
                  error={errors.Tanggal} //tidak muncul error messagenya
                  {...register("Tanggal", {
                    required: "Tanggal wajib diisi",
                  })}
                />

                <TextInput
                  label="Nama Target" //hanya tahun, tidak boleh ada text melainkan number 4 digit
                  type="text"
                  disabled
                  value={data?.FakultasUnit ?? ""}
                 />

                <SearchSelect
                  label="Nama Auditee"
                  required
                  options={userOptions}
                  placeholder="Cari Auditee"
                  value={watch("Auditee")}
                  error={errors.Auditee?.message}
                  onChange={(item) =>
                    setValue("Auditee", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("Auditee", {
                    required: "Auditee wajib dipilih",
                  })}
                />

                <SearchSelect
                  label="Nama Auditor1"
                  required
                  options={userOptions}
                  placeholder="Cari Auditor1"
                  value={watch("Auditor1")}
                  error={errors.Auditor1?.message}
                  onChange={(item) =>
                    setValue("Auditor1", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("Auditor1", {
                    required: "Auditor1 wajib dipilih",
                  })}
                />

                <SearchSelect
                  label="Nama Auditor2"
                  required
                  options={userOptions}
                  placeholder="Cari Auditor2"
                  value={watch("Auditor2")}
                  error={errors.Auditor2?.message}
                  onChange={(item) =>
                    setValue("Auditor2", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("Auditor2", {
                    required: "Auditor2 wajib dipilih",
                  })}
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded text-red-600"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="px-3 py-2 bg-purple-600 text-white rounded"
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
