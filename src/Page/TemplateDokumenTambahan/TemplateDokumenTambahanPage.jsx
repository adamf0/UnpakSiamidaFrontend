import ChangeLevelModal from "@/Components/ChangeLevelModal";
import Navbar from "@/Components/Navbar";
import RemoteTable from "@/Components/RemoteTable";
import { useAuth } from "@/Providers/AuthProvider";
import { useContent } from "@/Providers/ContentProvider";
import React, { useState } from "react";
import { Plus, Eye, Pencil, Trash2, FolderPlus } from "lucide-react";
import Tooltip from "@/Components/Tooltip";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/Components/PageHeader";

const TemplateDokumenTambahanPage = () => {
  const navigate = useNavigate();
  const [_, setOpenAction] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerTargets, setDrawerTargets] = useState([]);
  const [drawerMode, setDrawerMode] = useState("detail");
  const {getValidToken} = useAuth()

  const openTagsDrawer = (row, label) => {
    const filtered = row.Targets.filter((t) => t.Kategori === label);

    setDrawerTitle(`${label} - ${row.Pertanyaan} (${row.Tahun})`);
    setDrawerTargets(filtered);
    setDrawerMode("detail");
    setDrawerOpen(true);
  };

  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } = useContent();

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
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen space-y-4">
        <PageHeader
          icon={FolderPlus}
          title="Template Dokumen Tambahan"
          subtitle="Kelola instrumen pertanyaan dan dokumen tambahan per fakultas/unit"
        />

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <RemoteTable
            endpoint="http://localhost:3000/templatedokumentambahans"
            mode="sse" //harus sse jangan paging (keporong), all (oom), ndjson (oom)
            adapter={templateDokumenTambahanAdapter}
            token={getValidToken()}
            renderAddAction={
              <div className="flex items-center gap-2">
                <Tooltip content="Tambah Template">
                  <button
                    type="button"
                    className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs"
                    onClick={() => navigate("/template_dokumen_tambahan/new")}
                    aria-label="Tambah Template"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </Tooltip>
                <Tooltip content="Preview Template">
                  <button
                    type="button"
                    className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition shadow-xs"
                    onClick={() => navigate("/template_dokumen_tambahan/preview")}
                    aria-label="Preview Template"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </Tooltip>
              </div>
            }
            listcolumns={[
              {
                key: "Tahun",
                label: "Tahun",
                searchable: true,
                allowedOps: ["eq", "neq", "in"],
              },
              {
                key: "JenisFile",
                label: "Jenis File",
                searchable: true,
                allowedOps: ["like", "eq", "neq"],
              },
              {
                key: "Pertanyaan",
                label: "Pertanyaan",
                searchable: true,
                allowedOps: ["like"],
              },
              {
                key: "Targets",
                label: "Targets",
                renderKey: (row) => {
                  if (!Array.isArray(row.Targets)) return "-";

                  const unique = new Map();
                  row.Targets.forEach((t) => {
                    if (t.Kategori) {
                      unique.set(t.Kategori, t.Kategori);
                    }
                  });

                  const all = [...unique.values()];

                  return (
                    <div className="flex flex-wrap gap-1">
                      {all.map((label) => (
                        <button
                          key={label}
                          onClick={() => openTagsDrawer(row, label)}
                          className="px-2 py-0.5 text-xs rounded-full
                                    bg-emerald-100 text-emerald-700
                                    hover:bg-emerald-200"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  );
                },
                searchable: false,
              },
            ]}
            renderAction={({ row, close }) => (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:text-amber-700 hover:bg-amber-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
                    navigate(
                      `/template_dokumen_tambahan/${row.Tahun}/${row.JenisFileUuid}`
                    );
                    close();
                  }}
                >
                  <Pencil className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>Edit</span>
                </button>

                <div className="my-1 border-t border-gray-150" />

                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition-all cursor-pointer text-left group"
                  onClick={() => {
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

        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="flex-1 bg-black/30"
              onClick={() => setDrawerOpen(false)}
            />

            <div className="w-[420px] bg-white h-full shadow-xl p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-lg">{drawerTitle}</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-gray-500 hover:text-black"
                >
                  ✕
                </button>
              </div>

              {/* ================= MODE DETAIL TARGET ================= */}
              {drawerMode === "detail" &&
                drawerTargets.map((t, i) => (
                  <div key={i} className="mt-4 border rounded p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Kategori</div>
                      <div>{t.Kategori}</div>

                      <div className="font-medium">Klasifikasi</div>
                      <div>{t.Klasifikasi}</div>

                      <div className="font-medium">Tugas</div>
                      <div>{t.Tugas}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TemplateDokumenTambahanPage;

export const templateDokumenTambahanAdapter = (rows = []) => {
  const map = {};

  for (const r of rows) {
    const key = `${r.JenisFileID}-${r.Tahun}`;

    if (!map[key]) {
      map[key] = {
        JenisFileID: r.JenisFileID,
        JenisFile: r.JenisFile,
        JenisFileUuid: r.JenisFileUuid,
        Tahun: r.Tahun,
        Pertanyaan: r.Pertanyaan,
        Targets: [],
      };
    }

    map[key].Targets.push({
      ID: r.ID,
      UUID: r.UUID,
      Kategori: r.FakultasProdiUnit?.replaceAll("#all", ""),
      Klasifikasi: r.Klasifikasi,
      Satuan: r.Satuan,
      Tugas: r.Tugas,
    });
  }

  return Object.values(map);
};
