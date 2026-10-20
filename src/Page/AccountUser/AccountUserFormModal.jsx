import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { Eye, EyeOff, Shield, Building2, User, KeyRound, Mail } from "lucide-react";

const LEVEL_OPTIONS = [
  { value: "admin", label: "Admin (Administrator Sistem / LPM)" },
  { value: "fakultas", label: "Fakultas (Verifikator Fakultas)" },
  // { value: "auditee", label: "Auditee (Target Audit / Unit / Prodi)" },
  // { value: "auditor1", label: "Auditor 1" },
  // { value: "auditor2", label: "Auditor 2" },
  { value: "anggaran", label: "Anggaran (Verifikator Form 13)" },
  { value: "evaluator", label: "Keuangan (Verifikator Form Proker)" },
  { value: "user", label: "User (Pengguna Standar)" },
];

export default function AccountUserFormModal({
  open,
  mode,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const { getValidToken } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loadingFakultas, setLoadingFakultas] = useState(false);
  const [fakultasOptions, setFakultasOptions] = useState([]);
  const [selectedFakultasUnit, setSelectedFakultasUnit] = useState(null);
  const [fakultasError, setFakultasError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: "",
      name: "",
      email: "",
      level: "user",
      password: "",
    },
  });

  const watchLevel = watch("level");

  // Fetch daftar Fakultas / Unit
  useEffect(() => {
    let isMounted = true;
    const fetchFakultas = async () => {
      try {
        setLoadingFakultas(true);
        const res = await apiClient.get("/fakultasunits?mode=all");
        const list = res.data;
        if (isMounted) {
          const mapped = (Array.isArray(list) ? list : []).map((fu) => ({
            id: fu.UUID,
            uuid: fu.UUID,
            rawId: fu.ID,
            nama: `${fu.Nama || ""}${fu.Jenjang ? ` (${fu.Jenjang})` : ""}${
              fu.Type ? ` [${fu.Type.toUpperCase()}]` : ""
            }`.trim(),
            pureName: fu.Nama,
          }));
          setFakultasOptions(mapped);
        }
      } catch (err) {
        console.error("Error fetching fakultas units:", err);
      } finally {
        if (isMounted) setLoadingFakultas(false);
      }
    };

    if (open) {
      fetchFakultas();
    }
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Sync data saat modal dibuka atau mode berubah
  useEffect(() => {
    setShowPassword(false);
    setFakultasError("");

    if (mode === "edit" && data) {
      reset({
        username: data.Username || "",
        name: data.Name || "",
        email: data.Email || "",
        level: data.Level || "user",
        password: "",
      });

      // Match selected fakultas unit
      if (data.UuidFakultasUnit) {
        setSelectedFakultasUnit({
          id: data.UuidFakultasUnit,
          uuid: data.UuidFakultasUnit,
          nama: data.NamaFakultasUnit || "Unit Terpilih",
        });
      } else if (data.NamaFakultasUnit) {
        const found = fakultasOptions.find(
          (f) =>
            f.pureName === data.NamaFakultasUnit ||
            f.nama.includes(data.NamaFakultasUnit)
        );
        setSelectedFakultasUnit(
          found || {
            id: data.UuidFakultasUnit || "",
            nama: data.NamaFakultasUnit,
          }
        );
      } else {
        setSelectedFakultasUnit(null);
      }
    } else {
      reset({
        username: "",
        name: "",
        email: "",
        level: "user",
        password: "",
      });
      setSelectedFakultasUnit(null);
    }
  }, [mode, data, open, fakultasOptions]);

  const onSubmit = async (form) => {
    const token = await getValidToken();
    if (isEmpty(token)) {
      addToast("error", "Sesi login tidak valid. Silakan login kembali.");
      return;
    }

    // Validasi FakultasUnit jika level fakultas
    if (form.level === "fakultas" && !selectedFakultasUnit?.id) {
      setFakultasError("Fakultas / Unit wajib dipilih untuk level Fakultas");
      return;
    }

    setFakultasError("");
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("username", form.username.trim());
      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim());
      fd.append("level", form.level);

      if (selectedFakultasUnit?.id) {
        fd.append("FakultasUnit", selectedFakultasUnit.id);
      }

      if (form.password && form.password.trim() !== "") {
        fd.append("password", form.password.trim());
      }

      if (mode === "edit") {
        await apiClient.put(`/user/${data.UUID}`, fd);
      } else {
        await apiClient.post("/user", fd);
      }

      addToast(
        "success",
        mode === "edit"
          ? "Akun user berhasil diperbarui"
          : "Akun user berhasil ditambahkan"
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Submit user error:", err);
      addToast("error", "Gagal terhubung ke server");
    } finally {
      setIsSubmitting(false);
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-150"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 transition-all my-8">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-bold text-gray-900 leading-tight">
                    {mode === "edit" ? "Edit Akun User" : "Tambah Akun User Baru"}
                  </Dialog.Title>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {mode === "edit"
                      ? "Perbarui informasi akun, level hak akses, dan unit kerja"
                      : "Buat akun pengguna baru ke dalam sistem SIAMIDA"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* USERNAME & NAMA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <TextInput
                    label="Username / NIDN"
                    placeholder="Contoh: 0413117601 atau namauser"
                    error={errors.username?.message}
                    required
                    {...register("username", {
                      required: "Username wajib diisi",
                      minLength: {
                        value: 3,
                        message: "Minimal 3 karakter",
                      },
                    })}
                  />

                  <TextInput
                    label="Nama Lengkap"
                    placeholder="Nama lengkap beserta gelar"
                    error={errors.name?.message}
                    required
                    {...register("name", {
                      required: "Nama lengkap wajib diisi",
                    })}
                  />
                </div>

                {/* EMAIL */}
                <TextInput
                  label="Alamat Email"
                  type="email"
                  placeholder="Contoh: dosen@unpak.ac.id"
                  error={errors.email?.message}
                  required
                  {...register("email", {
                    required: "Email wajib diisi",
                    pattern: {
                      value:
                        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                      message: "Format email tidak valid",
                    },
                  })}
                />

                {/* LEVEL ROLE */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Level / Hak Akses <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={`w-full px-3 py-2 text-sm border rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-500 transition ${
                        errors.level ? "border-red-500" : "border-gray-300"
                      }`}
                      {...register("level", {
                        required: "Level user wajib dipilih",
                      })}
                    >
                      {LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      <Shield size={16} />
                    </div>
                  </div>
                  {errors.level && (
                    <span className="text-xs text-red-500 mt-1 block">
                      {errors.level.message}
                    </span>
                  )}
                </div>

                {/* FAKULTAS / UNIT */}
                <div>
                  <SearchSelect
                    label="Fakultas / Unit / Target Kerja"
                    placeholder="Pilih atau cari Fakultas, Unit, atau Prodi..."
                    options={fakultasOptions}
                    value={selectedFakultasUnit}
                    onChange={(val) => {
                      setSelectedFakultasUnit(val);
                      setFakultasError("");
                    }}
                    loading={loadingFakultas}
                    required={watchLevel === "fakultas"}
                    error={fakultasError}
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">
                    {watchLevel === "fakultas"
                      ? "Wajib diisi untuk level Verifikator Fakultas"
                      : "Opsional jika user terkait dengan unit/prodi tertentu"}
                  </span>
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password{" "}
                    {mode === "new" ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-gray-400 font-normal">
                        (Kosongkan jika tidak diubah)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        mode === "new"
                          ? "Masukkan password akun"
                          : "Masukkan password baru (opsional)"
                      }
                      className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-500 transition ${
                        errors.password ? "border-red-500" : "border-gray-300"
                      }`}
                      {...register("password", {
                        required:
                          mode === "new" ? "Password wajib diisi untuk akun baru" : false,
                        minLength: {
                          value: 3,
                          message: "Password minimal 3 karakter",
                        },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-xs text-red-500 mt-1 block">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>{mode === "edit" ? "Perbarui User" : "Simpan User"}</span>
                    )}
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
