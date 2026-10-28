import React, { useState, useEffect, useMemo, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import SearchSelect from "@/Components/SearchSelect";
import TextInput from "@/Components/TextInput";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { apiClient } from "@/Common/api";
import {
  isEmpty,
  cleanDuplicateJenjang,
  formatProdiWithJenjang,
  fetchFakultasUnits,
} from "@/Common/Utils";
import {
  UserCheck,
  Shield,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

export default function UserAssignmentModal({
  open,
  mode = "new", // 'new' | 'edit'
  data = null,
  defaultUser = null,
  onClose,
  onSuccess,
  defaultYear = "",
}) {
  const { addToast } = useToast();
  const { getValidToken } = useAuth();

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersOptions, setUsersOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [loadingFakultas, setLoadingFakultas] = useState(false);
  const [fakultasOptions, setFakultasOptions] = useState([]);
  const [selectedFakultasUnit, setSelectedFakultasUnit] = useState(null);

  const [loadingYears, setLoadingYears] = useState(false);
  const [yearOptions, setYearOptions] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  const [detectedRole, setDetectedRole] = useState("upmf");
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
      tahun: defaultYear || new Date().getFullYear().toString(),
      role: "auto",
      status: "active",
    },
  });

  const watchRole = watch("role");

  // Helper cek apakah target merupakan prodi
  const checkIsProdi = (fu) => {
    if (!fu) return false;
    const type = String(
      fu.type || fu.Type || fu.TypeFakultasUnit || fu.type_fakultas_unit || ""
    ).toLowerCase().trim();
    const nama = String(
      fu.pureName || fu.nama || fu.Nama || fu.NamaFakultasUnit || fu.nama_fak_prod_unit || ""
    ).toLowerCase().trim();
    if (type === "prodi") return true;
    if (type === "fakultas" || type === "unit") return false;
    return (
      nama.includes("(prodi)") ||
      nama.startsWith("prodi") ||
      nama.startsWith("program studi")
    );
  };

  // Helper cek apakah target merupakan fakultas
  const checkIsFakultas = (fu) => {
    if (!fu) return false;
    const type = String(
      fu.type || fu.Type || fu.TypeFakultasUnit || fu.type_fakultas_unit || ""
    ).toLowerCase().trim();
    const nama = String(
      fu.pureName || fu.nama || fu.Nama || fu.NamaFakultasUnit || fu.nama_fak_prod_unit || ""
    ).toLowerCase().trim();

    if (type === "fakultas") return true;
    if (type === "prodi" || type === "unit") return false;
    return nama.includes("(fakultas)") || nama.startsWith("fakultas");
  };

  // Helper cek apakah target merupakan unit / lembaga
  const checkIsUnit = (fu) => {
    if (!fu) return false;
    return !checkIsProdi(fu) && !checkIsFakultas(fu);
  };

  // Helper untuk deteksi role dari target sasaran
  const detectRoleFromFu = (fu) => {
    if (!fu) return "upmf";
    if (checkIsProdi(fu)) return "upms";
    if (checkIsFakultas(fu)) return "upmf";
    return "upml";
  };

  // Fetch Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await apiClient.get("/users?mode=all");
      const list = res?.data ?? res ?? [];
      const safe = Array.isArray(list) ? list : (list.data || []);
      const opts = safe.map((u) => ({
        id: u.UUID || u.id || u.ID,
        uuid: u.UUID || u.uuid,
        id_numeric: u.ID || u.id,
        nama: `${u.Name || u.name} (${u.Username || u.nidn_username || "-"})`,
        name: u.Name || u.name,
        username: u.Username || u.nidn_username,
        email: u.Email || u.email,
        level: u.Level || u.level,
      }));
      setUsersOptions(opts);
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Fakultas / Units menggunakan fungsi tunggal terpadu
  const loadFakultasUnits = async () => {
    setLoadingFakultas(true);
    try {
      const opts = await fetchFakultasUnits();
      setFakultasOptions(opts);
    } catch (err) {
      console.error("Fetch fakultas units error:", err);
    } finally {
      setLoadingFakultas(false);
    }
  };

  // Fetch Tahun
  const fetchYears = async () => {
    setLoadingYears(true);
    try {
      const res = await apiClient.get("/tahunrenstras?mode=all");
      const list = res?.data ?? res ?? [];
      const safe = Array.isArray(list) ? list : (list.data || []);
      const opts = safe.map((y) => {
        const thn = String(y.Tahun || y.tahun || "");
        return {
          id: thn,
          nama: thn,
          tahun: thn,
        };
      });
      setYearOptions(opts);
    } catch (err) {
      console.error("Fetch years error:", err);
    } finally {
      setLoadingYears(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
      loadFakultasUnits();
      fetchYears();
    }
  }, [open]);

  // Sync saat mode edit atau open
  useEffect(() => {
    if (open) {
      if (mode === "edit" && data) {
        setValue("tahun", String(data.Tahun || data.tahun || defaultYear));
        setValue("role", (data.Role || data.role || "auto").toLowerCase());
        setValue("status", (data.Status || data.status || "active").toLowerCase());

        // Match user
        const foundUser = usersOptions.find(
          (u) =>
            u.id_numeric === (data.IdUser || data.id_user) ||
            u.uuid === (data.UserUuid || data.user_uuid)
        );
        setSelectedUser(
          foundUser || {
            id: data.UserUuid || data.IdUser,
            nama: `${data.UserName || data.user_name} (${data.UserUsername || data.user_username || "-"})`,
            uuid: data.UserUuid || data.user_uuid,
            id_numeric: data.IdUser || data.id_user,
          }
        );

        // Match unit
        const foundUnit = fakultasOptions.find(
          (f) =>
            f.id_numeric === (data.IdFakultasUnit || data.id_fakultas_unit) ||
            f.uuid === (data.UuidFakultasUnit || data.uuid_fakultas_unit)
        );
        setSelectedFakultasUnit(
          foundUnit || {
            id: data.UuidFakultasUnit || data.IdFakultasUnit,
            nama: data.NamaFakultasUnit || data.nama_fakultas_unit,
            uuid: data.UuidFakultasUnit || data.uuid_fakultas_unit,
            id_numeric: data.IdFakultasUnit || data.id_fakultas_unit,
            type: data.TypeFakultasUnit || data.type_fakultas_unit,
          }
        );

        const r = detectRoleFromFu(foundUnit || data);
        setDetectedRole(r);
      } else {
        reset({
          tahun: defaultYear || new Date().getFullYear().toString(),
          role: "auto",
          status: "active",
        });
        if (defaultUser) {
          const found = usersOptions.find(
            (u) =>
              u.id_numeric === (defaultUser.ID || defaultUser.id) ||
              u.uuid === (defaultUser.UUID || defaultUser.uuid)
          );
          setSelectedUser(
            found || {
              id: defaultUser.UUID || defaultUser.uuid || defaultUser.ID || defaultUser.id,
              nama: `${defaultUser.Name || defaultUser.name || ""} (${defaultUser.Username || defaultUser.username || "-"})`,
              name: defaultUser.Name || defaultUser.name,
              username: defaultUser.Username || defaultUser.username,
              level: defaultUser.Level || defaultUser.level,
              uuid: defaultUser.UUID || defaultUser.uuid,
              id_numeric: defaultUser.ID || defaultUser.id,
            }
          );
        } else {
          setSelectedUser(null);
        }
        setSelectedFakultasUnit(null);
        setDetectedRole("upmf");
      }
    }
  }, [open, mode, data, defaultUser, usersOptions, fakultasOptions, defaultYear]);

  // Filter target options berdasarkan role yang dipilih
  const filteredFakultasOptions = useMemo(() => {
    if (watchRole === "upms") {
      return fakultasOptions.filter(checkIsProdi);
    }
    if (watchRole === "upmf") {
      return fakultasOptions.filter(checkIsFakultas);
    }
    if (watchRole === "upml") {
      return fakultasOptions.filter((fu) => checkIsFakultas(fu) || checkIsUnit(fu));
    }
    return fakultasOptions;
  }, [fakultasOptions, watchRole]);

  // Update detected role when unit changes
  const handleSelectUnit = (unit) => {
    setSelectedFakultasUnit(unit);
    if (unit) {
      const r = detectRoleFromFu(unit);
      setDetectedRole(r);
    }
  };

  // Reset target jika role yang dipilih tidak cocok dengan target yang sedang aktif
  useEffect(() => {
    if (!selectedFakultasUnit) return;
    if (watchRole === "upms" && !checkIsProdi(selectedFakultasUnit)) {
      setSelectedFakultasUnit(null);
    } else if (watchRole === "upmf" && !checkIsFakultas(selectedFakultasUnit)) {
      setSelectedFakultasUnit(null);
    } else if (watchRole === "upml" && checkIsProdi(selectedFakultasUnit)) {
      setSelectedFakultasUnit(null);
    }
  }, [watchRole]);

  const effectiveRole = useMemo(() => {
    if (watchRole && watchRole !== "auto") {
      return watchRole;
    }
    return detectedRole;
  }, [watchRole, detectedRole]);

  const onSubmit = async (formValues) => {
    if (!selectedUser) {
      addToast("error", "Pilih pengguna yang akan ditugaskan");
      return;
    }

    const effRole = effectiveRole;
    if (!selectedFakultasUnit) {
      if (effRole === "upms") {
        addToast("error", "Target Program Studi (Prodi) wajib dipilih untuk role UPMS");
      } else if (effRole === "upmf") {
        addToast("error", "Target Fakultas wajib dipilih untuk role UPMF");
      } else {
        addToast("error", "Target Fakultas / Unit wajib dipilih untuk role UPML");
      }
      return;
    }

    if (effRole === "upms" && !checkIsProdi(selectedFakultasUnit)) {
      addToast("error", "Target untuk role UPMS harus berupa Program Studi (Prodi)");
      return;
    }
    if (effRole === "upmf" && !checkIsFakultas(selectedFakultasUnit)) {
      addToast("error", "Target untuk role UPMF harus berupa Fakultas");
      return;
    }
    if (effRole === "upml" && checkIsProdi(selectedFakultasUnit)) {
      addToast("error", "Target untuk role UPML harus berupa Fakultas atau Unit (bukan Program Studi)");
      return;
    }

    if (isEmpty(formValues.tahun)) {
      addToast("error", "Tahun penugasan wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      if (selectedUser.id_numeric) fd.append("id_user", String(selectedUser.id_numeric));
      if (selectedUser.uuid) fd.append("user_uuid", selectedUser.uuid);
      if (selectedFakultasUnit?.id_numeric) fd.append("id_fakultas_unit", String(selectedFakultasUnit.id_numeric));
      if (selectedFakultasUnit?.uuid) fd.append("uuid_fakultas_unit", selectedFakultasUnit.uuid);
      fd.append("tahun", String(formValues.tahun).trim());
      fd.append("role", effRole);
      fd.append("status", formValues.status || "active");

      if (mode === "edit" && (data?.UUID || data?.uuid)) {
        const editUuid = data.UUID || data.uuid;
        await apiClient.put(`/user-abac/${editUuid}`, fd);
        addToast("success", "Penugasan pengguna berhasil diperbarui");
      } else {
        await apiClient.post("/user-abac", fd);
        addToast("success", "Penugasan pengguna baru berhasil ditambahkan");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Save penugasan error:", err);
      const msg =
        err?.data?.message ||
        err?.message ||
        "Gagal menyimpan penugasan pengguna";
      addToast("error", msg);
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
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <Dialog.Title className="text-lg font-bold text-gray-900 leading-tight">
                      {mode === "edit"
                        ? "Edit Penugasan Role (ABAC)"
                        : "Tambah Penugasan Role Baru"}
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {mode === "edit"
                        ? "Perbarui atribut tahun, target unit, dan status penugasan"
                        : "Tugaskan pengguna ke role UPML, UPMF, atau UPMS per unit dan tahun"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* PILIH PENGGUNA */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pengguna Ditugaskan <span className="text-red-500">*</span>
                  </label>
                  {defaultUser ? (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {(defaultUser.Name || defaultUser.name || "U")[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 leading-tight">
                            {defaultUser.Name || defaultUser.name}
                          </p>
                          <p className="text-[11px] text-gray-500 font-mono">
                            {defaultUser.Username || defaultUser.username || defaultUser.nidn_username || "-"}
                            {(defaultUser.Email || defaultUser.email) ? ` • ${defaultUser.Email || defaultUser.email}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold uppercase tracking-wider">
                        {defaultUser.Level || defaultUser.level || "user"}
                      </span>
                    </div>
                  ) : (
                    <>
                      <SearchSelect
                        placeholder="Ketik nama atau NIDN pengguna..."
                        options={usersOptions}
                        value={selectedUser}
                        onChange={(val) => setSelectedUser(val)}
                        loading={loadingUsers}
                        required
                      />
                      {selectedUser && (
                        <div className="mt-1.5 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 flex items-center justify-between border border-gray-100">
                          <div>
                            <span className="font-semibold text-gray-800">
                              {selectedUser.name || selectedUser.Name}
                            </span>
                            <span className="text-gray-400 ml-1.5">
                              ({selectedUser.username || selectedUser.Username || "-"})
                            </span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md font-medium capitalize">
                            Level: {selectedUser.level || selectedUser.Level || "user"}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ROLE PENUGASAN (PILIH ROLE DAHULU UNTUK MEMFILTER TARGET) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Role Penugasan <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition font-medium"
                      {...register("role")}
                    >
                      <option value="auto">
                        Otomatis (Berdasarkan Target Unit: {detectedRole.toUpperCase()})
                      </option>
                      <option value="upms">UPMS (Unit Penjaminan Mutu Program Studi)</option>
                      <option value="upmf">UPMF (Unit Penjaminan Mutu Fakultas)</option>
                      <option value="upml">UPML (Unit Penjaminan Mutu Lembaga)</option>
                    </select>

                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-xs">
                        <span className="text-gray-500">Role Efektif: </span>
                        <span className="font-bold text-emerald-800 uppercase">
                          {effectiveRole}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    {watchRole === "upms" ? (
                      <span>
                        • <b>UPMS:</b> Khusus Program Studi (Prodi). Pilihan target di bawah otomatis difilter ke daftar prodi saja.
                      </span>
                    ) : watchRole === "upmf" ? (
                      <span>
                        • <b>UPMF:</b> Khusus Fakultas. Pilihan target di bawah otomatis difilter ke daftar fakultas saja.
                      </span>
                    ) : watchRole === "upml" ? (
                      <span>
                        • <b>UPML:</b> Lembaga / Unit kerja dan Fakultas. Pilihan target difilter ke fakultas dan unit.
                      </span>
                    ) : (
                      <span>
                        • <b>Otomatis:</b> Menampilkan semua target sasaran (Prodi: UPMS, Fakultas: UPMF, Unit: UPML).
                      </span>
                    )}
                  </span>
                </div>

                {/* TARGET FAKULTAS / UNIT / PRODI */}
                <div>
                  <SearchSelect
                    label={
                      watchRole === "upms"
                        ? "Target Program Studi (Prodi)"
                        : watchRole === "upmf"
                          ? "Target Fakultas"
                          : watchRole === "upml"
                            ? "Target Fakultas / Unit / Lembaga"
                            : "Target Fakultas / Unit / Lembaga / Prodi"
                    }
                    placeholder={
                      watchRole === "upms"
                        ? "Pilih program studi sasaran..."
                        : watchRole === "upmf"
                          ? "Pilih fakultas sasaran..."
                          : watchRole === "upml"
                            ? "Pilih fakultas atau unit kerja sasaran..."
                            : "Pilih unit kerja, fakultas, atau prodi sasaran..."
                    }
                    options={filteredFakultasOptions}
                    value={selectedFakultasUnit}
                    onChange={handleSelectUnit}
                    loading={loadingFakultas}
                    required
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">
                    {watchRole === "upms"
                      ? "Menampilkan data Program Studi saja sesuai role UPMS."
                      : watchRole === "upmf"
                        ? "Menampilkan data Fakultas saja sesuai role UPMF."
                        : watchRole === "upml"
                          ? "Menampilkan data Fakultas dan Unit kerja sesuai role UPML."
                          : "Role akan disesuaikan secara otomatis berdasarkan tipe target yang dipilih."}
                  </span>
                </div>

                {/* TAHUN PENUGASAN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tahun Penugasan <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Contoh: 2025"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition ${
                          errors.tahun ? "border-red-500" : "border-gray-300"
                        }`}
                        {...register("tahun", {
                          required: "Tahun penugasan wajib diisi",
                          pattern: {
                            value: /^[0-9]{4}$/,
                            message: "Tahun harus berupa 4 digit angka",
                          },
                        })}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                        <Calendar size={16} />
                      </div>
                    </div>
                    {errors.tahun && (
                      <span className="text-xs text-red-500 mt-1 block">
                        {errors.tahun.message}
                      </span>
                    )}
                  </div>

                  {/* STATUS */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Status Penugasan <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 transition"
                      {...register("status", { required: true })}
                    >
                      <option value="active">Aktif (Dapat Mengakses)</option>
                      <option value="inactive">Tidak Aktif (Dinonaktifkan)</option>
                    </select>
                  </div>
                </div>

                {/* PREVIEW KOTAK INFO */}
                {selectedUser && selectedFakultasUnit && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                      <CheckCircle2 size={15} className="text-blue-600" />
                      <span>Ringkasan Hak Akses:</span>
                    </div>
                    <p>
                      Pengguna <b>{selectedUser.name}</b> akan memiliki hak akses sebagai{" "}
                      <span className="font-bold uppercase text-blue-700">
                        {effectiveRole}
                      </span>{" "}
                      untuk <b>{selectedFakultasUnit.nama}</b> pada tahun audit{" "}
                      <b>{watch("tahun")}</b>.
                    </p>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>{mode === "edit" ? "Perbarui Penugasan" : "Simpan Penugasan"}</span>
                      </>
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
