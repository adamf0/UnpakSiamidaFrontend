import React, { useState, useEffect } from "react";

import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useAuth } from "@/Providers/AuthProvider";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { useToast } from "@/Providers/ToastProvider";
import { useParams } from "react-router-dom";
import { delay, isEmpty } from "@/Common/Utils";
import TextInput from "@/Components/TextInput";
import { useForm } from "react-hook-form";
import RadioButton from "@/Components/RadioButton";
import InfoAuditCard from "@/Components/InfoAuditCard";

//[pr] masih problem ux antara modal user
const AuditTambahanEditPage = () => {
  const { uuidRenstra } = useParams();
  const { addToast } = useToast();
  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel, positionYear } = useContent();
  const { getValidToken } = useAuth();

  const [dataAudit, setDataAudit] = useState([]);
  const [dataTemplate, setDataTemplate] = useState([]);
  const [dataRenstra, setDataRenstra] = useState(null);

  // const [isMobileMode, setIsMobileMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false); // untuk sm screen

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: { link: "", capaian_auditor: "", catatan_auditor: "", } });

  const onSubmit = async (data) => {
    if (isEmpty(getValidToken())) return;
    const audit = (dataAudit ?? []).find((item)=> item.TemplateDokumenTambahanUUID==activeQuestion);

    if(!audit?.UUID){
      addToast("error","ada masalah pada audit bagian kode referensi");
      return;
    }

    if (
      audit?.TahunDokumenTambahan !== positionYear ||
      audit?.TahunRenstra !== positionYear
    ) {
      addToast("error","ada masalah pada audit karena tidak sinkron tahun pertanyaan dengan tahun audit");
      return;
    }

    const url = `http://localhost:3000/dokumentambahan/${positionYear}/${audit.UUID}`;
    
    const dataForm = new FormData();
    dataForm.append("uuidRenstra", audit?.RenstraUUID ?? "");
    dataForm.append("mode", level);

    if(level=="auditee"){
      dataForm.append("link",data?.link ?? "");
    } else if(level=="auditor1" || level=="auditor2"){
      dataForm.append("capaianAuditor",data?.capaian_auditor ?? "");
      dataForm.append("catatanAuditor",data?.catatan_auditor ?? "");
    }

    try {
      setLoading(true);
      await delay(1000);

      const res = await fetch(
        url,
        {
          method: "PUT",
          body: dataForm,
          headers: {
            Authorization: `Bearer ${getValidToken()}`
          }
        }
      );

      const json = await res.json();

      if (!res.ok) {
        addToast("error", json.message || "Gagal menyimpan");
        return;
      }

      addToast("success", "Berhasil disimpan");
      setDataAudit((prev) =>
        prev.map((item) => {
          if (item.TemplateDokumenTambahanUUID !== activeQuestion) return item;

          if (level === "auditee") {
            return {
              ...item,
              Link: data.link,
            };
          }

          return {
            ...item,
            CapaianAuditor: data.capaian_auditor,
            CatatanAuditor: data.catatan_auditor,
          };
        })
      );
    } catch {
      addToast("error", "Server tidak dapat dihubungi");
    } finally{
      setLoading(false);
    }

    console.log(data)
  };
  useEffect(() => {
    (async () => {
      await fetchDataAudit(uuidRenstra);
      await fetchDataRenstra(uuidRenstra);
    })();
  }, [uuidRenstra]);

  useEffect(() => {
    // console.log("dataRenstra", dataRenstra);
    if (!dataRenstra) return;

    (async () => {
      await fetchTemplateQuestion(
        "dokumen_tambahan",
        dataRenstra?.Tahun,
        dataRenstra?.FakultasUnitUuid
      );
    })();
  }, [dataRenstra]);

  useEffect(() => {
    console.log("dataAudit", dataAudit);
  }, [dataAudit]);

  useEffect(()=>{
    const data = (dataAudit ?? []).find((item)=> item.TemplateDokumenTambahanUUID==activeQuestion);
    
    reset({ link: data?.Link ?? "", capaian_auditor: data?.CapaianAuditor ?? "", catatan_auditor: data?.CatatanAuditor ?? "" });
  },[activeQuestion]);

  const fetchTemplateQuestion = async (
    tipe = "dokumen_tambahan",
    tahun,
    uuidfakultasunit
  ) => {
    if (isEmpty(getValidToken())) return;

    try {
      const res = await fetch(
        `http://localhost:3000/preview/audit/${tipe}/${tahun}/${uuidfakultasunit}`,
        {
          headers: {
            Authorization: `Bearer ${getValidToken()}`,
          },
        }
      );

      const json = await res.json();

      let increment = 1;
      const mapped = json.map(item => ({
        ...item,
        Pointing: increment++,
      }));

      setDataTemplate(mapped);
    } catch (err) {
      //[pr] banyak yg belum tangkap error selain 200
      console.error("Fetch Indikator renstra gagal:", err);
    }
  };

  const fetchDataAudit = async (uuidRenstra) => {
    if (isEmpty(getValidToken())) return;

    try {
      const res = await fetch(
        `http://localhost:3000/dokumentambahans?mode=sse&filters=uuidrenstra:eq:${uuidRenstra};`,
        {
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${getValidToken()}`,
          },
        }
      );

      if (!res.body) {
        throw new Error("SSE not supported");
      }

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

            result.push(parsed);
          } catch (err) {
            console.error("JSON parse error:", payload);
          }
        }
      }

      setDataAudit(result);
    } catch (err) {
      //[pr] banyak yg belum tangkap error selain 200
      console.error("Fetch data audit gagal:", err);
    }
  };

  const fetchDataRenstra = async (uuidRenstra) => {
    if (isEmpty(getValidToken())) return;

    try {
      const res = await fetch(`http://localhost:3000/renstra/${uuidRenstra}`, {
        headers: {
          Authorization: `Bearer ${getValidToken()}`,
        },
      });
      const json = await res.json();
      setDataRenstra(json);
    } catch (err) {
      //[pr] banyak yg belum tangkap error selain 200
      console.error("Fetch data renstra gagal:", err);
    }
  };

  const getButtonClass = (dataTemplate) => {
    const data = (dataAudit ?? []).find(
      (item) => item.TemplateDokumenTambahanUUID === dataTemplate.UUID
    );

    let style =
      dataTemplate.UUID === activeQuestion
        ? "border-2 border-purple-500"
        : "border";

    const isDone =
      (level === "auditee" && !isEmpty(data?.Link)) ||
      (level !== "auditee" && !isEmpty(data?.CapaianAuditor));

    if (isDone) style += " bg-green-400 text-white";

    return style;
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
      <div className="p-3 bg-white min-h-screen flex flex-col md:flex-row">
        {/* Panel Nomor Soal Floating untuk SM */}
        <div className="md:hidden fixed bottom-4 right-4 z-50">
          {/* Tombol toggle */}
          <button
            onClick={() => {
              if (!openChangeLevel) {
                setOpenChangeLevel(false);
              }
              setPanelOpen(!panelOpen);
            }}
            className={`p-2 bg-blue-500 text-white rounded shadow mb-2`}
          >
            {panelOpen ? <BsChevronRight /> : <BsChevronLeft />}
          </button>

          {/* Panel floating */}
          <div
            className={`fixed top-0 right-0 h-screen w-[14rem] bg-gray-50 border-l p-4 overflow-y-auto transition-transform shadow-lg rounded-l ${
              panelOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Tombol Close */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Judul + info scroll */}
            <h3 className="font-semibold mb-1">Nomor Audit</h3>
            <p className="text-xs text-gray-500 mb-2 italic">
              Geser ke atas/bawah untuk melihat semua soal
            </p>

            {/* Nomor soal */}
            <div className="flex flex-wrap gap-2">
              {(dataTemplate ?? [])
                .filter((item) => item.IsPertanyaan)
                .map((q) => {
                  return (
                    <button
                      key={q.UUID}
                      onClick={() => {
                        setActiveQuestion(q.UUID);
                        setPanelOpen(false);
                      }}
                      className={`w-10 h-10 flex items-center justify-center rounded ${getButtonClass(q)}`}
                    >
                      {q.Pointing}
                    </button>
                  );
                })}
            </div>

            <button className="w-full my-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-sm text-white rounded py-2" onClick={() => {
              setPanelOpen(false);
              //[pr] bikin modal
            }} disabled>Catatan Akhir</button>
          </div>
        </div>

        {/* Sisi kiri: pertanyaan aktif */}
        <div class="flex-1 flex flex-col md:mr-4 h-screen gap-4 min-w-0">
          <InfoAuditCard info={dataRenstra} />

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 p-4 border rounded md:mr-4 overflow-y-auto h-screen"
          >
            {!activeQuestion? 
              <div className="h-full flex justify-center items-center">
                <p className="text-gray-500">Pilih nomor audit nya dulu baru bisa isi pertanyaan</p>
              </div>:
              (dataAudit ?? [])
              .filter((q) => q.TemplateDokumenTambahanUUID === activeQuestion)
              .map((q) => {
                if(q.TahunDokumenTambahan != positionYear || q.TahunRenstra != positionYear){
                  return <div className="h-full flex justify-center items-center">
                    <p className="text-gray-500">ada masalah pada audit karena tidak sinkron tahun pertanyaan dengan tahun audit</p>
                  </div>
                }
                return (
                  <div
                    className="flex flex-col space-y-2"
                    key={q.TemplateDokumenTambahanUUID}
                    id={`q-${q.TemplateDokumenTambahanUUID}`}
                  >
                    <div className="flex flex-col">
                      <p className="flex-1 font-bold text-lg">{q.Dokumen}</p>
                      <small className="flex-1 italic text-sm">
                        {q.Pertanyaan}
                      </small>
                    </div>

                    {
                      level=="auditee"? 
                      <TextInput
                        type="text"
                        label="Link Berkas"
                        placeholder="misal: drive.google.com"
                        error={errors.link?.message}
                        {...register("link", {
                          required: "Link wajib diisi",
                        })}
                      /> : 
                      <>
                      <label className="block text-sm font-medium mb-1">Link Berkas </label>
                      {(isEmpty(watch("link"))? "Tidak ada link bukti":<a href={watch("link")} className="text-purple-500 hover:text-black text-sm rounded" target="_blank">{watch("link")}</a>)}
                      </>
                    }

                    {
                      (level=="auditor1" || level=="auditor2") && <>
                        <hr className="my-3"/>

                        <label className="block text-sm font-medium mb-1">Capaian</label>
                        <div className="flex gap-4">
                          {["1", "0"].map((v) => (
                            <RadioButton
                              key={v}
                              value={v}
                              text={v === "1" ? "Ya" : "Tidak"}
                              checked={watch("capaian_auditor") === v}
                              onChange={() => {
                                setValue("capaian_auditor", v, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }}
                            />
                          ))}
                        </div>

                        {/* error message */}
                        {errors.capaian_auditor && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.capaian_auditor.message}
                          </p>
                        )}


                        {watch("capaian_auditor") === "0" && (
                          <div className="relative">
                            <label className="block text-sm font-medium mb-1">
                              Catatan
                            </label>
                            <textarea
                              {...register("catatan_auditor", {
                                required: "Catatan wajib diisi jika capaian tidak",
                              })}
                              placeholder="Tulis catatan kenapa tidak tercapai..."
                              className="w-full text-sm p-2 rounded border outline-none transition border-gray-300 focus:ring-2 focus:ring-purple-600"
                              rows={5}
                            />
                            {errors.catatan_auditor && (
                              <p className="text-red-500 text-xs mt-1">
                                {errors.catatan_auditor.message}
                              </p>
                            )}
                          </div>
                        )}

                      </>
                    }

                    <button className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-sm text-white rounded py-2" disabled={loading} onClick={handleSubmit(onSubmit)}>Simpan</button>
                  </div>
                );
              })}
          </form>
        </div>

        {/* Sisi kanan: panel nomor soal untuk desktop */}
        <div className="hidden md:block w-80 p-4 bg-gray-50 border-l overflow-y-auto h-screen">
          <h3 className="font-semibold mb-2">Nomor Audit</h3>
          <div className="flex flex-wrap gap-2">
            {(dataTemplate ?? [])
              .filter((item) => item.IsPertanyaan)
              .map((q) => {
                return (
                  <button
                    key={q.UUID}
                    onClick={() => {
                      setActiveQuestion(q.UUID);
                      setPanelOpen(false);
                    }}
                    className={`w-10 h-10 flex items-center justify-center rounded ${getButtonClass(q)}`}
                  >
                    {q.Pointing}
                  </button>
                );
              })}
          </div>
          <button className="w-full my-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-sm text-white rounded py-2" onClick={()=>{
            //[pr] bikin modal
          }} disabled>Catatan Akhir</button>
        </div>
      </div>
    </>
  );
};

export default AuditTambahanEditPage;
