import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Settings as SettingsIcon,
  UserCheck,
  CalendarClock,
  Lock,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Shield,
  ChevronDown,
  ChevronUp,
  Globe,
  Building2,
  Search,
  Trash2,
  X,
  Check,
  Filter,
  Layers,
} from "lucide-react";
import Navbar from "@/Components/Navbar";
import PageHeader from "@/Components/PageHeader";
import { apiClient } from "@/Common/api";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import { useToast } from "@/Providers/ToastProvider";

const EMAIL_REGEX =
  /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function parseApiError(err, fallback) {
  const data = err?.response?.data || err?.data;
  if (data && typeof data === "object") {
    if (typeof data.error === "string" && data.error.trim() !== "") {
      return { summary: data.error, fields: {} };
    }
    if (data.message && typeof data.message === "object") {
      const fields = {};
      Object.entries(data.message).forEach(([k, v]) => {
        fields[String(k).toLowerCase()] = String(v);
      });
      const summary = Object.values(data.message).join(", ") || fallback;
      return { summary, fields };
    }
    if (typeof data.message === "string" && data.message.trim() !== "") {
      return { summary: data.message, fields: {} };
    }
  }
  const rawMsg = typeof err?.message === "string" ? err.message : "";
  if (rawMsg && rawMsg !== "[object Object]") {
    return { summary: rawMsg, fields: {} };
  }
  return { summary: fallback, fields: {} };
}

