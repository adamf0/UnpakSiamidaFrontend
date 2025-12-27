import { delay, isEmpty } from "@/Common/Utils";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import Navbar from "@/Components/Navbar";
import RemoteTable from "@/Components/RemoteTable";
import SearchSelect from "@/Components/SearchSelect";
import Shimmer from "@/Components/Shimmer";
import TextInput from "@/Components/TextInput";
import { useContent } from "@/Providers/ContentProvider";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const PreviewTemplatePage = ({type="renstra"}) => {
  const [loading, setLoading] = useState(false);
  const [_, setErr] = useState(null);

  const [tahun, setTahun] = useState(null);
  const [fakultasUnit, setFakultasUnit] = useState(null);
  const [fakultasUnitsOptions, setFakultasUnitsOptions] = useState([]);

  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const {
    level,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
  } = useContent();

  const fetchFakultasUnit = async () => {
    setLoading(true);
    setErr(null);
  
    setTimeout(async ()=>{
      try {
        const res = await fetch("http://localhost:3000/fakultasunits?mode=sse", {
          headers: { Accept: "text/event-stream" },
        });
        if (!res.body) throw new Error("SSE not supported");
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        const result = [];
  
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let index;
          
          while ((index = buffer.indexOf("\n\n")) !== -1) {
            const event = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 2);
            if (!event.startsWith("data:")) continue;
            
            const payload = event.replace(/^data:\s*/, "");
            if (!payload || payload === "start" || payload === "done") continue;
            
            try {
              const parsed = JSON.parse(payload);
              if(isEmpty(parsed.UUID) || parsed.UUID=="00000000-0000-0000-0000-000000000000"){
                continue;
              }

              let label = "";
              if(parsed.Type=="prodi"){
                label=`${parsed.Nama} - ${parsed.Jenjang} (prodi)`;
              } else if(parsed.Type=="fakultas"){
                label=`${parsed.Nama} (fakultas)`;
              } else{
                label=`${parsed.Nama} (unit)`;
              }
              result.push({
              id: parsed.UUID,
              nama: label,
              ...parsed,
              });
            } catch {}
          }
        }
        setFakultasUnitsOptions(result);
      } catch (err) {
        console.error(err);
        setErr(e.message || "Gagal memuat fakultas");
      } finally {
        setLoading(false);
      }
    },3000);
  };

  const fetchPreviewData = async (tahun, fakultasUUID) => {
    setTableLoading(true);
    try {
      await delay(3000);

      const res = await fetch(
        `http://localhost:3000/preview/audit/${type}/${tahun}/${fakultasUUID}`
      );

      if (!res.ok) throw new Error("Gagal memuat data preview");

      const json = await res.json();
      setTableData(json ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setTableLoading(false);
    }
  };

  const handleFilter = () => {
    if (
      !isEmpty(tahun) &&
      !isEmpty(fakultasUnit?.UUID) &&
      fakultasUnit.UUID !== "00000000-0000-0000-0000-000000000000"
    ) {
      fetchPreviewData(tahun, fakultasUnit.UUID);
    } else{
      setTableData([]);
    }
  };

  useEffect(()=>{
    fetchFakultasUnit();
  },[]);

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
        <div className="mb-4 flex flex-col gap-4">
          <nav className="flex-1 text-sm text-gray-500 mb-1" aria-label="Breadcrumb">
            <ol className="list-none p-0 inline-flex">
              <li className="flex items-center">
                <Link to="/template_dokumen_tambahan" className="hover:underline">{type=="renstra"? "Template Renstra":"Template Dokumen Tambahan"}</Link>
                <span className="mx-2">/</span>
              </li>
              <li className="flex items-center text-gray-700 font-medium">
                Preview
              </li>
            </ol>
          </nav>

          <h2 className="flex-1 text-lg font-semibold">Preview</h2>
        </div>


        <div className="border rounded mt-3">
          <div className="flex flex-col gap-2 p-6">
            <TextInput
              type="number"
              label="Tahun"
              placeholder="Masukkan tahun"
              onBlur={(e) => setTahun(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setTahun(e.target.value);
                }
              }}
            />

            {loading ? (
              <>
                  <label className="block text-sm font-medium mb-1">Target</label>
                  <Shimmer rows={1} />
              </>
              ) : (
                <SearchSelect
                    label="Target"
                    options={fakultasUnitsOptions}
                    placeholder="Pilih target"
                    value={fakultasUnit}
                    onChange={(item) => setFakultasUnit(item)}
                />
              )
            }
            <button
              className="p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-300
                        text-sm text-white rounded flex items-center justify-center gap-2"
              disabled={tableLoading}
              onClick={handleFilter}
            >
              {tableLoading ? "Loading..." : "Filter"}
            </button>

          </div>

          <RemoteTable
            listdata={tableData}
            disableGlobalSearch={false}
            renderAddAction={[]}
            listcolumns={[
              { 
                key: "Indikator", 
                label: "Indikator", 
                renderKey: (row) => {
                  return row.IsPertanyaan=="1"? 
                  <>
                    {row.Indikator}
                    <div className="px-2 py-1 w-[fit-content] text-[.6rem] bg-green-600 text-white rounded-full">Pertanyaan</div>
                  </>:
                  <>
                  {row.Indikator}
                  <div className="px-2 py-1 w-[fit-content] text-[.6rem] bg-green-600 text-white rounded-full">Bukan Pertanyaan</div>
                  </>
                },
                searchable: false
              }, 
              { key: "Klasifikasi", label: "Klasifikasi", searchable: false},
              {
                key: "Target",
                label: "Target",
                renderKey: (row) => {
                  if (!isEmpty(row.Target)) {
                    return row.Target;
                  }

                  if (
                    (isEmpty(row.Target_min)) ||
                    (!isEmpty(row.Target_max))
                  ) {
                    return `${row.Target_min ?? "-"} - ${row.Target_max ?? "-"}`;
                  }
                },
                searchable: false
              },
            ]}
            renderAction={({ row, close }) => {}}
          />

        </div>

      </div>
    </>
  );
};

export default PreviewTemplatePage;