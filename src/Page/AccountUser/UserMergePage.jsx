import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import PageHeader from "@/Components/PageHeader";
import Tooltip from "@/Components/Tooltip";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import { apiClient } from "@/Common/api";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import {
  GitMerge,
  ArrowLeft,
  Search,
  X,
  Crown,
  Users,
  Check,
  RotateCcw,
  GripVertical,
  AlertCircle,
  Building2,
  Mail,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Trash2,
  RefreshCw,
  Unlink,
  Lock,
} from "lucide-react";

const LEVEL_BADGES = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  fakultas: "bg-blue-100 text-blue-800 border-blue-200",
  auditee: "bg-emerald-100 text-emerald-800 border-emerald-200",
  auditor1: "bg-amber-100 text-amber-800 border-amber-200",
  auditor2: "bg-orange-100 text-orange-800 border-orange-200",
  user: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function UserMergePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { getValidToken } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMergeStatus, setFilterMergeStatus] = useState("all"); // 'all' | 'unmerged' | 'merged'
  const [filterRole, setFilterRole] = useState("all");

  // Selection states
  const [primaryUser, setPrimaryUser] = useState(null);
  const [secondaryUsers, setSecondaryUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag states
  const [isOverPrimary, setIsOverPrimary] = useState(false);
  const [isOverSecondary, setIsOverSecondary] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await apiClient.get("/users?mode=all");
      const data = res.data;
      const userList = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setAllUsers(userList);
    } catch (err) {
      console.error("Fetch users error:", err);
      addToast("error", err?.message || "Gagal memuat daftar user dari server");
    } finally {
      setLoadingUsers(false);
    }
  }, [getValidToken, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Helper to check if an account is already merged
  const isUserAlreadyMerged = (user) => {
    return Boolean(user?.IdUserMerge || user?.id_user_merge);
  };

  // Set as primary handler
  const handleSetPrimary = (user) => {
    if (!user) return;

    if (isUserAlreadyMerged(user)) {
      addToast(
        "warning",
        `Akun "${user.Name || user.Username}" sudah di-merge ke akun lain. Silakan unmerge terlebih dahulu jika ingin menjadikannya Primary.`
      );
      return;
    }

    // Jika user ini sedang ada di secondary, hapus dari secondary
    if (secondaryUsers.some((u) => u.ID === user.ID)) {
      setSecondaryUsers((prev) => prev.filter((u) => u.ID !== user.ID));
      addToast(
        "info",
        `Akun "${user.Name || user.Username}" dipindahkan dari Secondary ke Primary.`
      );
    }

    setPrimaryUser(user);
  };

  // Add to secondary handler
  const handleAddToSecondary = (user) => {
    if (!user) return;

    if (isUserAlreadyMerged(user)) {
      addToast(
        "warning",
        `Akun "${user.Name || user.Username}" sudah di-merge ke akun lain. Silakan unmerge terlebih dahulu jika ingin menjadikannya Secondary.`
      );
      return;
    }

    if (primaryUser && primaryUser.ID === user.ID) {
      addToast(
        "warning",
        "Akun ini sudah ditetapkan sebagai Primary. Tidak boleh ada di Secondary."
      );
      return;
    }

    if (secondaryUsers.some((u) => u.ID === user.ID)) {
      addToast("info", "Akun ini sudah ada di daftar Secondary.");
      return;
    }

    setSecondaryUsers((prev) => [...prev, user]);
  };

  // Remove from secondary
  const handleRemoveSecondary = (id) => {
    setSecondaryUsers((prev) => prev.filter((u) => u.ID !== id));
  };

  // Clear all
  const handleReset = () => {
    setPrimaryUser(null);
    setSecondaryUsers([]);
    addToast("info", "Area seleksi berhasil dikosongkan.");
  };

  // Drag and Drop handlers
  const handleDragStart = (e, user) => {
    if (isUserAlreadyMerged(user)) {
      e.preventDefault();
      addToast(
        "warning",
        `Data "${user.Name || user.Username}" yang sudah di-merge tidak dapat di-drag drop kecuali di-unmerge terlebih dahulu.`
      );
      return false;
    }
    e.dataTransfer.setData("application/json", JSON.stringify(user));
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const handleDropPrimary = (e) => {
    e.preventDefault();
    setIsOverPrimary(false);
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const user = JSON.parse(dataStr);
      if (isUserAlreadyMerged(user)) {
        addToast(
          "warning",
          `Data "${user.Name || user.Username}" yang sudah di-merge tidak dapat di-drag drop kecuali di-unmerge terlebih dahulu.`
        );
        return;
      }
      handleSetPrimary(user);
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  const handleDropSecondary = (e) => {
    e.preventDefault();
    setIsOverSecondary(false);
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const user = JSON.parse(dataStr);
      if (isUserAlreadyMerged(user)) {
        addToast(
          "warning",
          `Data "${user.Name || user.Username}" yang sudah di-merge tidak dapat di-drag drop kecuali di-unmerge terlebih dahulu.`
        );
        return;
      }
      handleAddToSecondary(user);
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  // Quick unmerge an individual user directly
  const handleUnmergeUser = async (user) => {
    if (!user) return;
    const confirmUnmerge = window.confirm(
      `Apakah Anda yakin ingin membatalkan status merger untuk akun "${user.Name || user.Username}"?`
    );
    if (!confirmUnmerge) return;

    try {
      await apiClient.post("/users/merge", {
        primary_id: user.ID,
        primary_uuid: user.UUID,
        secondary_ids: [],
        secondary_uuids: [],
      });
      addToast("success", `Akun "${user.Name || user.Username}" berhasil di-unmerge.`);
      fetchUsers();
    } catch (err) {
      console.error("Unmerge error:", err);
      addToast("error", err?.message || "Server tidak dapat dihubungi saat unmerge.");
    }
  };

  // Submit Merge
  const handleSubmitMerge = async () => {
    if (!primaryUser) {
      addToast("warning", "Pilih 1 Akun Primary terlebih dahulu.");
      return;
    }

    if (secondaryUsers.length === 0) {
      addToast(
        "warning",
        "Pilih setidaknya 1 Akun Secondary untuk digabungkan ke Primary."
      );
      return;
    }

    // Pastikan tidak ada konflik primary di secondary
    const conflict = secondaryUsers.some((u) => u.ID === primaryUser.ID);
    if (conflict) {
      addToast(
        "error",
        "Akun Primary tidak boleh tercantum dalam daftar Akun Secondary."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        primary_id: primaryUser.ID,
        primary_uuid: primaryUser.UUID,
        secondary_ids: secondaryUsers.map((u) => u.ID),
        secondary_uuids: secondaryUsers.map((u) => u.UUID),
      };

      await apiClient.post("/users/merge", payload);

      addToast(
        "success",
        `Berhasil menggabungkan ${secondaryUsers.length} akun ke "${primaryUser.Name || primaryUser.Username}".`
      );
      // Refresh list user dan reset form
      setPrimaryUser(null);
      setSecondaryUsers([]);
      fetchUsers();
    } catch (err) {
      console.error("Submit merge error:", err);
      addToast("error", err?.message || "Terjadi kesalahan koneksi ke server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Users for Sidebar
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (u?.Name || u?.name || "").toLowerCase().includes(q);
        const matchUsername = (u?.Username || u?.nidn_username || "")
          .toLowerCase()
          .includes(q);
        const matchEmail = (u?.Email || u?.email || "").toLowerCase().includes(q);
        const matchRole = (u?.Level || u?.level || "").toLowerCase().includes(q);
        if (!matchName && !matchUsername && !matchEmail && !matchRole) {
          return false;
        }
      }

      // Merge status filter
      const isMerged = Boolean(u?.IdUserMerge || u?.id_user_merge);
      if (filterMergeStatus === "unmerged" && isMerged) return false;
      if (filterMergeStatus === "merged" && !isMerged) return false;

      // Role filter
      if (
        filterRole !== "all" &&
        (u?.Level || u?.level || "").toLowerCase() !== filterRole.toLowerCase()
      ) {
        return false;
      }

      return true;
    });
  }, [allUsers, searchQuery, filterMergeStatus, filterRole]);

  return (
    <>
      <Navbar
        renderChangeLevelModal={() => (
          <ChangeLevelModal
            open={openChangeLevel}
            onClose={() => setOpenChangeLevel(false)}
            levels={listLevel}
            currentLevel={level}
            onSubmit={(val) => {
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />

      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header Card */}
          <PageHeader
            icon={GitMerge}
            title="Merging Data Akun Pengguna"
            subtitle="Gabungkan akun ganda atau multi-role ke dalam satu akun Primary (induk)"
            actions={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/users")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>

                {(primaryUser || secondaryUsers.length > 0) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                    title="Kosongkan area Primary & Secondary"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSubmitMerge}
                  disabled={!primaryUser || secondaryUsers.length === 0 || isSubmitting}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer ${
                    !primaryUser || secondaryUsers.length === 0 || isSubmitting
                      ? "bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Penggabungan</span>
                    </>
                  )}
                </button>
              </div>
            }
          />

          {/* Main Grid: Workspace (Left) & Sidebar (Right) */}
          <div className="grid grid-cols-12 gap-5">
            {/* WORKSPACE AREA (Left) */}
            <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-5">
              {/* Petunjuk Penggunaan Banner */}
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100/80 rounded-xl p-4 text-xs text-indigo-900 flex items-start gap-3">
                <div className="p-2 bg-white/80 rounded-lg text-indigo-600 shadow-xs shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-indigo-950">
                    Cara Melakukan Penggabungan Akun:
                  </p>
                  <p className="text-indigo-800 leading-relaxed">
                    1. Tarik (drag) atau klik <strong>"+ Primary"</strong> pada akun utama yang akan menjadi akun induk.
                    <br />
                    2. Tarik atau klik <strong>"+ Secondary"</strong> pada satu atau lebih akun yang ingin digabungkan ke akun utama.
                    <br />
                    3. Klik <strong>"Simpan Penggabungan"</strong>. Akun-akun sekunder akan menyimpan ID akun utama pada kolom <code>id_user_merge</code>.
                  </p>
                </div>
              </div>

              {/* 1. SECTION PRIMARY */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden transition-all">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <span>1. Akun Primary (Akun Utama)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Maksimal 1 Data
                        </span>
                      </h2>
                      <p className="text-xs text-gray-500">
                        Akun ini menjadi acuan data induk. Nilai id_user_merge pada akun ini akan direset (NULL / Mandiri).
                      </p>
                    </div>
                  </div>
                  {primaryUser && (
                    <button
                      type="button"
                      onClick={() => setPrimaryUser(null)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsOverPrimary(true);
                  }}
                  onDragLeave={() => setIsOverPrimary(false)}
                  onDrop={handleDropPrimary}
                  className={`p-5 transition-all min-h-[140px] flex items-center justify-center ${
                    isOverPrimary
                      ? "bg-indigo-50/70 border-2 border-dashed border-indigo-500"
                      : primaryUser
                      ? "bg-white"
                      : "bg-gray-50/60 border-2 border-dashed border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {primaryUser ? (
                    <div className="w-full bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 border border-indigo-200 rounded-xl p-4 shadow-xs relative">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                            {primaryUser.Name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-gray-900">
                                {primaryUser.Name || primaryUser.Username}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                                  LEVEL_BADGES[
                                    (primaryUser.Level || "user").toLowerCase()
                                  ] || "bg-gray-100 text-gray-700 border-gray-200"
                                }`}
                              >
                                {primaryUser.Level || "user"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-indigo-100/80 text-indigo-700 font-medium">
                                ID: #{primaryUser.ID}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-600 mt-1 flex-wrap">
                              <span className="font-mono text-gray-700">
                                @{primaryUser.Username || primaryUser.nidn_username}
                              </span>
                              {primaryUser.Email && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Mail className="w-3 h-3" />
                                  <span>{primaryUser.Email}</span>
                                </span>
                              )}
                              {(primaryUser.NamaFakultasUnit ||
                                primaryUser.nama_fak_prod_unit) && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Building2 className="w-3 h-3" />
                                  <span>
                                    {primaryUser.NamaFakultasUnit ||
                                      primaryUser.nama_fak_prod_unit}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Induk Primary</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 px-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-3">
                        <Crown className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700">
                        Belum Ada Akun Primary
                      </p>
                      <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                        Tarik (Drag & Drop) kartu akun dari sidebar samping ke sini,
                        atau klik tombol <strong>"+ Primary"</strong> pada akun yang dipilih.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. SECTION SECONDARY */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden transition-all">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <span>2. Akun Secondary (Akun Yang Digabungkan)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          {secondaryUsers.length} Data Dipilih
                        </span>
                      </h2>
                      <p className="text-xs text-gray-500">
                        Akun-akun sekunder yang datanya akan dialihkan ke Akun Primary. Kolom id_user_merge akun ini akan diisi ID Primary.
                      </p>
                    </div>
                  </div>
                  {secondaryUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSecondaryUsers([])}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kosongkan ({secondaryUsers.length})</span>
                    </button>
                  )}
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsOverSecondary(true);
                  }}
                  onDragLeave={() => setIsOverSecondary(false)}
                  onDrop={handleDropSecondary}
                  className={`p-5 transition-all min-h-[160px] ${
                    isOverSecondary
                      ? "bg-amber-50/70 border-2 border-dashed border-amber-500"
                      : secondaryUsers.length > 0
                      ? "bg-white"
                      : "bg-gray-50/60 border-2 border-dashed border-gray-200 hover:border-amber-300 flex items-center justify-center"
                  }`}
                >
                  {secondaryUsers.length > 0 ? (
                    <div className="space-y-3">
                      {secondaryUsers.map((sec, idx) => (
                        <div
                          key={sec.ID || sec.UUID || idx}
                          className="flex items-center justify-between gap-3 bg-white hover:bg-amber-50/30 border border-gray-200 hover:border-amber-300 rounded-xl p-3.5 shadow-xs transition group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-gray-900 truncate">
                                  {sec.Name || sec.Username}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                                    LEVEL_BADGES[
                                      (sec.Level || "user").toLowerCase()
                                    ] || "bg-gray-100 text-gray-700 border-gray-200"
                                  }`}
                                >
                                  {sec.Level || "user"}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-gray-100 text-gray-700">
                                  ID: #{sec.ID}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                                <span className="font-mono text-gray-700">
                                  @{sec.Username || sec.nidn_username}
                                </span>
                                {sec.Email && <span>• {sec.Email}</span>}
                                {primaryUser && (
                                  <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3" />
                                    <span>
                                      id_user_merge ➔ #{primaryUser.ID}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveSecondary(sec.ID)}
                              className="w-8 h-8 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                              title="Hapus dari Secondary"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Drop hint when list has items */}
                      <div className="border border-dashed border-gray-200 rounded-lg py-2.5 px-3 text-center text-xs text-gray-400 bg-gray-50/50">
                        + Tarik (drag) akun lain ke area ini untuk menambah ke daftar secondary
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 px-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700">
                        Belum Ada Akun Secondary
                      </p>
                      <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                        Tarik (Drag & Drop) satu atau lebih akun dari daftar sidebar ke sini,
                        atau klik tombol <strong>"+ Secondary"</strong> pada akun yang ingin digabungkan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* RINGKASAN DAMPAK MERGE */}
              {primaryUser && secondaryUsers.length > 0 && (
                <div className="bg-indigo-900 text-white rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Konfirmasi Penggabungan Data</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-950/60 p-3.5 rounded-lg border border-indigo-800">
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-300">
                        <strong className="text-white">
                          {secondaryUsers.length} Akun Sekunder
                        </strong>{" "}
                        ({secondaryUsers.map((u) => u.Username || u.Name).join(", ")})
                      </p>
                      <div className="flex items-center gap-1.5 text-indigo-300">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>
                          Akan dimerge ke Akun Primary:{" "}
                          <strong className="text-white underline">
                            {primaryUser.Name || primaryUser.Username} (ID #{primaryUser.ID})
                          </strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitMerge}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition shrink-0 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <GitMerge className="w-4 h-4" />
                          <span>Simpan Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SIDEBAR DAFTAR AKUN (Right) */}
            <div className="col-span-12 lg:col-span-5 xl:col-span-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col h-[calc(100vh-140px)] sticky top-20">
                {/* Header Sidebar */}
                <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <span>Daftar Akun Pengguna</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200/80 text-gray-700">
                          {filteredUsers.length} / {allUsers.length}
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Drag kartu akun atau klik tombol aksi untuk memilih
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={fetchUsers}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Segarkan data user"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari nama, username, email, role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFilterMergeStatus("all")}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        filterMergeStatus === "all"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      Semua ({allUsers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMergeStatus("unmerged")}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        filterMergeStatus === "unmerged"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      Belum Dimerge
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMergeStatus("merged")}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        filterMergeStatus === "merged"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      Sudah Dimerge
                    </button>
                  </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-gray-50">
                  {loadingUsers ? (
                    <div className="text-center py-12 text-gray-400 text-xs space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                      <p>Memuat daftar pengguna...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs space-y-2">
                      <AlertCircle className="w-6 h-6 mx-auto text-gray-300" />
                      <p>Tidak ada pengguna yang cocok dengan filter</p>
                    </div>
                  ) : (
                    filteredUsers.map((item) => {
                      const isPrimary = primaryUser?.ID === item.ID;
                      const isSecondary = secondaryUsers.some(
                        (u) => u.ID === item.ID
                      );
                      const isAssigned = isPrimary || isSecondary;
                      const hasMergeRef = Boolean(
                        item.IdUserMerge || item.id_user_merge
                      );
                      const canDrag = !isAssigned && !hasMergeRef;
                      const mergeId = item.IdUserMerge || item.id_user_merge;
                      const mergeName =
                        item.NamaUserMerge || item.nama_user_merge;
                      const userLevel = (
                        item.Level ||
                        item.level ||
                        "user"
                      ).toLowerCase();

                      return (
                        <div
                          key={item.ID || item.UUID}
                          draggable={canDrag}
                          onDragStart={(e) => {
                            if (!canDrag) {
                              e.preventDefault();
                              return false;
                            }
                            handleDragStart(e, item);
                          }}
                          className={`pt-2.5 rounded-xl p-3 border transition-all ${
                            isPrimary
                              ? "bg-indigo-50/60 border-indigo-300 shadow-xs ring-1 ring-indigo-200"
                              : isSecondary
                              ? "bg-amber-50/60 border-amber-300 shadow-xs ring-1 ring-amber-200"
                              : hasMergeRef
                              ? "bg-slate-50/80 border-slate-200 text-gray-700 shadow-2xs opacity-90 select-none"
                              : "bg-white border-gray-200/90 hover:border-indigo-300 hover:shadow-xs cursor-grab active:cursor-grabbing"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              {hasMergeRef ? (
                                <div
                                  className="mt-0.5 text-amber-500/90 shrink-0 cursor-not-allowed"
                                  title="Data yang sudah dimerge tidak dapat didrag drop kecuali diunmerge terlebih dahulu"
                                >
                                  <Lock className="w-4 h-4" />
                                </div>
                              ) : (
                                <div
                                  className="mt-0.5 text-gray-400 hover:text-gray-600 shrink-0"
                                  title="Tarik kartu ini ke area Primary atau Secondary"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-xs text-gray-900 truncate">
                                    {item.Name || item.Username}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${
                                      LEVEL_BADGES[userLevel] ||
                                      "bg-gray-100 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    {userLevel}
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                                  @{item.Username || item.nidn_username}
                                </div>
                              </div>
                            </div>

                            <span className="text-[10px] font-mono text-gray-400 shrink-0">
                              #{item.ID}
                            </span>
                          </div>

                          {/* Email & Info */}
                          <div className="mt-2 text-[11px] text-gray-600 space-y-0.5 pl-6">
                            {item.Email && (
                              <div className="flex items-center gap-1.5 text-gray-500 truncate">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.Email}</span>
                              </div>
                            )}

                            {/* Refer to id_user_merge */}
                            <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                              {hasMergeRef ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <GitMerge className="w-3 h-3" />
                                    <span>
                                      Merged ke: ID #{mergeId}
                                      {mergeName ? ` (${mergeName})` : ""}
                                    </span>
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                                  Belum dimerge
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-end gap-1.5 pl-6">
                            {isPrimary ? (
                              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                <span>Terpilih Primary</span>
                              </span>
                            ) : isSecondary ? (
                              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Terpilih Secondary</span>
                              </span>
                            ) : hasMergeRef ? (
                              <button
                                type="button"
                                onClick={() => handleUnmergeUser(item)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                                title="Batalkan status merge akun ini agar dapat di-drag drop kembali"
                              >
                                <Unlink className="w-3.5 h-3.5 text-rose-600" />
                                <span>Unmerge Akun</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimary(item)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                                  title="Jadikan Akun Utama"
                                >
                                  <Crown className="w-3 h-3" />
                                  <span>+ Primary</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddToSecondary(item)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                                  title="Tambahkan ke Secondary"
                                >
                                  <Users className="w-3 h-3" />
                                  <span>+ Secondary</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