export default function SettingsPage() {
  const { user, fetchUserInfo } = useAuth();
  const { level } = useContent();
  const { addToast } = useToast();

  const isAdmin =
    String(level || "").toLowerCase() === "admin" ||
    String(user?.level || "").toLowerCase() === "admin";

  // =======================
  // STATE: EDIT ACCOUNT
  // =======================
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [accountErrors, setAccountErrors] = useState({});
  const [accountStatus, setAccountStatus] = useState(null);
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || "");
    setName(user.name || "");
    setEmail(user.email || "");
  }, [user]);

  const validateAccountForm = () => {
    const errs = {};
    const trimmedUser = username.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUser) {
      errs.username = "Username wajib diisi";
    } else if (trimmedUser.length < 3) {
      errs.username = "Username minimal 3 karakter";
    }

    if (!trimmedName) {
      errs.name = "Nama lengkap wajib diisi";
    }

    if (trimmedEmail !== "" && !EMAIL_REGEX.test(trimmedEmail)) {
      errs.email = "Format email tidak valid";
    }

    const wantsPwdChange =
      showPasswordSection &&
      (currentPassword !== "" ||
        newPassword.trim() !== "" ||
        confirmPassword.trim() !== "");

    if (wantsPwdChange) {
      if (currentPassword === "") {
        errs.currentpassword = "Password saat ini wajib diisi";
      }
      if (newPassword.trim() === "") {
        errs.newpassword = "Password baru wajib diisi";
      } else if (newPassword.trim().length < 3) {
        errs.newpassword = "Password baru minimal 3 karakter";
      }
      if (confirmPassword.trim() === "") {
        errs.confirmpassword = "Konfirmasi password baru wajib diisi";
      } else if (confirmPassword.trim() !== newPassword.trim()) {
        errs.confirmpassword = "Konfirmasi password baru tidak cocok";
      }
    }

    return { errs, wantsPwdChange };
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountStatus(null);
    const { errs, wantsPwdChange } = validateAccountForm();
    if (Object.keys(errs).length > 0) {
      setAccountErrors(errs);
      return;
    }

    setAccountErrors({});
    setSavingAccount(true);

    try {
      const payload = {
        username: username.trim(),
        name: name.trim(),
        email: email.trim(),
      };
      if (wantsPwdChange) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword.trim();
        payload.confirm_password = confirmPassword.trim();
      }

      const res = await apiClient.put("/account/profile", payload);
      await fetchUserInfo({ silent: true });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
      setShowCurrentPwd(false);
      setShowNewPwd(false);
      setShowConfirmPwd(false);

      const okMsg = res?.data?.message || "Profil akun berhasil diperbarui";
      setAccountStatus({ type: "success", text: okMsg });
      addToast("success", okMsg);
    } catch (err) {
      const parsed = parseApiError(err, "Gagal memperbarui profil akun");
      const mappedFields = { ...parsed.fields };
      const code = err?.response?.data?.code || "";
      if (code === "Account.InvalidCurrentPassword") {
        mappedFields.currentpassword = parsed.summary;
      } else if (code === "Account.UsernameDuplicate") {
        mappedFields.username = parsed.summary;
      }
      setAccountErrors(mappedFields);
      setAccountStatus({ type: "error", text: parsed.summary });
      addToast("error", parsed.summary);
    } finally {
      setSavingAccount(false);
    }
  };

  // =======================
  // STATE: PROKER BATAL SETTING (ADMIN)
  // =======================
  const [batalTab, setBatalTab] = useState("global"); // 'global' | 'unit'
  const [batalSetting, setBatalSetting] = useState(null);
  const [batalDateInput, setBatalDateInput] = useState("");
  const [loadingBatalSetting, setLoadingBatalSetting] = useState(false);
  const [batalFetchError, setBatalFetchError] = useState("");
  const [batalDateError, setBatalDateError] = useState("");
  const [batalFeedback, setBatalFeedback] = useState(null);
  const [savingBatalSetting, setSavingBatalSetting] = useState(false);

  // Unit-specific state
  const [unitOptions, setUnitOptions] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [selectedTargetUnitIds, setSelectedTargetUnitIds] = useState([]);
  const [unitDateInput, setUnitDateInput] = useState("");
  const [unitDateError, setUnitDateError] = useState("");
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const [unitTypeFilter, setUnitTypeFilter] = useState("all"); // 'all' | 'fakultas' | 'prodi' | 'unit'
  const [deletingUnitId, setDeletingUnitId] = useState(null);
  const unitDropdownRef = useRef(null);

  const fetchUnits = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUnits(true);
    try {
      const res = await apiClient.get("/proker_v3_options");
      const units = res?.data?.units || [];
      setUnitOptions(Array.isArray(units) ? units : []);
    } catch (e) {
      console.error("Gagal memuat daftar unit:", e);
    } finally {
      setLoadingUnits(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    if (!unitDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (
        unitDropdownRef.current &&
        !unitDropdownRef.current.contains(e.target)
      ) {
        setUnitDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [unitDropdownOpen]);

  const filteredUnitOptions = useMemo(() => {
    let list = unitOptions;
    if (unitTypeFilter !== "all") {
      list = list.filter(
        (u) => String(u.type || "").toLowerCase() === unitTypeFilter
      );
    }
    if (!unitSearchQuery.trim()) return list;
    const q = unitSearchQuery.toLowerCase().trim();
    return list.filter((u) => {
      const name = String(u.nama || u.nama_fak_prod_unit || "").toLowerCase();
      const type = String(u.type || "").toLowerCase();
      const fak = String(u.fakultas || "").toLowerCase();
      return name.includes(q) || type.includes(q) || fak.includes(q);
    });
  }, [unitOptions, unitTypeFilter, unitSearchQuery]);

  const fetchBatalSetting = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingBatalSetting(true);
    setBatalFetchError("");
    try {
      const res = await apiClient.get("/settings/proker-batal");
      const data = res?.data || null;
      setBatalSetting(data);
      setBatalDateInput(
        data?.global_date || data?.proker_batal_aktif_tanggal || ""
      );
    } catch (err) {
      const parsed = parseApiError(
        err,
        "Gagal memuat pengaturan tanggal aktif Proker Batal"
      );
      setBatalFetchError(parsed.summary);
    } finally {
      setLoadingBatalSetting(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchBatalSetting();
  }, [fetchBatalSetting]);

  const handleSaveBatalSetting = async (e) => {
    e.preventDefault();
    setBatalFeedback(null);

    if (!batalDateInput.trim()) {
      setBatalDateError(
        "Pilih tanggal aktif Proker Batal (Global), atau klik Reset Tanggal untuk menonaktifkan."
      );
      return;
    }

    setBatalDateError("");
    setSavingBatalSetting(true);
    try {
      const res = await apiClient.put("/settings/proker-batal", {
        global_date: batalDateInput.trim(),
      });
      const data = res?.data || {};
      setBatalSetting((prev) => ({
        ...prev,
        ...data,
      }));
      setBatalDateInput(
        data.global_date || data.proker_batal_aktif_tanggal || ""
      );
      const okMsg =
        data.message || "Tanggal aktif Proker Batal (Global) berhasil disimpan";
      setBatalFeedback({ type: "success", text: okMsg });
      addToast("success", okMsg);
    } catch (err) {
      const parsed = parseApiError(
        err,
        "Gagal menyimpan tanggal aktif Proker Batal"
      );
      setBatalFeedback({ type: "error", text: parsed.summary });
      addToast("error", parsed.summary);
    } finally {
      setSavingBatalSetting(false);
    }
  };

  const handleResetBatalSetting = async () => {
    setBatalFeedback(null);
    setBatalDateError("");
    setSavingBatalSetting(true);
    try {
      const res = await apiClient.put("/settings/proker-batal", {
        action: "reset_global",
      });
      const data = res?.data || {};
      setBatalSetting((prev) => ({
        ...prev,
        ...data,
      }));
      setBatalDateInput("");
      const okMsg =
        data.message || "Tanggal aktif Proker Batal (Global) berhasil direset";
      setBatalFeedback({ type: "success", text: okMsg });
      addToast("success", okMsg);
    } catch (err) {
      const parsed = parseApiError(
        err,
        "Gagal mereset tanggal aktif Proker Batal"
      );
      setBatalFeedback({ type: "error", text: parsed.summary });
      addToast("error", parsed.summary);
    } finally {
      setSavingBatalSetting(false);
    }
  };

  const handleSaveUnitBatalSetting = async (e) => {
    e.preventDefault();
    setBatalFeedback(null);

    if (selectedTargetUnitIds.length === 0) {
      setUnitDateError("Pilih minimal satu target fakultas atau unit.");
      return;
    }
    if (!unitDateInput.trim()) {
      setUnitDateError("Pilih tanggal aktif untuk unit yang dipilih.");
      return;
    }

    setUnitDateError("");
    setSavingBatalSetting(true);
    try {
      const res = await apiClient.put("/settings/proker-batal", {
        target_units: selectedTargetUnitIds,
        tanggal: unitDateInput.trim(),
      });
      const data = res?.data || {};
      setBatalSetting((prev) => ({
        ...prev,
        ...data,
      }));
      setSelectedTargetUnitIds([]);
      setUnitDateInput("");
      setUnitDropdownOpen(false);
      const okMsg =
        data.message || "Jadwal khusus fakultas/unit berhasil disimpan";
      setBatalFeedback({ type: "success", text: okMsg });
      addToast("success", okMsg);
    } catch (err) {
      const parsed = parseApiError(
        err,
        "Gagal menyimpan jadwal khusus unit"
      );
      setBatalFeedback({ type: "error", text: parsed.summary });
      addToast("error", parsed.summary);
    } finally {
      setSavingBatalSetting(false);
    }
  };

  const handleDeleteUnitOverride = async (unitId, unitName) => {
    setBatalFeedback(null);
    setDeletingUnitId(unitId);
    try {
      const res = await apiClient.put("/settings/proker-batal", {
        action: "delete_unit",
        delete_unit_id: unitId,
      });
      const data = res?.data || {};
      setBatalSetting((prev) => ({
        ...prev,
        ...data,
      }));
      const okMsg = `Jadwal khusus untuk ${
        unitName || `Unit #${unitId}`
      } dihapus (kembali mengikuti jadwal Global)`;
      setBatalFeedback({ type: "success", text: okMsg });
      addToast("success", okMsg);
    } catch (err) {
      const parsed = parseApiError(
        err,
        "Gagal menghapus jadwal khusus unit"
      );
      setBatalFeedback({ type: "error", text: parsed.summary });
      addToast("error", parsed.summary);
    } finally {
      setDeletingUnitId(null);
    }
  };

  const handleToggleSelectUnit = (id) => {
    setSelectedTargetUnitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    if (unitDateError) setUnitDateError("");
  };

  const handleSelectAllFilteredUnits = () => {
    const ids = filteredUnitOptions.map((u) => u.id).filter((id) => id > 0);
    setSelectedTargetUnitIds((prev) => Array.from(new Set([...prev, ...ids])));
    if (unitDateError) setUnitDateError("");
  };

  const handleClearSelectedUnits = () => {
    setSelectedTargetUnitIds([]);
  };

  const inputBaseClass = (hasErr) =>
    `w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-gray-900 outline-none transition ${
      hasErr
        ? "border-red-500 focus:border-red-600 focus:ring-3 focus:ring-red-500/15"
        : "border-gray-300 focus:border-purple-700 focus:ring-3 focus:ring-purple-700/15"
    }`;

  return (
    <>
      <Navbar />

      <main className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          <PageHeader
            icon={SettingsIcon}
            title="Pengaturan"
            subtitle={
              isAdmin
                ? "Kelola informasi akun Anda dan jadwal aktif fitur Proker Batal"
                : "Kelola informasi akun dan keamanan password Anda"
            }
          />

          <div
            className={
              isAdmin
                ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
                : "max-w-2xl"
            }
          >
            {/* ================= SECTION: EDIT ACCOUNT ================= */}
            <section
              aria-labelledby="heading-edit-account"
              className={`${
                isAdmin ? "lg:col-span-7" : ""
              } bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden`}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                    <UserCheck size={18} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2
                      id="heading-edit-account"
                      className="text-base font-bold text-gray-900"
                    >
                      Edit Account
                    </h2>
                    <p className="text-xs text-gray-600">
                      Perbarui username, nama tampilan, email, dan password akun
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 pt-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Shield size={14} className="text-purple-700 shrink-0" />
                    <span className="text-gray-600">Level:</span>
                    <span className="font-semibold text-gray-900 uppercase">
                      {user?.level || level || "-"}
                    </span>
                  </div>
                  {user?.nama_fakultas_unit && (
                    <div className="flex items-center gap-1.5 text-gray-700 min-w-0">
                      <span className="text-gray-600">Unit:</span>
                      <span className="font-semibold text-gray-900 truncate">
                        {user.nama_fakultas_unit}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveAccount} noValidate className="p-6 space-y-4">
                {accountStatus && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`rounded-lg px-3.5 py-2.5 text-xs border flex items-start gap-2 ${
                      accountStatus.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {accountStatus.type === "success" ? (
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    )}
                    <span>{accountStatus.text}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="account_username"
                    className="block text-xs font-semibold text-gray-800 mb-1.5"
                  >
                    Username / NIDN <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="account_username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (accountErrors.username) {
                        setAccountErrors((prev) => ({ ...prev, username: "" }));
                      }
                    }}
                    aria-invalid={Boolean(accountErrors.username)}
                    aria-describedby={
                      accountErrors.username
                        ? "account_username_error"
                        : undefined
                    }
                    placeholder="Masukkan username atau NIDN"
                    className={inputBaseClass(Boolean(accountErrors.username))}
                  />
                  {accountErrors.username && (
                    <p
                      id="account_username_error"
                      role="alert"
                      className="text-xs text-red-700 mt-1"
                    >
                      {accountErrors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="account_name"
                    className="block text-xs font-semibold text-gray-800 mb-1.5"
                  >
                    Nama Lengkap <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="account_name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (accountErrors.name) {
                        setAccountErrors((prev) => ({ ...prev, name: "" }));
                      }
                    }}
                    aria-invalid={Boolean(accountErrors.name)}
                    aria-describedby={
                      accountErrors.name ? "account_name_error" : undefined
                    }
                    placeholder="Masukkan nama lengkap"
                    className={inputBaseClass(Boolean(accountErrors.name))}
                  />
                  {accountErrors.name && (
                    <p
                      id="account_name_error"
                      role="alert"
                      className="text-xs text-red-700 mt-1"
                    >
                      {accountErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="account_email"
                    className="block text-xs font-semibold text-gray-800 mb-1.5"
                  >
                    Email{" "}
                    <span className="text-gray-600 font-normal">(Opsional)</span>
                  </label>
                  <input
                    id="account_email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (accountErrors.email) {
                        setAccountErrors((prev) => ({ ...prev, email: "" }));
                      }
                    }}
                    aria-invalid={Boolean(accountErrors.email)}
                    aria-describedby={
                      accountErrors.email
                        ? "account_email_error"
                        : "account_email_help"
                    }
                    placeholder="nama@unpak.ac.id"
                    className={inputBaseClass(Boolean(accountErrors.email))}
                  />
                  {accountErrors.email ? (
                    <p
                      id="account_email_error"
                      role="alert"
                      className="text-xs text-red-700 mt-1"
                    >
                      {accountErrors.email}
                    </p>
                  ) : (
                    <p
                      id="account_email_help"
                      className="text-xs text-gray-600 mt-1"
                    >
                      Kosongkan jika akun tidak memakai alamat email.
                    </p>
                  )}
                </div>

                {/* Disclosure: Ganti Password */}
                <div className="pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    aria-expanded={showPasswordSection}
                    aria-controls="password-change-panel"
                    onClick={() => {
                      if (showPasswordSection) {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setAccountErrors((prev) => {
                          const next = { ...prev };
                          delete next.currentpassword;
                          delete next.newpassword;
                          delete next.confirmpassword;
                          return next;
                        });
                      }
                      setShowPasswordSection((v) => !v);
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-purple-800 hover:text-purple-900 py-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 rounded"
                  >
                    <Lock size={14} />
                    <span>
                      {showPasswordSection
                        ? "Batal Ubah Password"
                        : "Ubah Password Akun"}
                    </span>
                    {showPasswordSection ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>

                  {showPasswordSection && (
                    <fieldset
                      id="password-change-panel"
                      className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3"
                    >
                      <legend className="sr-only">Formulir Ubah Password</legend>

                      <div>
                        <label
                          htmlFor="account_current_password"
                          className="block text-xs font-semibold text-gray-800 mb-1"
                        >
                          Password Saat Ini{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="account_current_password"
                            name="current_password"
                            type={showCurrentPwd ? "text" : "password"}
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => {
                              setCurrentPassword(e.target.value);
                              if (accountErrors.currentpassword) {
                                setAccountErrors((prev) => ({
                                  ...prev,
                                  currentpassword: "",
                                }));
                              }
                            }}
                            aria-invalid={Boolean(accountErrors.currentpassword)}
                            aria-describedby={
                              accountErrors.currentpassword
                                ? "account_current_password_error"
                                : undefined
                            }
                            placeholder="Masukkan password saat ini"
                            className={`${inputBaseClass(
                              Boolean(accountErrors.currentpassword)
                            )} pr-10`}
                          />
                          <button
                            type="button"
                            aria-label={
                              showCurrentPwd
                                ? "Sembunyikan password saat ini"
                                : "Lihat password saat ini"
                            }
                            aria-pressed={showCurrentPwd}
                            onClick={() => setShowCurrentPwd((v) => !v)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-900 cursor-pointer"
                          >
                            {showCurrentPwd ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                        {accountErrors.currentpassword && (
                          <p
                            id="account_current_password_error"
                            role="alert"
                            className="text-xs text-red-700 mt-1"
                          >
                            {accountErrors.currentpassword}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="account_new_password"
                            className="block text-xs font-semibold text-gray-800 mb-1"
                          >
                            Password Baru <span className="text-red-600">*</span>
                          </label>
                          <div className="relative">
                            <input
                              id="account_new_password"
                              name="new_password"
                              type={showNewPwd ? "text" : "password"}
                              autoComplete="new-password"
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                if (accountErrors.newpassword) {
                                  setAccountErrors((prev) => ({
                                    ...prev,
                                    newpassword: "",
                                  }));
                                }
                              }}
                              aria-invalid={Boolean(accountErrors.newpassword)}
                              aria-describedby={
                                accountErrors.newpassword
                                  ? "account_new_password_error"
                                  : undefined
                              }
                              placeholder="Minimal 3 karakter"
                              className={`${inputBaseClass(
                                Boolean(accountErrors.newpassword)
                              )} pr-10`}
                            />
                            <button
                              type="button"
                              aria-label={
                                showNewPwd
                                  ? "Sembunyikan password baru"
                                  : "Lihat password baru"
                              }
                              aria-pressed={showNewPwd}
                              onClick={() => setShowNewPwd((v) => !v)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-900 cursor-pointer"
                            >
                              {showNewPwd ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                          {accountErrors.newpassword && (
                            <p
                              id="account_new_password_error"
                              role="alert"
                              className="text-xs text-red-700 mt-1"
                            >
                              {accountErrors.newpassword}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="account_confirm_password"
                            className="block text-xs font-semibold text-gray-800 mb-1"
                          >
                            Konfirmasi Password{" "}
                            <span className="text-red-600">*</span>
                          </label>
                          <div className="relative">
                            <input
                              id="account_confirm_password"
                              name="confirm_password"
                              type={showConfirmPwd ? "text" : "password"}
                              autoComplete="new-password"
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (accountErrors.confirmpassword) {
                                  setAccountErrors((prev) => ({
                                    ...prev,
                                    confirmpassword: "",
                                  }));
                                }
                              }}
                              aria-invalid={Boolean(
                                accountErrors.confirmpassword
                              )}
                              aria-describedby={
                                accountErrors.confirmpassword
                                  ? "account_confirm_password_error"
                                  : undefined
                              }
                              placeholder="Ulangi password baru"
                              className={`${inputBaseClass(
                                Boolean(accountErrors.confirmpassword)
                              )} pr-10`}
                            />
                            <button
                              type="button"
                              aria-label={
                                showConfirmPwd
                                  ? "Sembunyikan konfirmasi password"
                                  : "Lihat konfirmasi password"
                              }
                              aria-pressed={showConfirmPwd}
                              onClick={() => setShowConfirmPwd((v) => !v)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-900 cursor-pointer"
                            >
                              {showConfirmPwd ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                          {accountErrors.confirmpassword && (
                            <p
                              id="account_confirm_password_error"
                              role="alert"
                              className="text-xs text-red-700 mt-1"
                            >
                              {accountErrors.confirmpassword}
                            </p>
                          )}
                        </div>
                      </div>
                    </fieldset>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={savingAccount}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-semibold shadow-2xs transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 min-w-[172px]"
                  >
                    {savingAccount ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Simpan Akun</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* ================= SECTION: PROKER BATAL ACTIVATION DATE (ADMIN ONLY) ================= */}
            {isAdmin && (
              <section
                aria-labelledby="heading-proker-batal-setting"
                className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                      <CalendarClock size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2
                        id="heading-proker-batal-setting"
                        className="text-base font-bold text-gray-900"
                      >
                        Tanggal Aktif Proker Batal
                      </h2>
                      <p className="text-xs text-gray-600">
                        Pengaturan khusus level Admin
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {loadingBatalSetting ? (
                    <div className="space-y-3" aria-busy="true" aria-label="Memuat pengaturan">
                      <div className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="h-11 rounded-xl bg-gray-100 animate-pulse" />
                      <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
                    </div>
                  ) : batalFetchError ? (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-800 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{batalFetchError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={fetchBatalSetting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-800 font-semibold hover:bg-red-100 cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>Muat Ulang</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Segmented Tab Selector */}
                      <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl mb-4 border border-gray-200/60">
                        <button
                          type="button"
                          onClick={() => {
                            setBatalTab("global");
                            setBatalFeedback(null);
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            batalTab === "global"
                              ? "bg-white text-purple-700 shadow-2xs border border-gray-200/80"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                          }`}
                        >
                          <Globe
                            size={14}
                            className={
                              batalTab === "global"
                                ? "text-purple-600"
                                : "text-gray-400"
                            }
                          />
                          <span>Default (Global)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBatalTab("unit");
                            setBatalFeedback(null);
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            batalTab === "unit"
                              ? "bg-white text-purple-700 shadow-2xs border border-gray-200/80"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                          }`}
                        >
                          <Building2
                            size={14}
                            className={
                              batalTab === "unit"
                                ? "text-purple-600"
                                : "text-gray-400"
                            }
                          />
                          <span>Target Spesifik Unit</span>
                          {Array.isArray(batalSetting?.units) &&
                            batalSetting.units.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                {batalSetting.units.length}
                              </span>
                            )}
                        </button>
                      </div>

                      {/* Feedback banner */}
                      {batalFeedback && (
                        <div
                          role="status"
                          aria-live="polite"
                          className={`rounded-lg px-3.5 py-2.5 mb-4 text-xs border flex items-start gap-2 ${
                            batalFeedback.type === "success"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-red-50 border-red-200 text-red-800"
                          }`}
                        >
                          {batalFeedback.type === "success" ? (
                            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          )}
                          <span>{batalFeedback.text}</span>
                        </div>
                      )}

                      {batalTab === "global" ? (
                        <>
                          {/* Live Status Panel (Global) */}
                          <div
                            className={`rounded-lg px-4 py-3 border text-xs space-y-1 ${
                              batalSetting?.status === "aktif"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : batalSetting?.status === "belum_aktif"
                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                : "bg-gray-50 border-gray-200 text-gray-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  batalSetting?.status === "aktif"
                                    ? "bg-emerald-600"
                                    : batalSetting?.status === "belum_aktif"
                                    ? "bg-amber-600"
                                    : "bg-gray-500"
                                }`}
                              />
                              <span>
                                Status Fitur (Global):{" "}
                                {batalSetting?.status_label || "Belum Diatur"}
                              </span>
                            </div>
                            <p className="leading-relaxed">
                              {batalSetting?.message ||
                                "Fitur Proker Batal nonaktif untuk user unit sampai tanggal mulai ditentukan."}
                            </p>
                            {batalSetting?.updated_at && (
                              <p className="text-[11px] opacity-90 pt-0.5">
                                Terakhir diperbarui: {batalSetting.updated_at}
                              </p>
                            )}
                          </div>

                          <form
                            onSubmit={handleSaveBatalSetting}
                            noValidate
                            className="space-y-4 mt-4"
                          >
                            <div>
                              <label
                                htmlFor="proker_batal_aktif_tanggal"
                                className="block text-xs font-semibold text-gray-800 mb-1.5"
                              >
                                Aktif Mulai Tanggal (Global)
                              </label>
                              <input
                                id="proker_batal_aktif_tanggal"
                                name="proker_batal_aktif_tanggal"
                                type="date"
                                value={batalDateInput}
                                onChange={(e) => {
                                  setBatalDateInput(e.target.value);
                                  if (batalDateError) setBatalDateError("");
                                }}
                                aria-invalid={Boolean(batalDateError)}
                                aria-describedby={
                                  batalDateError
                                    ? "batal_date_error"
                                    : "batal_date_help"
                                }
                                className={inputBaseClass(Boolean(batalDateError))}
                              />
                              {batalDateError ? (
                                <p
                                  id="batal_date_error"
                                  role="alert"
                                  className="text-xs text-red-700 mt-1"
                                >
                                  {batalDateError}
                                </p>
                              ) : (
                                <p
                                  id="batal_date_help"
                                  className="text-xs text-gray-600 mt-1.5 leading-relaxed"
                                >
                                  Jadwal default ini berlaku untuk semua unit dan fakultas yang tidak memiliki jadwal khusus tersendiri.
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 pt-1">
                              <button
                                type="submit"
                                disabled={savingBatalSetting}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-semibold shadow-2xs transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2"
                              >
                                {savingBatalSetting ? (
                                  <>
                                    <RefreshCw size={15} className="animate-spin" />
                                    <span>Menyimpan...</span>
                                  </>
                                ) : (
                                  <>
                                    <Save size={15} />
                                    <span>Simpan Tanggal Global</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  savingBatalSetting ||
                                  (!batalSetting?.has_date && !batalDateInput)
                                }
                                onClick={handleResetBatalSetting}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 text-xs font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                              >
                                <RotateCcw size={14} />
                                <span>Reset Global</span>
                              </button>
                            </div>
                          </form>
                        </>
                      ) : (
                        /* UNIT SPECIFIC TAB */
                        <div className="space-y-5">
                          <form
                            onSubmit={handleSaveUnitBatalSetting}
                            noValidate
                            className="p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-2xl space-y-3.5"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                <Building2 size={14} className="text-purple-600" />
                                <span>Atur Target Fakultas / Unit</span>
                              </h3>
                              {selectedTargetUnitIds.length > 0 && (
                                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                  {selectedTargetUnitIds.length} unit terpilih
                                </span>
                              )}
                            </div>

                            {/* Dropdown Multi-Select Trigger & Popover */}
                            <div className="relative" ref={unitDropdownRef}>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Pilih Unit / Fakultas (Multiple Target)
                              </label>
                              <button
                                type="button"
                                onClick={() => setUnitDropdownOpen((prev) => !prev)}
                                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                                  unitDropdownOpen
                                    ? "border-purple-600 ring-2 ring-purple-500/20"
                                    : "border-gray-300 hover:border-gray-400"
                                }`}
                              >
                                {selectedTargetUnitIds.length === 0 ? (
                                  <span className="text-gray-400">
                                    Pilih satu atau lebih target fakultas / unit...
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                                    <span className="px-1.5 py-0.5 rounded bg-purple-700 text-white font-bold text-[10px]">
                                      {selectedTargetUnitIds.length} Dipilih
                                    </span>
                                    {selectedTargetUnitIds.slice(0, 2).map((id) => {
                                      const u = unitOptions.find((opt) => opt.id === id);
                                      const name = u?.nama || u?.nama_fak_prod_unit || `Unit #${id}`;
                                      return (
                                        <span
                                          key={id}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[11px] max-w-[150px] truncate"
                                        >
                                          <span className="truncate">{name}</span>
                                        </span>
                                      );
                                    })}
                                    {selectedTargetUnitIds.length > 2 && (
                                      <span className="text-[11px] text-gray-500 font-medium">
                                        +{selectedTargetUnitIds.length - 2} lainnya
                                      </span>
                                    )}
                                  </div>
                                )}
                                <ChevronDown
                                  size={15}
                                  className={`text-gray-400 shrink-0 transition-transform ${
                                    unitDropdownOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              {/* Dropdown Popover */}
                              {unitDropdownOpen && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden text-xs">
                                  {/* Filter & Search Header */}
                                  <div className="p-2.5 bg-gray-50 border-b border-gray-100 space-y-2">
                                    <div className="relative">
                                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                      <input
                                        type="text"
                                        value={unitSearchQuery}
                                        onChange={(e) => setUnitSearchQuery(e.target.value)}
                                        placeholder="Cari nama fakultas / prodi / unit..."
                                        className="w-full pl-7 pr-6 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                                      />
                                      {unitSearchQuery && (
                                        <button
                                          type="button"
                                          onClick={() => setUnitSearchQuery("")}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                        >
                                          <X size={12} />
                                        </button>
                                      )}
                                    </div>

                                    {/* Type filter buttons */}
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {["all", "fakultas", "prodi", "unit"].map((typeKey) => (
                                        <button
                                          key={typeKey}
                                          type="button"
                                          onClick={() => setUnitTypeFilter(typeKey)}
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer capitalize ${
                                            unitTypeFilter === typeKey
                                              ? "bg-purple-700 text-white"
                                              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                                          }`}
                                        >
                                          {typeKey === "all" ? "Semua Tipe" : typeKey}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Batch select / clear actions */}
                                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                                      <button
                                        type="button"
                                        onClick={handleSelectAllFilteredUnits}
                                        className="text-purple-700 hover:underline font-semibold cursor-pointer"
                                      >
                                        Pilih Semua Filtered ({filteredUnitOptions.length})
                                      </button>
                                      {selectedTargetUnitIds.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={handleClearSelectedUnits}
                                          className="text-red-600 hover:underline font-semibold cursor-pointer"
                                        >
                                          Kosongkan
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* List of Units */}
                                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                                    {loadingUnits ? (
                                      <div className="py-4 text-center text-gray-400">
                                        Memuat daftar unit...
                                      </div>
                                    ) : filteredUnitOptions.length === 0 ? (
                                      <div className="py-4 text-center text-gray-400">
                                        Tidak ada unit ditemukan
                                      </div>
                                    ) : (
                                      filteredUnitOptions.map((u) => {
                                        const isChecked = selectedTargetUnitIds.includes(u.id);
                                        const name = u.nama || u.nama_fak_prod_unit || `Unit #${u.id}`;
                                        return (
                                          <label
                                            key={u.id}
                                            className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition select-none ${
                                              isChecked
                                                ? "bg-purple-50/70 text-purple-900 font-semibold"
                                                : "hover:bg-gray-50 text-gray-700"
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleSelectUnit(u.id)}
                                                className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                              />
                                              <span className="truncate">{name}</span>
                                            </div>
                                            {u.type && (
                                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                                                {u.type}
                                              </span>
                                            )}
                                          </label>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Selected Chips Preview */}
                            {selectedTargetUnitIds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white border border-gray-200 rounded-xl">
                                {selectedTargetUnitIds.map((id) => {
                                  const u = unitOptions.find((opt) => opt.id === id);
                                  const name = u?.nama || u?.nama_fak_prod_unit || `Unit #${id}`;
                                  return (
                                    <span
                                      key={id}
                                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-[11px]"
                                    >
                                      <span className="truncate max-w-[120px]">{name}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleSelectUnit(id)}
                                        className="text-purple-400 hover:text-purple-700 cursor-pointer p-0.5"
                                      >
                                        <X size={11} />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Date Input for selected units */}
                            <div>
                              <label
                                htmlFor="unit_batal_aktif_tanggal"
                                className="block text-xs font-semibold text-gray-800 mb-1"
                              >
                                Aktif Mulai Tanggal untuk Unit Terpilih
                              </label>
                              <input
                                id="unit_batal_aktif_tanggal"
                                name="unit_batal_aktif_tanggal"
                                type="date"
                                value={unitDateInput}
                                onChange={(e) => {
                                  setUnitDateInput(e.target.value);
                                  if (unitDateError) setUnitDateError("");
                                }}
                                aria-invalid={Boolean(unitDateError)}
                                className={inputBaseClass(Boolean(unitDateError))}
                              />
                              {unitDateError && (
                                <p role="alert" className="text-xs text-red-700 mt-1">
                                  {unitDateError}
                                </p>
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={savingBatalSetting}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                            >
                              {savingBatalSetting ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" />
                                  <span>Menyimpan...</span>
                                </>
                              ) : (
                                <>
                                  <Save size={13} />
                                  <span>
                                    Terapkan ke{" "}
                                    {selectedTargetUnitIds.length > 0
                                      ? `${selectedTargetUnitIds.length} Unit Terpilih`
                                      : "Unit Terpilih"}
                                  </span>
                                </>
                              )}
                            </button>
                          </form>

                          {/* List of Configured Unit Overrides */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                <Layers size={13} className="text-purple-600" />
                                <span>
                                  Daftar Jadwal Khusus Unit (
                                  {batalSetting?.units?.length || 0})
                                </span>
                              </h4>
                            </div>

                            {Array.isArray(batalSetting?.units) &&
                            batalSetting.units.length > 0 ? (
                              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden bg-white">
                                {batalSetting.units.map((u) => (
                                  <div
                                    key={u.id_fakultas_unit}
                                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-gray-50/80 transition"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-xs text-gray-900 truncate">
                                          {u.nama_fakultas_unit ||
                                            `Unit #${u.id_fakultas_unit}`}
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            u.is_active
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-amber-100 text-amber-800"
                                          }`}
                                        >
                                          {u.status_label ||
                                            (u.is_active
                                              ? "Aktif"
                                              : "Belum Aktif")}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-gray-500 mt-0.5">
                                        Aktif mulai:{" "}
                                        <span className="font-medium text-gray-700">
                                          {u.tanggal}
                                        </span>
                                        {u.updated_at && (
                                          <span className="text-[10px] text-gray-400 ml-2">
                                            ({u.updated_at})
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={
                                        deletingUnitId === u.id_fakultas_unit
                                      }
                                      onClick={() =>
                                        handleDeleteUnitOverride(
                                          u.id_fakultas_unit,
                                          u.nama_fakultas_unit
                                        )
                                      }
                                      title="Hapus jadwal khusus ini (unit akan kembali mengikuti jadwal Global)"
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-40"
                                    >
                                      {deletingUnitId === u.id_fakultas_unit ? (
                                        <RefreshCw
                                          size={13}
                                          className="animate-spin text-red-600"
                                        />
                                      ) : (
                                        <Trash2 size={13} />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                <p className="text-xs text-gray-500">
                                  Belum ada jadwal khusus per unit. Seluruh
                                  fakultas dan unit saat ini mengikuti jadwal
                                  Global.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
