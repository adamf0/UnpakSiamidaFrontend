import React, { useCallback, useEffect, useState } from "react";
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
  const [batalSetting, setBatalSetting] = useState(null);
  const [batalDateInput, setBatalDateInput] = useState("");
  const [loadingBatalSetting, setLoadingBatalSetting] = useState(false);
  const [batalFetchError, setBatalFetchError] = useState("");
  const [batalDateError, setBatalDateError] = useState("");
  const [batalFeedback, setBatalFeedback] = useState(null);
  const [savingBatalSetting, setSavingBatalSetting] = useState(false);

  const fetchBatalSetting = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingBatalSetting(true);
    setBatalFetchError("");
    try {
      const res = await apiClient.get("/settings/proker-batal");
      const data = res?.data || null;
      setBatalSetting(data);
      setBatalDateInput(data?.proker_batal_aktif_tanggal || "");
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
        "Pilih tanggal aktif Proker Batal, atau klik Reset Tanggal untuk menonaktifkan."
      );
      return;
    }

    setBatalDateError("");
    setSavingBatalSetting(true);
    try {
      const res = await apiClient.put("/settings/proker-batal", {
        proker_batal_aktif_tanggal: batalDateInput.trim(),
      });
      const data = res?.data || {};
      setBatalSetting({
        setting_key: data.setting_key,
        proker_batal_aktif_tanggal: data.proker_batal_aktif_tanggal || "",
        has_date: Boolean(data.has_date),
        is_active: Boolean(data.is_active),
        status: data.status,
        status_label: data.status_label,
        message: data.detail_message || "",
        updated_at: data.updated_at || "",
      });
      setBatalDateInput(data.proker_batal_aktif_tanggal || "");
      const okMsg =
        data.message || "Tanggal aktif Proker Batal berhasil disimpan";
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
        proker_batal_aktif_tanggal: "",
      });
      const data = res?.data || {};
      setBatalSetting({
        setting_key: data.setting_key,
        proker_batal_aktif_tanggal: "",
        has_date: false,
        is_active: false,
        status: data.status || "belum_diatur",
        status_label: data.status_label || "Belum Diatur",
        message: data.detail_message || "",
        updated_at: data.updated_at || "",
      });
      setBatalDateInput("");
      const okMsg =
        data.message || "Tanggal aktif Proker Batal berhasil direset";
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
                      {/* Live Status Panel */}
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
                            Status Fitur:{" "}
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

                      {batalFeedback && (
                        <div
                          role="status"
                          aria-live="polite"
                          className={`rounded-lg px-3.5 py-2.5 text-xs border flex items-start gap-2 ${
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

                      <form
                        onSubmit={handleSaveBatalSetting}
                        noValidate
                        className="space-y-4"
                      >
                        <div>
                          <label
                            htmlFor="proker_batal_aktif_tanggal"
                            className="block text-xs font-semibold text-gray-800 mb-1.5"
                          >
                            Aktif Mulai Tanggal
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
                              Switch Proker Batal dan Aktivitas Batal pada user
                              fakultas atau unit aktif mulai tanggal ini pukul
                              00:00 WIB.
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
                                <span>Simpan Tanggal</span>
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
                            <span>Reset</span>
                          </button>
                        </div>
                      </form>
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
