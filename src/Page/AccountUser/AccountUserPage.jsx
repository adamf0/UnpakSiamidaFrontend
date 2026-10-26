import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AccountUserFormModal from "./AccountUserFormModal";
import ConfirmDeleteDialog from "@/Components/ConfirmDeleteDialog";
import { useToast } from "@/Providers/ToastProvider";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { Plus, Users, User, Pencil, Trash2, GitMerge, UserCheck, Building, GraduationCap, School } from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useAuth } from "@/Providers/AuthProvider";
import { isEmpty, renderLabelFakultasUnit, formatProdiWithJenjang } from "@/Common/Utils";
import { apiClient } from "@/Common/api";
import PageHeader from "@/Components/PageHeader";

const LEVEL_BADGES = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  fakultas: "bg-blue-100 text-blue-800 border-blue-200",
  auditee: "bg-emerald-100 text-emerald-800 border-emerald-200",
  auditor1: "bg-amber-100 text-amber-800 border-amber-200",
  auditor2: "bg-orange-100 text-orange-800 border-orange-200",
  user: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AccountUserPage() {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tableRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("new");
  const [selectedRow, setSelectedRow] = useState(null);
  const { addToast } = useToast();
  const { getValidToken } = useAuth();

  const [abacMap, setAbacMap] = useState({});
  const [fakultasMap, setFakultasMap] = useState({});

  useEffect(() => {
    const fetchFakultasMap = async () => {
      try {
        const res = await apiClient.get("/fakultasunits?mode=all");
        const list = res?.data ?? res ?? [];
        const safe = Array.isArray(list) ? list : (list.data || []);
        const map = {};
        safe.forEach((fu) => {
          const id = String(fu.ID || fu.id || "");
          const uuid = String(fu.UUID || fu.uuid || "");
          const nama = String(fu.Nama || fu.nama_fak_prod_unit || fu.nama || "").trim();
          const jenjang = String(fu.Jenjang || fu.jenjang || "").toUpperCase();
          const type = String(fu.Type || fu.type || "").toLowerCase();

          let formatted = nama;
          if ((type === "prodi" || jenjang) && jenjang && !nama.toLowerCase().includes(jenjang.toLowerCase())) {
            formatted = `${nama} (${jenjang})`;
          }

          const entry = { ...fu, formatted, jenjang, type };
          if (id) map[id] = entry;
          if (uuid) map[uuid] = entry;
          if (nama) map[nama.toLowerCase()] = entry;
        });
        setFakultasMap(map);
      } catch (err) {
        console.error("Fetch fakultas map error in AccountUserPage:", err);
      }
    };
    fetchFakultasMap();
  }, []);

  const fetchAbacMap = async () => {
    try {
      const res = await apiClient.get("/user-abac");
      const list = res?.data ?? res ?? [];
      const safe = Array.isArray(list) ? list : (list.data || []);
      const map = {};
      for (const item of safe) {
        const uId = item.IdUser || item.id_user;
        const uUuid = item.UserUuid || item.user_uuid;
        if (uId) {
          map[uId] = map[uId] || [];
          map[uId].push(item);
        }
        if (uUuid) {
          map[uUuid] = map[uUuid] || [];
          map[uUuid].push(item);
        }
      }
      setAbacMap(map);
    } catch (err) {
      console.error("Fetch abac for users table error:", err);
    }
  };

  useEffect(() => {
    fetchAbacMap();
  }, []);

  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  const openNew = () => {
    setModalMode("new");
    setSelectedRow(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setModalMode("edit");
    setSelectedRow(row);
    setModalOpen(true);
  };

  const deleteData = async () => {
    if (!selectedRow?.UUID) return;

    try {
      await apiClient.delete(`/user/${selectedRow.UUID}`);
      addToast("success", "Akun user berhasil dihapus");
    } catch (err) {
      console.error("Delete user error:", err);
      addToast("error", err?.message || "Server tidak dapat dihubungi");
    } finally {
      setConfirmDelete(false);
      tableRef.current?.reload?.({ resetPage: true });
    }
  };

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
            icon={Users}
            title="Account User"
            subtitle="Kelola akun pengguna, hak akses level, dan unit kerja dalam sistem"
          />

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <RemoteTable
              ref={tableRef}
              endpoint="/users"
              mode="paging"
              token={getValidToken()}
              onError={(err) => {
                console.error("USER TABLE ERROR:", err);
              }}
              renderAddAction={
                <div className="flex items-center gap-2">
                  <Tooltip content="Merging Data Pengguna">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
                      onClick={() => navigate("/users/merge")}
                    >
                      <GitMerge className="w-4 h-4 text-indigo-600" />
                      <span>Merging Data</span>
                    </button>
                  </Tooltip>

                  <Tooltip content="Tambah Akun User">
                    <button
                      type="button"
                      className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs shrink-0 cursor-pointer"
                      onClick={openNew}
                      aria-label="Tambah Akun User"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </Tooltip>
                </div>
              }
              listcolumns={[
                {
                  key: "Username",
                  label: "Username / NIDN",
                  searchable: true,
                  renderKey: (row) => (
                    <div className="font-semibold text-gray-900">
                      {row?.Username || row?.nidn_username || "-"}
                    </div>
                  ),
                },
                {
                  key: "Name",
                  label: "Nama Lengkap",
                  searchable: true,
                  renderKey: (row) => (
                    <div>
                      <span className="font-medium text-gray-800">
                        {row?.Name || row?.name || "-"}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "Email",
                  label: "Email",
                  searchable: true,
                  renderKey: (row) => (
                    <span className="text-xs text-gray-600 font-mono">
                      {row?.Email || row?.email || "-"}
                    </span>
                  ),
                },
                {
                  key: "Level",
                  label: "Level Role",
                  searchable: true,
                  renderKey: (row) => {
                    const lvl = String(row?.Level || row?.level || "user").toLowerCase();
                    const badgeClass =
                      LEVEL_BADGES[lvl] || "bg-gray-100 text-gray-700 border-gray-200";
                    return (
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${badgeClass}`}
                      >
                        {lvl}
                      </span>
                    );
                  },
                },
                {
                  key: "NamaFakultasUnit",
                  label: "Fakultas / Unit",
                  searchable: true,
                  renderKey: (row) => {
                    const rawUnitName = row?.NamaFakultasUnit || row?.nama_fak_prod_unit;
                    if (!rawUnitName) {
                      return <span className="text-gray-400 text-xs">-</span>;
                    }

                    const fuId = String(row?.FakultasUnit || row?.fakultas_unit || "");
                    const fuUuid = String(row?.UuidFakultasUnit || row?.uuid_fakultas_unit || "");
                    const foundFu =
                      fakultasMap[fuId] ||
                      fakultasMap[fuUuid] ||
                      fakultasMap[rawUnitName.toLowerCase()];

                    const jenjang =
                      row?.Jenjang ||
                      row?.jenjang ||
                      foundFu?.jenjang ||
                      foundFu?.Jenjang;
                    const type =
                      row?.Type ||
                      row?.type ||
                      foundFu?.type ||
                      foundFu?.Type;

                    const formattedName =
                      foundFu?.formatted ||
                      formatProdiWithJenjang(rawUnitName, jenjang, type);

                    return (
                      <span className="inline-block max-w-xs truncate text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                        {formattedName}
                      </span>
                    );
                  },
                },
                {
                  key: "UserAbac",
                  label: "Rule Tambahan (ABAC)",
                  searchable: false,
                  renderKey: (row) => {
                    const uId = row?.ID || row?.id;
                    const uUuid = row?.UUID || row?.uuid;
                    const fromRow = row?.UserAbac || row?.user_abac;
                    const rawAbacs =
                      Array.isArray(fromRow) && fromRow.length > 0
                        ? fromRow
                        : abacMap[uId] || abacMap[uUuid] || [];
                    const abacs = rawAbacs.filter((item) => {
                      const r = (
                        item.ComputedRole ||
                        item.computed_role ||
                        item.Role ||
                        item.role ||
                        ""
                      ).toLowerCase();
                      return ["upms", "upmf", "upml"].includes(r);
                    });

                    if (!abacs || abacs.length === 0) {
                      return <span className="text-gray-400 text-xs italic">-</span>;
                    }

                    return (
                      <div className="flex flex-wrap gap-1.5 max-w-sm items-center">
                        {abacs.map((item, idx) => {
                          const role = (
                            item.ComputedRole ||
                            item.computed_role ||
                            item.Role ||
                            item.role ||
                            "upm"
                          ).toUpperCase();
                          const rawUnit =
                            item.NamaFakultasUnit || item.nama_fakultas_unit || "";
                          const fuId = String(item.IdFakultasUnit || item.id_fakultas_unit || "");
                          const fuUuid = String(item.UuidFakultasUnit || item.uuid_fakultas_unit || "");
                          const foundFu =
                            fakultasMap[fuId] ||
                            fakultasMap[fuUuid] ||
                            fakultasMap[rawUnit.toLowerCase()];
                          const unit =
                            foundFu?.formatted ||
                            formatProdiWithJenjang(
                              rawUnit,
                              item.JenjangFakultasUnit || foundFu?.jenjang,
                              item.TypeFakultasUnit || foundFu?.type
                            );
                          const tahun = item.Tahun || item.tahun || "";
                          const status = (
                            item.Status ||
                            item.status ||
                            "active"
                          ).toLowerCase();
                          const isActive = status === "active";

                          let badgeColor =
                            "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
                          let Icon = GraduationCap;
                          if (role === "UPML") {
                            badgeColor =
                              "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100";
                            Icon = Building;
                          } else if (role === "UPMS") {
                            badgeColor =
                              "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";
                            Icon = School;
                          } else if (role === "USER") {
                            badgeColor =
                              "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100";
                            Icon = User;
                          }

                          return (
                            <span
                              key={item.UUID || item.uuid || idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetUuid =
                                  uUuid || item.UserUuid || item.user_uuid;
                                navigate(
                                  targetUuid
                                    ? `/users/${targetUuid}/abac`
                                    : "/users/abac",
                                  {
                                    state: { user: row },
                                  }
                                );
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${badgeColor} shadow-2xs cursor-pointer transition ${
                                !isActive ? "opacity-50 line-through" : ""
                              }`}
                              title={`${role} • ${unit} (${tahun}) - Status: ${
                                isActive ? "Aktif" : "Non-Aktif"
                              }. Klik untuk kelola.`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-bold">{role}</span>
                              {unit && (
                                <span className="font-normal opacity-90 truncate max-w-[120px]">
                                  ({unit})
                                </span>
                              )}
                              {tahun && (
                                <span className="text-[10px] opacity-75 font-mono">
                                  {tahun}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    );
                  },
                },
                {
                  key: "IdUserMerge",
                  label: "Status Merge",
                  searchable: false,
                  renderKey: (row) => {
                    const mergeId = row?.IdUserMerge || row?.id_user_merge;
                    const mergeName = row?.NamaUserMerge || row?.nama_user_merge;
                    if (mergeId) {
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 w-fit">
                            <GitMerge className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>Merged</span>
                          </span>
                          <span
                            className="text-[11px] text-gray-500 truncate max-w-[170px]"
                            title={mergeName ? `Ke: ${mergeName} (#${mergeId})` : `Ke ID #${mergeId}`}
                          >
                            Ke: {mergeName ? mergeName : `#${mergeId}`}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Primary
                      </span>
                    );
                  },
                },
              ]}
              renderAction={({ row, close }) => (
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/80 rounded-xl transition-all cursor-pointer text-left group"
                    onClick={() => {
                      const uUuid = row?.UUID || row?.uuid;
                      navigate(uUuid ? `/users/${uUuid}/abac` : "/users/abac", {
                        state: {
                          user: row,
                          user_uuid: uUuid,
                          user_name: row?.Name || row?.name,
                        },
                      });
                      close();
                    }}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Tugaskan</span>
                  </button>

                  <div className="my-1 border-t border-gray-150" />

                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition-all cursor-pointer text-left group"
                    onClick={() => {
                      openEdit(row);
                      close();
                    }}
                  >
                    <Pencil className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition-all cursor-pointer text-left group"
                    onClick={() => {
                      setSelectedRow(row);
                      setConfirmDelete(true);
                      close();
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Hapus</span>
                  </button>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* FORM MODAL */}
      <AccountUserFormModal
        open={modalOpen}
        mode={modalMode}
        data={selectedRow}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          tableRef.current?.reload?.({ resetPage: false });
        }}
      />

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDeleteDialog
        open={confirmDelete}
        title="Hapus Akun User"
        message={`Apakah Anda yakin ingin menghapus akun user "${
          selectedRow?.Name || selectedRow?.Username || "terpilih"
        }"? Data akun yang dihapus tidak dapat dipulihkan.`}
        onConfirm={deleteData}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
