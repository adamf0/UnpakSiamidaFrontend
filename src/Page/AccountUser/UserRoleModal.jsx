import React, { useState, useEffect, useMemo, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { apiClient } from "@/Common/api";
import { fetchFakultasUnits, isEmpty } from "@/Common/Utils";
import {
  Shield,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Power,
} from "lucide-react";

export const ROLE_LEVEL_OPTIONS = [
  { value: "user", label: "User (Pengguna Standar / Pengelola Unit)" },
  { value: "fakultas", label: "Fakultas (Verifikator Fakultas)" },
  { value: "admin", label: "Admin (Administrator Sistem / LPM)" },
  { value: "evaluator", label: "Evaluator (Verifikator Form Proker)" },
  { value: "anggaran", label: "Anggaran (Verifikator Form 13)" },
  { value: "auditee", label: "Auditee (Target Audit Unit / Prodi)" },
  { value: "upml", label: "UPML (Penjaminan Mutu Lembaga / Unit)" },
  { value: "upmf", label: "UPMF (Penjaminan Mutu Fakultas)" },
  { value: "upms", label: "UPMS (Penjaminan Mutu Program Studi)" },
];

export const ROLE_BADGES = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  fakultas: "bg-amber-100 text-amber-800 border-amber-200",
  evaluator: "bg-emerald-100 text-emerald-800 border-emerald-200",
  anggaran: "bg-teal-100 text-teal-800 border-teal-200",
  user: "bg-blue-100 text-blue-800 border-blue-200",
  auditee: "bg-indigo-100 text-indigo-800 border-indigo-200",
  upml: "bg-emerald-100 text-emerald-800 border-emerald-200",
  upmf: "bg-amber-100 text-amber-800 border-amber-200",
  upms: "bg-sky-100 text-sky-800 border-sky-200",
};

