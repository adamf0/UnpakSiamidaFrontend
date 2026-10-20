import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import PageHeader from "@/Components/PageHeader";
import Tooltip from "@/Components/Tooltip";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import { apiClient } from "@/Common/api";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import UserAssignmentModal from "./UserAssignmentModal";
import {
  UserCheck,
  ArrowLeft,
  X,
  Search,
  Plus,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  RefreshCw,
  Building,
  GraduationCap,
  School,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export default function UserAssignmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userUuid } = useParams();

  // Target User state from route state or param
  const targetUserFromState = location.state?.user || null;
  const [targetUser, setTargetUser] = useState(targetUserFromState);
  const [loadingUser, setLoadingUser] = useState(false);

  const { addToast } = useToast();
  const { user } = useAuth();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
    positionYear,
  } = useContent();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [yearOptions, setYearOptions] = useState([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Target User if not available in state but URL param exists
  useEffect(() => {
    if (userUuid && !targetUser) {
      const fetchUserDetails = async () => {
        setLoadingUser(true);
        try {
          const res = await apiClient.get("/users?mode=all");
          const list = res?.data ?? res ?? [];
          const safe = Array.isArray(list) ? list : (list.data || []);
          const found = safe.find(
            (u) =>
              (u.UUID || u.uuid) === userUuid ||
              String(u.ID || u.id) === String(userUuid)
          );
          if (found) {
            setTargetUser(found);
          }
        } catch (err) {
          console.error("Error fetching user details:", err);
        } finally {
          setLoadingUser(false);
        }
      };
      fetchUserDetails();
    }
  }, [userUuid, targetUser]);

  // Fetch Year Options
  const fetchYears = async () => {
    try {
      const res = await apiClient.get("/tahunrenstras?mode=all");
      const list = res?.data ?? res ?? [];
      const safe = Array.isArray(list) ? list : (list.data || []);
      const yrs = safe
        .map((y) => String(y.Tahun || y.tahun || ""))
        .filter(Boolean);
      const unique = Array.from(new Set(yrs)).sort((a, b) => Number(b) - Number(a));
      setYearOptions(unique);
    } catch (err) {
      console.error("Fetch years error:", err);
    }
  };

  // Fetch Assignments from backend
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const activeUuid = userUuid || targetUser?.UUID || targetUser?.uuid;
      const url = activeUuid ? `/user-abac?user_uuid=${activeUuid}` : "/user-abac";
      const res = await apiClient.get(url);
      const list = res?.data ?? res ?? [];
      const safeList = Array.isArray(list) ? list : (list.data || []);
      setAssignments(safeList);
    } catch (err) {
      console.error("Fetch user-abac error:", err);
      addToast(
        "error",
        err?.data?.message || err?.message || "Gagal memuat daftar penugasan role"
      );
    } finally {
      setLoading(false);
    }
  }, [userUuid, targetUser, addToast]);

  useEffect(() => {
    fetchYears();
    fetchAssignments();
  }, [fetchAssignments]);

  // Handle Quick Status Toggle
  const handleToggleStatus = async (item) => {
    const currentStatus = (item.Status || item.status || "active").toLowerCase();
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const uuid = item.UUID || item.uuid;

    try {
      await apiClient.put(`/user-abac/${uuid}`, {
        status: newStatus,
      });

      setAssignments((prev) =>
        prev.map((a) => {
          if ((a.UUID || a.uuid) === uuid) {
            return { ...a, Status: newStatus, status: newStatus };
          }
          return a;
        })
      );

      addToast(
        "success",
        `Status penugasan telah diubah menjadi ${newStatus === "active" ? "Aktif" : "Tidak Aktif"}`
      );
    } catch (err) {
      console.error("Toggle status error:", err);
      addToast("error", "Gagal memperbarui status penugasan");
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const uuid = itemToDelete.UUID || itemToDelete.uuid;

    try {
      await apiClient.delete(`/user-abac/${uuid}`);
      setAssignments((prev) => prev.filter((a) => (a.UUID || a.uuid) !== uuid));
      addToast("success", "Penugasan berhasil dihapus");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err) {
      console.error("Delete assignment error:", err);
      addToast("error", "Gagal menghapus penugasan pengguna");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Modal Helpers
  const openNew = () => {
    setModalMode("new");
    setSelectedAssignment(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setModalMode("edit");
    setSelectedAssignment(item);
    setModalOpen(true);
  };

  // Role styling helper
  const renderRoleBadge = (roleCode) => {
    const code = String(roleCode || "upmf").toLowerCase();
    if (code === "upml") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Building className="w-3.5 h-3.5 text-emerald-600" />
          <span>UPML</span>
          <span className="text-[10px] font-normal opacity-75">(Lembaga)</span>
        </span>
      );
    }
    if (code === "upms") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <School className="w-3.5 h-3.5 text-amber-600" />
          <span>UPMS</span>
          <span className="text-[10px] font-normal opacity-75">(Sekolah)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
        <span>UPMF</span>
        <span className="text-[10px] font-normal opacity-75">(Fakultas)</span>
      </span>
    );
  };

  // Filtered list
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const uName = String(item.UserName || item.user_name || "").toLowerCase();
      const uUser = String(item.UserUsername || item.user_username || "").toLowerCase();
      const uEmail = String(item.UserEmail || item.user_email || "").toLowerCase();
      const fuName = String(item.NamaFakultasUnit || item.nama_fakultas_unit || "").toLowerCase();
      const itemYear = String(item.Tahun || item.tahun || "");
      const itemRole = String(
        item.ComputedRole || item.computed_role || item.Role || item.role || ""
      ).toLowerCase();
      const itemStatus = String(item.Status || item.status || "active").toLowerCase();

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          uName.includes(q) ||
          uUser.includes(q) ||
          uEmail.includes(q) ||
          fuName.includes(q) ||
          itemYear.includes(q);
        if (!matches) return false;
      }

      // Year Filter
      if (filterYear !== "all" && itemYear !== filterYear) {
        return false;
      }

      // Role Filter
      if (filterRole !== "all" && itemRole !== filterRole) {
        return false;
      }

      // Status Filter
      if (filterStatus !== "all" && itemStatus !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [assignments, searchQuery, filterYear, filterRole, filterStatus]);

  const targetName = targetUser?.Name || targetUser?.name || "";
  const targetUsername = targetUser?.Username || targetUser?.username || targetUser?.nidn_username || "";
  const targetEmail = targetUser?.Email || targetUser?.email || "";
  const targetLevel = targetUser?.Level || targetUser?.level || "user";
  const targetUnit = targetUser?.NamaFakultasUnit || targetUser?.nama_fak_prod_unit || "";

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

      <div className="container mx-auto p-4 md:p-6 space-y-5 max-w-7xl">
        {/* Page Header */}
        <PageHeader
          title={
            targetUser
              ? `Penugasan Role ABAC: ${targetName}`
              : "Penugasan Role Pengguna (ABAC)"
          }
          subTitle={
            targetUser
              ? `Kelola daftar penugasan role dinamis UPML, UPMF, atau UPMS untuk ${targetName}`
              : "Kelola penugasan dinamis berbasis atribut tahun dan unit kerja untuk Unit Penjaminan Mutu"
          }
          icon={ShieldCheck}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/users")}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold shadow-2xs transition shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-gray-500" />
                <span>Kembali ke Pengguna</span>
              </button>

              <button
                type="button"
                onClick={fetchAssignments}
                disabled={loading}
                className="w-9 h-9 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg flex items-center justify-center transition shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                title="Muat Ulang"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Penugasan</span>
              </button>
            </div>
          }
        />

        {/* Target User Detail Profile Card */}
        {targetUser && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                {targetName ? targetName.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-gray-900">{targetName}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                    Level: {targetLevel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap font-mono">
                  <span>NIDN / Username: <strong className="text-gray-700">{targetUsername || "-"}</strong></span>
                  {targetEmail && (
                    <>
                      <span>•</span>
                      <span>{targetEmail}</span>
                    </>
                  )}
                  {targetUnit && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-sans font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {targetUnit}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTargetUser(null);
                  navigate("/users/abac");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg font-medium transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span>Lihat Semua Pengguna</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari target unit, tahun, atau role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              />
            </div>

            {/* Filter Tahun */}
            <div>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              >
                <option value="all">Semua Tahun Penugasan</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    Tahun {y} {positionYear === y ? "(Tahun Berjalan)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Role */}
            <div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              >
                <option value="all">Semua Role ABAC</option>
                <option value="upml">UPML (Unit Penjaminan Mutu Lembaga)</option>
                <option value="upmf">UPMF (Unit Penjaminan Mutu Fakultas)</option>
                <option value="upms">UPMS (Unit Penjaminan Mutu Sekolah)</option>
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              >
                <option value="all">Semua Status Akses</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">
              Daftar Penugasan Role (User ABAC)
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Total: <strong className="text-gray-900">{filteredAssignments.length}</strong> data
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">#</th>
                  {!targetUser && <th className="px-4 py-3.5">Pengguna</th>}
                  <th className="px-4 py-3.5">Target Fakultas / Unit / Lembaga</th>
                  <th className="px-4 py-3.5 text-center">Tahun</th>
                  <th className="px-4 py-3.5 text-center">Role Penugasan</th>
                  <th className="px-4 py-3.5 text-center">Status Akses</th>
                  <th className="px-4 py-3.5">Terakhir Diperbarui</th>
                  <th className="px-4 py-3.5 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={targetUser ? 7 : 8} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium">Memuat data penugasan role...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={targetUser ? 7 : 8} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                          <UserCheck size={24} />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">
                          {targetUser
                            ? `Belum ada penugasan role untuk ${targetName}`
                            : "Tidak ada penugasan role ditemukan"}
                        </p>
                        <p className="text-xs text-gray-400 max-w-sm">
                          {targetUser
                            ? "Pengguna ini belum ditugaskan ke UPML, UPMF, atau UPMS. Klik tombol Tambah Penugasan untuk membuat penugasan baru."
                            : "Klik tombol 'Tambah Penugasan' untuk menugaskan pengguna ke UPML, UPMF, atau UPMS"}
                        </p>
                        <button
                          type="button"
                          onClick={openNew}
                          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Tambah Penugasan Sekarang</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((item, index) => {
                    const isActive =
                      (item.Status || item.status || "active").toLowerCase() === "active";
                    const role =
                      item.ComputedRole || item.computed_role || item.Role || item.role || "upmf";
                    const itemYear = String(item.Tahun || item.tahun || "");
                    const isCurrentYear =
                      positionYear && itemYear === String(positionYear);

                    return (
                      <tr
                        key={item.UUID || item.uuid || item.ID || index}
                        className="hover:bg-gray-50/80 transition"
                      >
                        {/* Index */}
                        <td className="px-4 py-3.5 text-center text-gray-400 font-mono">
                          {index + 1}
                        </td>

                        {/* Pengguna (if viewing all) */}
                        {!targetUser && (
                          <td className="px-4 py-3.5">
                            <div>
                              <p className="font-semibold text-gray-900 leading-tight">
                                {item.UserName || item.user_name || "-"}
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                                {item.UserUsername || item.user_username || "-"}
                              </p>
                            </div>
                          </td>
                        )}

                        {/* Target Fakultas / Unit */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                              <p className="font-semibold text-gray-800 leading-tight">
                                {item.NamaFakultasUnit || item.nama_fakultas_unit || "-"}
                              </p>
                              <span className="text-[10px] text-gray-400 capitalize">
                                Tipe: {item.TypeFakultasUnit || item.type_fakultas_unit || "Unit"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Tahun */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-gray-800 text-xs px-2.5 py-1 bg-gray-100 rounded-md border border-gray-200">
                              {itemYear}
                            </span>
                            {isCurrentYear && (
                              <span className="text-[9px] font-bold text-emerald-600 mt-0.5">
                                Tahun Berjalan
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Role ABAC */}
                        <td className="px-4 py-3.5 text-center">
                          {renderRoleBadge(role)}
                        </td>

                        {/* Status Akses */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                            }`}
                            title="Klik untuk ubah status aktif/nonaktif"
                          >
                            {isActive ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Aktif</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-gray-400" />
                                <span>Tidak Aktif</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Updated At */}
                        <td className="px-4 py-3.5 text-gray-500 font-mono text-[11px]">
                          {item.UpdatedAt || item.updated_at
                            ? new Date(item.UpdatedAt || item.updated_at).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip content="Edit Penugasan">
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="w-7 h-7 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg flex items-center justify-center transition cursor-pointer"
                              >
                                <Pencil size={14} />
                              </button>
                            </Tooltip>

                            <Tooltip content="Hapus Penugasan">
                              <button
                                type="button"
                                onClick={() => {
                                  setItemToDelete(item);
                                  setDeleteDialogOpen(true);
                                }}
                                className="w-7 h-7 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT PENUGASAN (HANYA TERBUKA SAAT DIKLIK) */}
      <UserAssignmentModal
        open={modalOpen}
        mode={modalMode}
        data={selectedAssignment}
        defaultUser={targetUser}
        onClose={() => {
          setModalOpen(false);
          setSelectedAssignment(null);
        }}
        onSuccess={fetchAssignments}
        defaultYear={positionYear || new Date().getFullYear().toString()}
      />

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        title="Hapus Penugasan Role"
        message={`Apakah Anda yakin ingin menghapus penugasan role untuk ${
          itemToDelete?.UserName || itemToDelete?.user_name || "pengguna ini"
        } pada target ${
          itemToDelete?.NamaFakultasUnit || itemToDelete?.nama_fakultas_unit || ""
        } (${itemToDelete?.Tahun || itemToDelete?.tahun})?`}
        onClose={() => {
          setDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
      />
    </>
  );
}
