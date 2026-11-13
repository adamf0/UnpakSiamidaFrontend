import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import { Eye, EyeOff, User, Mail, KeyRound, X } from "lucide-react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
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

  // Sync data saat modal dibuka atau mode berubah
  useEffect(() => {
    setShowPassword(false);

    if (mode === "edit" && data) {
      reset({
        username: data.Username || data.nidn_username || "",
        name: data.Name || data.name || "",
        email: data.Email || data.email || "",
        level: String(data.Level || data.level || "user").toLowerCase() === "admin" ? "admin" : "user",
        password: "",
      });
    } else {
      reset({
        username: "",
        name: "",
        email: "",
        level: "user",
        password: "",
      });
    }
  }, [mode, data, open, reset]);

  const onSubmit = async (form) => {
    const token = await getValidToken();
    if (isEmpty(token)) {
      addToast("error", "Sesi login tidak valid. Silakan login kembali.");
      return;
    }

    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("username", form.username.trim());
      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim());
      fd.append("level", form.level || "user");

      if (form.password && form.password.trim() !== "") {
        fd.append("password", form.password.trim());
      }

      const userUuid = data?.UUID || data?.uuid;
      if (mode === "edit") {
        if (!userUuid) {
          throw new Error("UUID user tidak ditemukan");
        }
        await apiClient.put(`/user/${userUuid}`, fd);
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
      const resData = err?.response?.data || err?.data;
      let errMsg = "Gagal menyimpan akun user";
      if (resData?.message) {
        if (typeof resData.message === "object") {
          errMsg = Object.values(resData.message).join(", ");
        } else {
          errMsg = String(resData.message);
        }
      } else if (err?.message) {
        errMsg = err.message;
      }
      addToast("error", errMsg);
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
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all my-8">
              {/* HEADER */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-purple-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-bold text-gray-900 leading-tight">
                      {mode === "edit"
                        ? "Edit Akun Pengguna"
                        : "Tambah Akun Pengguna Baru"}
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {mode === "edit"
                        ? "Perbarui informasi dasar profil pengguna"
                        : "Daftarkan akun pengguna baru ke dalam sistem SIAMIDA"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* FORM */}
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                {/* USERNAME / NIDN */}
                <div>
                  <TextInput
                    label="Username / NIDN"
                    required
                    placeholder="Contoh: 0413117601 atau nama_user"
                    icon={User}
                    error={errors.username?.message}
                    {...register("username", {
                      required: "Username / NIDN wajib diisi",
                      minLength: {
                        value: 3,
                        message: "Username minimal 3 karakter",
                      },
                    })}
                  />
                </div>

                {/* NAMA LENGKAP */}
                <div>
                  <TextInput
                    label="Nama Lengkap"
                    required
                    placeholder="Nama lengkap beserta gelar"
                    error={errors.name?.message}
                    {...register("name", {
                      required: "Nama lengkap wajib diisi",
                    })}
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <TextInput
                    label="Alamat Email"
                    required
                    type="email"
                    placeholder="Contoh: dosen@unpak.ac.id"
                    icon={Mail}
                    error={errors.email?.message}
                    {...register("email", {
                      required: "Alamat email wajib diisi",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Format email tidak valid",
                      },
                    })}
                  />
                </div>

                {/* LEVEL / HAK AKSES */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Level / Hak Akses <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white outline-none transition font-medium ${
                      errors.level
                        ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                        : "border-gray-200 focus:border-purple-600 focus:ring-3 focus:ring-purple-600/15"
                    }`}
                    {...register("level", {
                      required: "Level hak akses wajib dipilih",
                    })}
                  >
                    <option value="user">User (Pengguna Standar)</option>
                    <option value="admin">Admin (Administrator Sistem)</option>
                  </select>
                  {errors.level && (
                    <span className="text-xs text-rose-500 mt-1 block">
                      {errors.level.message}
                    </span>
                  )}
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Password{" "}
                    {mode === "new" ? (
                      <span className="text-rose-500">*</span>
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
                      className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-xl bg-white outline-none transition ${
                        errors.password
                          ? "border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15"
                          : "border-gray-200 focus:border-purple-600 focus:ring-3 focus:ring-purple-600/15"
                      }`}
                      {...register("password", {
                        required:
                          mode === "new"
                            ? "Password wajib diisi untuk akun baru"
                            : false,
                        minLength: {
                          value: 3,
                          message: "Password minimal 3 karakter",
                        },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-xs text-rose-500 mt-1 block">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                {/* NOTE FOR ROLE ASSIGNMENT */}
                <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl text-xs text-purple-900 leading-relaxed flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                  <span>
                    <strong>Level Akun & Penugasan Unit:</strong> Level menentukan hak akses dasar (User atau Admin). Untuk penugasan peran khusus per unit kerja dan tahun (UPML, UPMF, UPMS, Evaluator, Anggaran, dll.), kelola melalui aksi <strong>Tugaskan</strong> pada baris akun pengguna.
                  </span>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 rounded-xl shadow-2xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
