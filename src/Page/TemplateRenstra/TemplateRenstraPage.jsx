import RemoteTable from "@/Components/RemoteTable";
import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// const cn = (...classes) => classes.filter(Boolean).join(" ");

const TemplateRenstraPage = () => {
  const navigate = useNavigate();
  const [_, setOpenAction] = useState(null);
  const actionRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerTargets, setDrawerTargets] = useState([]);
  const [drawerMode, setDrawerMode] = useState("detail"); 


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionRef.current && !actionRef.current.contains(e.target)) {
        setOpenAction(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatKategori = (kategori) => {
    if (!kategori) return "unit";

    const parts = kategori.split("#");

    if (parts.length === 2) {
      const [scope, level] = parts;

      if (scope === "fakultas") {
        return "fakultas";
      }

      return `${level} (${scope})`;
    }

    return "unit";
  };

  const kategoriKey = (kategori) => {
    if (!kategori) return "unit";
    return kategori; // prodi#s1 | fakultas | dll → stabil & unik
  };

  const openTargetDrawer = (row, kategoriLabel) => {
    const [level, scope] = kategoriLabel
      .replace(")", "")
      .split(" ("); // => ["s1", "prodi"]

    const kategoriKey = `${scope}#${level}`; // prodi#s1

    const filtered = row.Targets.filter(
      (t) => t.Kategori === kategoriKey
    );

    setDrawerTitle(`${kategoriLabel} – ${row.Indikator}`);
    setDrawerTargets(filtered);
    setDrawerOpen(true);
  };

  const openFakultasDrawer = (row, fakultasUnit) => {
    const filtered = row.Targets.filter(
      (t) => t.FakultasUnit === fakultasUnit
    );

    setDrawerTitle(`${fakultasUnit} - ${row.Indikator}`);
    setDrawerTargets(filtered);
    setDrawerMode("detail");
    setDrawerOpen(true);
  };

  const openAllFakultasDrawer = (row) => {
    setDrawerTitle(row.Indikator);
    setDrawerTargets(row.Targets);
    setDrawerMode("list-fakultas");
    setDrawerOpen(true);
  };

  return (
    <div className="p-3 bg-white">
      <h2 className="text-lg font-semibold mb-4">Template Dokumen Tambahan</h2>

      <div className="border rounded mt-3">
        <RemoteTable
          endpoint="http://localhost:3000/templaterenstras"
          mode="sse" //harus sse jangan paging (keporong), all (oom), ndjson (oom)
          renderAddAction={
            <button 
              className="px-3 py-2 bg-purple-600 text-white rounded-lg" 
              onClick={()=>navigate("/template_renstra/new")}>
              +
            </button>
          }
          adapter={templateRenstraAdapter}
          listcolumns={[
            { key: "Tahun", label: "Tahun", searchable: true, allowedOps:["eq", "neq", "in"]},
            { key: "Standar", label: "Standar Renstra", searchable: false},
            { key: "Indikator", label: "Indikator", searchable: true},
            { key: "Targets", label: "Target", renderKey: (row) => {
              if (!Array.isArray(row.Targets)) return "-";

              const labels = new Map();

              row.Targets.forEach((t) => {
                const label = formatKategori(t.Kategori);
                const key = kategoriKey(t.Kategori);

                labels.set(key, label);
              });

              return (
                <div className="flex flex-wrap gap-1">
                  {[...labels.values()].map((label) => (
                    <span
                      key={label}
                      onClick={() => openTargetDrawer(row, label)}
                      className="px-2 py-0.5 text-xs rounded-full
                                bg-blue-100 text-blue-700
                                whitespace-nowrap"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              );
            }, searchable: false},
            { key: "Targets", label: "Tags", renderKey: (row) => {
                if (!Array.isArray(row.Targets)) return "-";

                const unique = new Map();
                row.Targets.forEach(t => {
                  if (t.FakultasUnit) {
                    unique.set(t.FakultasUnit, t.FakultasUnit);
                  }
                });

                const all = [...unique.values()];
                const visible = all.slice(0, 5);
                const remaining = all.length - visible.length;

                return (
                  <div className="flex flex-wrap gap-1">
                    {visible.map((label) => (
                      <button
                        key={label}
                        onClick={() => openFakultasDrawer(row, label)}
                        className="px-2 py-0.5 text-xs rounded-full
                                  bg-emerald-100 text-emerald-700
                                  hover:bg-emerald-200"
                      >
                        {label}
                      </button>
                    ))}

                    {remaining > 0 && (
                      <button
                        onClick={() => openAllFakultasDrawer(row)}
                        className="px-2 py-0.5 text-xs rounded-full
                                  bg-gray-200 text-gray-700
                                  hover:bg-gray-300"
                      >
                        +{remaining}
                      </button>
                    )}
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

            {/* ================= MODE LIST FAKULTAS ================= */}
            {drawerMode === "list-fakultas" && (
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Fakultas / Prodi / Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(drawerTargets.map(t => t.FakultasUnit))].map(fu => (
                    <tr key={fu} className="border-b">
                      <td className="p-2">
                        <button
                          onClick={() =>
                            openFakultasDrawer(
                              { Targets: drawerTargets, Indikator: drawerTitle },
                              fu
                            )
                          }
                          className="w-full text-left hover:text-blue-500"
                        >
                          {fu}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ================= MODE DETAIL TARGET ================= */}
            {drawerMode === "detail" &&
              drawerTargets.map((t, i) => (
                <div key={i} className="mt-4 border rounded p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Fakultas</div>
                    <div>{t.FakultasUnit}</div>

                     <div className="font-medium">Kategori</div>
                    <div>{formatKategori(t.Kategori)}</div>

                    <div className="font-medium">Klasifikasi</div>
                    <div>{t.Klasifikasi}</div>

                    <div className="font-medium">Satuan</div>
                    <div>{t.Satuan}</div>

                    <div className="font-medium">Target</div> {/*[pr] belum masukkan operator*/}
                    <div>{t.Target}</div>

                    <div className="font-medium">Target Min</div>
                    <div>{t.TargetMin ?? "-"}</div>

                    <div className="font-medium">Target Max</div>
                    <div>{t.TargetMax ?? "-"}</div>

                    <div className="font-medium">Tugas</div>
                    <div>{t.Tugas}</div>

                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default TemplateRenstraPage;

export const templateRenstraAdapter = (rows = []) => {
  const map = {};

  for (const r of rows) {
    const key = `${r.IndikatorRenstraID}-${r.Tahun}`;

    if (!map[key]) {
      map[key] = {
        IndikatorRenstraID: r.IndikatorRenstraID,
        Indikator: r.Indikator,
        IndikatorRenstraUuid: r.IndikatorRenstraUuid,
        Tahun: r.Tahun,
        StandarRenstra: "",
        Targets: [],
      };
    }

    map[key].Targets.push({
      ID: r.ID,
      UUID: r.UUID,
      IsPertanyaan: r.IsPertanyaan,
      FakultasUnitID: r.FakultasUnitID,
      FakultasUnit: r.FakultasUnit,
      Kategori: r.Kategori,
      Klasifikasi: r.Klasifikasi,
      Satuan: r.Satuan,
      Target: r.Target,
      TargetMin: r.TargetMin,
      TargetMax: r.TargetMax,
      Tugas: r.Tugas,
    });
  }

  return Object.values(map);
};
