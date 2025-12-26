import ChangeLevelModal from "@/Components/ChangeLevelModal";
import Navbar from "@/Components/Navbar";
import RemoteTable from "@/Components/RemoteTable";
import { useContent } from "@/Providers/ContentProvider";
import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// const cn = (...classes) => classes.filter(Boolean).join(" ");

const TemplateDokumenTambahanPage = () => {
  const navigate = useNavigate();
  const [_, setOpenAction] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerTargets, setDrawerTargets] = useState([]);
  const [drawerMode, setDrawerMode] = useState("detail"); 


  const openTagsDrawer = (row, label) => {
    const filtered = row.Targets.filter(
      (t) => t.Kategori === label
    );

    setDrawerTitle(`${label} - ${row.Pertanyaan} (${row.Tahun})`);
    setDrawerTargets(filtered);
    setDrawerMode("detail");
    setDrawerOpen(true);
  };

  const {
    level,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  return (
    <>
      <Navbar
        userName="John Doe"
        userLevel={level}
        years={[]}
        activeYear={null}
        positionYear={null}
        onPositionChange={()=>{}}
        onChangeLevelClick={() => setOpenChangeLevel(true)}
        renderChangeLevelModal={() => (
          <ChangeLevelModal
            open={openChangeLevel}
            onClose={() => setOpenChangeLevel(false)}
            levels={[]}
            currentLevel={level}
            onSubmit={(val) => {
              setLevel(val);
              setOpenChangeLevel(false);
            }}
          />
        )}
      />
      <div className="p-3 bg-white">
        <h2 className="text-lg font-semibold mb-4">Template Renstra</h2>

        <div className="border rounded mt-3">
          <RemoteTable
            endpoint="http://localhost:3000/templatedokumentambahans"
            mode="sse" //harus sse jangan paging (keporong), all (oom), ndjson (oom)
            adapter={templateDokumenTambahanAdapter}
            renderAddAction={
              <button 
                className="px-3 py-2 bg-purple-600 text-white rounded-lg" 
                onClick={()=>navigate("/template_dokumen_tambahan/new")}>
                +
              </button>
            }
            listcolumns={[
              { key: "Tahun", label: "Tahun", searchable: true, allowedOps:["eq", "neq", "in"]},
              { key: "JenisFile", label: "Jenis File", searchable: true, allowedOps:["like", "eq", "neq"]},
              { key: "Pertanyaan", label: "Pertanyaan", searchable: true, allowedOps:["like"]},
              { key: "Targets", label: "Targets", renderKey: (row) => {
                  if (!Array.isArray(row.Targets)) return "-";

                  const unique = new Map();
                  row.Targets.forEach(t => {
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
                }, searchable: false},
            ]}
            renderAction={({ row, close }) => (
              <>
                <button
                  className="block w-full px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    console.log("edit", row);
                    navigate(`/template_dokumen_tambahan/${row.Tahun}/${row.JenisFileUuid}`)
                    close();
                  }}
                >
                  Edit
                </button>

                <button
                  className="block w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                  onClick={() => {
                    console.log("hapus", row);
                    close();
                  }}
                >
                  Hapus
                </button>
              </>
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
      Kategori: r.FakultasProdiUnit?.replaceAll("#all",""),
      Klasifikasi: r.Klasifikasi,
      Satuan: r.Satuan,
      Tugas: r.Tugas,
    });
  }

  return Object.values(map);
};