export default function UserRoleModal({
  open,
  user,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();

  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [fakultasOptions, setFakultasOptions] = useState([]);
  const [loadingFakultas, setLoadingFakultas] = useState(false);
  const [selectedFakultas, setSelectedFakultas] = useState(null);

  const [yearOptions, setYearOptions] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);

  // Edit role in-form state (null = add new mode)
  const [editingRoleUuid, setEditingRoleUuid] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      tahun: new Date().getFullYear().toString(),
      level: "user",
      status: "active",
    },
  });

  const watchLevel = watch("level");

  // Load Years
  const loadYears = async () => {
    try {
      setLoadingYears(true);
      const res = await apiClient.get("/tahunrenstras?mode=all");
      const list = res?.data ?? res ?? [];
      const safe = Array.isArray(list) ? list : (list.data || []);
      const yrs = safe
        .map((y) => String(y.Tahun || y.tahun || ""))
        .filter(Boolean);
      const unique = Array.from(new Set(yrs)).sort((a, b) => Number(b) - Number(a));
      if (unique.length === 0) {
        unique.push("2027", "2026", "2025", "2024");
      }
      setYearOptions(unique);
    } catch (err) {
      console.error("Fetch years error:", err);
      setYearOptions(["2027", "2026", "2025", "2024"]);
    } finally {
      setLoadingYears(false);
    }
  };

  // Load Fakultas Units
  const loadFakultas = async () => {
    try {
      setLoadingFakultas(true);
      const opts = await fetchFakultasUnits();
      setFakultasOptions(opts);
    } catch (err) {
      console.error("Fetch fakultas error:", err);
    } finally {
      setLoadingFakultas(false);
    }
  };

  // Fetch Roles for selected user
  const fetchUserRoles = async () => {
    const userUuid = user?.UUID || user?.uuid;
    if (!userUuid) return;

    try {
      setLoadingRoles(true);
      const res = await apiClient.get(`/user-role?user_uuid=${userUuid}`);
      const list = res?.data ?? res ?? [];
      setRoles(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch user roles error:", err);
      addToast("error", "Gagal memuat daftar role pengguna");
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchUserRoles();
      loadYears();
      loadFakultas();
      resetFormToAdd();
    }
  }, [open, user]);

  const resetFormToAdd = () => {
    setEditingRoleUuid(null);
    setSelectedFakultas(null);
    reset({
      tahun: new Date().getFullYear().toString(),
      level: "user",
      status: "active",
    });
  };

  const handleEditRole = (roleItem) => {
    setEditingRoleUuid(roleItem.UUID || roleItem.uuid);
    setValue("tahun", String(roleItem.Tahun || roleItem.tahun || ""));
    setValue("level", String(roleItem.Level || roleItem.level || "user").toLowerCase());
    setValue("status", String(roleItem.Status || roleItem.status || "active").toLowerCase());

    const fuId = roleItem.IdFakultasUnit || roleItem.id_fakultas_unit;
    const fuUuid = roleItem.UuidFakultasUnit || roleItem.uuid_fakultas_unit;
    const fuNama = roleItem.NamaFakultasUnit || roleItem.nama_fakultas_unit;

    if (fuId || fuUuid || fuNama) {
      const found = fakultasOptions.find(
        (f) =>
          String(f.id_numeric || f.id) === String(fuId) ||
          String(f.uuid || f.id) === String(fuUuid) ||
          f.pureName === fuNama ||
          f.nama === fuNama
      );
      setSelectedFakultas(
        found || {
          id: fuUuid || fuId,
          uuid: fuUuid,
          id_numeric: fuId,
          nama: fuNama || "Unit Terpilih",
        }
      );
    } else {
      setSelectedFakultas(null);
    }
  };

  const handleDeleteRole = async (roleUuid) => {
    if (!confirm("Apakah Anda yakin ingin menghapus penugasan role ini?")) {
      return;
    }

    try {
      await apiClient.delete(`/user-role/${roleUuid}`);
      addToast("success", "Penugasan role berhasil dihapus");
      await fetchUserRoles();
      if (editingRoleUuid === roleUuid) {
        resetFormToAdd();
      }
      onSuccess?.();
    } catch (err) {
      console.error("Delete user role error:", err);
      addToast("error", err?.data?.message || err?.message || "Gagal menghapus penugasan role");
    }
  };

  const handleToggleStatus = async (roleItem) => {
    const roleUuid = roleItem.UUID || roleItem.uuid;
    const currentStatus = String(roleItem.Status || roleItem.status || "active").toLowerCase();
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      const fd = new FormData();
      fd.append("status", newStatus);
      await apiClient.put(`/user-role/${roleUuid}`, fd);
      addToast(
        "success",
        `Status role diubah menjadi ${newStatus === "active" ? "Aktif" : "Non-Aktif"}`
      );
      await fetchUserRoles();
      onSuccess?.();
    } catch (err) {
      console.error("Toggle status role error:", err);
      addToast("error", "Gagal memperbarui status role");
    }
  };

  const onSubmit = async (formValues) => {
    const userUuid = user?.UUID || user?.uuid;
    if (!userUuid) {
      addToast("error", "Data pengguna tidak valid");
      return;
    }

    if (isEmpty(formValues.tahun)) {
      addToast("error", "Tahun penugasan wajib diisi");
      return;
    }

    // Role fakultas wajib memiliki unit fakultas
    if (formValues.level === "fakultas" && !selectedFakultas) {
      addToast("error", "Target Fakultas wajib dipilih untuk role Fakultas");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("user_uuid", userUuid);
      fd.append("tahun", String(formValues.tahun).trim());
      fd.append("level", formValues.level);
      fd.append("status", formValues.status || "active");

      // Fakultas / Unit
      if (formValues.level !== "admin" && selectedFakultas) {
        if (selectedFakultas.id_numeric) {
          fd.append("id_fakultas_unit", String(selectedFakultas.id_numeric));
        } else if (selectedFakultas.id) {
          fd.append("id_fakultas_unit", String(selectedFakultas.id));
        }
        if (selectedFakultas.uuid) {
          fd.append("uuid_fakultas_unit", String(selectedFakultas.uuid));
        }
      } else {
        fd.append("id_fakultas_unit", "");
      }

      if (editingRoleUuid) {
        await apiClient.put(`/user-role/${editingRoleUuid}`, fd);
        addToast("success", "Penugasan role berhasil diperbarui");
      } else {
        await apiClient.post("/user-role", fd);
        addToast("success", "Penugasan role baru berhasil ditambahkan");
      }

      resetFormToAdd();
      await fetchUserRoles();
      onSuccess?.();
    } catch (err) {
      console.error("Submit user role error:", err);
      const resMsg = err?.response?.data?.message || err?.data?.message || err?.message;
      addToast("error", resMsg || "Gagal menyimpan penugasan role");
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
            <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all my-8 flex flex-col max-h-[90vh]">
              {/* HEADER */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-linear-to-r from-purple-50/60 to-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-bold text-gray-900 leading-tight">
                      Kelola Role & Penugasan Pengguna
                    </Dialog.Title>
                    <p className="text-xs text-gray-600 mt-0.5">
                      <span className="font-semibold text-purple-700">
                        {user?.Name || user?.name || "User"}
                      </span>{" "}
                      ({user?.Username || user?.nidn_username || "-"}) • {user?.Email || user?.email || "-"}
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

              {/* BODY: SCROLLABLE */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* SECTION 1: FORM TAMBAH / EDIT ROLE */}
                <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-4.5 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        {editingRoleUuid ? "Edit Penugasan Role" : "Tambah Penugasan Role Baru"}
                      </h4>
                    </div>
                    {editingRoleUuid && (
                      <button
                        type="button"
                        onClick={resetFormToAdd}
                        className="text-xs text-purple-700 hover:underline cursor-pointer font-medium"
                      >
                        Batal Edit (Kembali ke Tambah)
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* TAHUN */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Tahun <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 appearance-none font-mono"
                            {...register("tahun", { required: "Tahun wajib dipilih" })}
                          >
                            {yearOptions.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-gray-400">
                            <Calendar size={14} />
                          </div>
                        </div>
                      </div>

                      {/* LEVEL / ROLE */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Level / Hak Akses <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 appearance-none font-medium"
                            {...register("level", { required: "Level role wajib dipilih" })}
                          >
                            {ROLE_LEVEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-gray-400">
                            <Shield size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* FAKULTAS / UNIT / PRODI */}
                    <div>
                      <SearchSelect
                        label="Fakultas / Unit / Prodi Sasaran"
                        placeholder={
                          watchLevel === "admin"
                            ? "Tidak terikat unit (Tingkat Universitas)"
                            : "Pilih Fakultas, Unit, atau Prodi sasaran penugasan..."
                        }
                        options={fakultasOptions}
                        value={selectedFakultas}
                        disabled={watchLevel === "admin"}
                        onChange={(val) => {
                          if (watchLevel !== "admin") {
                            setSelectedFakultas(val);
                          }
                        }}
                        loading={loadingFakultas}
                        required={watchLevel === "fakultas"}
                      />
                      <span className="text-[11px] text-gray-500 mt-0.5 block">
                        {watchLevel === "admin"
                          ? "Administrator memiliki wewenang universitas penuh tanpa unit tertentu."
                          : watchLevel === "fakultas"
                          ? "Wajib memilih unit Fakultas untuk verifikator fakultas."
                          : "Pilih unit/prodi jika akun bertugas pada unit atau prodi terkait."}
                      </span>
                    </div>

                    {/* STATUS & TOMBOL SUBMIT */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-gray-700">Status:</label>
                        <select
                          className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-purple-600"
                          {...register("status")}
                        >
                          <option value="active">Aktif</option>
                          <option value="inactive">Non-Aktif</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {editingRoleUuid && (
                          <button
                            type="button"
                            onClick={resetFormToAdd}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
                          >
                            Batal
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Plus size={14} />
                              <span>{editingRoleUuid ? "Perbarui Role" : "Tambah Role"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* SECTION 2: DAFTAR ROLE YANG SUDAH DITUGASKAN */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Daftar Penugasan Role ({roles.length})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={fetchUserRoles}
                      disabled={loadingRoles}
                      className="text-xs text-gray-500 hover:text-purple-700 flex items-center gap-1 cursor-pointer transition"
                      title="Muat ulang"
                    >
                      <RefreshCw size={12} className={loadingRoles ? "animate-spin" : ""} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {loadingRoles ? (
                    <div className="p-8 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-purple-600" />
                      Memuat daftar role...
                    </div>
                  ) : roles.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
                      <User size={24} className="mx-auto mb-2 text-gray-400 opacity-60" />
                      Belum ada penugasan role untuk pengguna ini. Silakan gunakan formulir di atas untuk menambahkan role.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                      {roles.map((r) => {
                        const lvl = String(r.Level || r.level || "user").toLowerCase();
                        const badgeClass =
                          ROLE_BADGES[lvl] || "bg-gray-100 text-gray-700 border-gray-200";
                        const isActive = String(r.Status || r.status || "active").toLowerCase() === "active";
                        const isEditingThis = editingRoleUuid === (r.UUID || r.uuid);

                        return (
                          <div
                            key={r.UUID || r.uuid || r.ID}
                            className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition ${
                              isEditingThis
                                ? "bg-purple-50/60 border-l-4 border-l-purple-600"
                                : "hover:bg-gray-50/70"
                            } ${!isActive ? "opacity-60" : ""}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border shrink-0 ${badgeClass}`}
                              >
                                {lvl}
                              </span>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-gray-900 truncate">
                                    {r.NamaFakultasUnit || r.nama_fakultas_unit || "Tingkat Universitas"}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                    {r.Tahun || r.tahun}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                                  <span
                                    className={`inline-flex items-center gap-1 font-medium ${
                                      isActive ? "text-emerald-600" : "text-gray-400 line-through"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isActive ? "bg-emerald-500" : "bg-gray-400"
                                      }`}
                                    />
                                    {isActive ? "Aktif" : "Non-Aktif"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Quick toggle status */}
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(r)}
                                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                  isActive
                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                                    : "text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100"
                                }`}
                                title={isActive ? "Nonaktifkan Role" : "Aktifkan Role"}
                              >
                                <Power size={13} />
                              </button>

                              {/* Edit button */}
                              <button
                                type="button"
                                onClick={() => handleEditRole(r)}
                                className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                                title="Edit Role"
                              >
                                <Pencil size={13} />
                              </button>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(r.UUID || r.uuid)}
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                title="Hapus Role"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
