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

  const ensureGenerated = async (renstra) => {
    if (!renstra?.Tahun || !renstra?.UUID || !renstra?.FakultasUnitUuid) return [];
    const token = getValidToken();
    if (isEmpty(token)) return [];

    try {
      const fd = new FormData();
      fd.append("tahun", renstra.Tahun);
      fd.append("renstra", renstra.UUID);
      fd.append("fakultas_unit", renstra.FakultasUnitUuid);

      const res = await fetch("http://localhost:3000/renstra/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (res.ok) {
        return await fetchDataAudit(renstra.UUID);
      }
    } catch (err) {
      console.error("Auto generate renstra error:", err);
    }
    return [];
  };

  const onSubmit = async (data) => {
    if (isEmpty(getValidToken())) return;
    let audit = (dataAudit ?? []).find((item) => item.TemplateDokumenTambahanUUID === activeQuestion);

    if (!audit?.UUID && dataRenstra) {
      setLoading(true);
      const generatedList = await ensureGenerated(dataRenstra);
      audit = (generatedList ?? []).find((item) => item.TemplateDokumenTambahanUUID === activeQuestion);
    }

    if (!audit?.UUID) {
      addToast("error", "Ada masalah pada audit bagian kode referensi. Silakan coba kembali.");
      setLoading(false);
      return;
    }

    const targetTahun = dataRenstra?.Tahun || positionYear;

    if (
      audit?.TahunDokumenTambahan &&
      audit?.TahunRenstra &&
      (String(audit.TahunDokumenTambahan) !== String(targetTahun) ||
        String(audit.TahunRenstra) !== String(targetTahun))
    ) {
      addToast("error", "ada masalah pada audit karena tidak sinkron tahun pertanyaan dengan tahun audit");
      return;
    }

    const url = `http://localhost:3000/dokumentambahan/${targetTahun}/${audit.UUID}`;
    
    const dataForm = new FormData();
    dataForm.append("uuidRenstra", audit?.RenstraUUID ?? dataRenstra?.UUID ?? "");
    dataForm.append("mode", level);

    if (level === "auditee") {
      dataForm.append("link", data?.link ?? "");
    } else if (level === "auditor1" || level === "auditor2") {
      dataForm.append("capaianAuditor", data?.capaian_auditor ?? "");
      dataForm.append("catatanAuditor", data?.catatan_auditor ?? "");
    }

    try {
      setLoading(true);
      await delay(500);

      const res = await fetch(url, {
        method: "PUT",
        body: dataForm,
        headers: {
          Authorization: `Bearer ${getValidToken()}`,
        },
      });

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
    } catch (err) {
      addToast(
        "error",
        `Gagal menyimpan data dokumen tambahan: ${err?.message || "Server tidak dapat dihubungi atau offline"}`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!uuidRenstra) return;
    (async () => {
      const auditList = await fetchDataAudit(uuidRenstra);
      const renstraData = await fetchDataRenstra(uuidRenstra);
      if (renstraData && (!auditList || auditList.length === 0)) {
        await ensureGenerated(renstraData);
      }
    })();
  }, [uuidRenstra]);

  useEffect(() => {
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
    if (!activeQuestion && dataTemplate && dataTemplate.length > 0) {
      const firstQ = dataTemplate.find((item) => item.IsPertanyaan);
      if (firstQ) {
        setActiveQuestion(firstQ.UUID);
      }
    }
  }, [dataTemplate, activeQuestion]);

  useEffect(() => {
    const data = (dataAudit ?? []).find(
      (item) => item.TemplateDokumenTambahanUUID === activeQuestion
    );

    reset({
      link: data?.Link ?? "",
      capaian_auditor: data?.CapaianAuditor ?? "",
      catatan_auditor: data?.CatatanAuditor ?? "",
    });
  }, [activeQuestion, dataAudit]);

  const fetchTemplateQuestion = async (
    tipe = "dokumen_tambahan",
    tahun,
    uuidfakultasunit
  ) => {
    const token = getValidToken();
    if (isEmpty(token)) return;

    try {
      const res = await fetch(
        `http://localhost:3000/preview/audit/${tipe}/${tahun}/${uuidfakultasunit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        let errorMsg = `Layanan preview dokumen tambahan gagal (HTTP ${res.status})`;
        try {
          const jsonErr = await res.json();
          if (jsonErr?.message) errorMsg = jsonErr.message;
        } catch (_) {}
        addToast("error", errorMsg);
        return;
      }

      const json = await res.json();

      let increment = 1;
      const mapped = (Array.isArray(json) ? json : []).map((item) => ({
        ...item,
        Pointing: increment++,
      }));

      setDataTemplate(mapped);
    } catch (err) {
      console.error("Fetch Indikator dokumen tambahan gagal:", err);
      addToast(
        "error",
        `Gagal memuat indikator dokumen tambahan: Gangguan koneksi ke service backend (${err.message || "Network Error"}). Pastikan service backend aktif.`
      );
    }
  };

  const fetchDataAudit = async (uuidRenstra) => {
    const token = getValidToken();
    if (isEmpty(token)) return;

    try {
      const res = await fetch(
        `http://localhost:3000/dokumentambahans?mode=sse&filters=uuidrenstra:eq:${uuidRenstra};`,
        {
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        let errorMsg = `Layanan data dokumen tambahan gagal (HTTP ${res.status})`;
        try {
          const jsonErr = await res.json();
          if (jsonErr?.message) errorMsg = jsonErr.message;
        } catch (_) {}
        addToast("error", errorMsg);
        return;
      }

      if (!res.body) {
        throw new Error("SSE stream body tidak didukung browser atau kosong");
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
      return result;
    } catch (err) {
      console.error("Fetch data audit gagal:", err);
      addToast(
        "error",
        `Gagal memuat data nilai dokumen tambahan: Gangguan koneksi ke service backend (${err.message || "Network Error"}). Pastikan service backend aktif.`
      );
      return [];
    }
  };

  const fetchDataRenstra = async (uuidRenstra) => {
    const token = getValidToken();
    if (isEmpty(token)) return null;

    try {
      const res = await fetch(`http://localhost:3000/renstra/${uuidRenstra}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let errorMsg = `Layanan data renstra gagal (HTTP ${res.status})`;
        try {
          const jsonErr = await res.json();
          if (jsonErr?.message) errorMsg = jsonErr.message;
        } catch (_) {}
        addToast("error", errorMsg);
        return null;
      }

      const json = await res.json();
      setDataRenstra(json);
      return json;
    } catch (err) {
      console.error("Fetch data renstra gagal:", err);
      addToast(
        "error",
        `Gagal memuat data jadwal renstra: Gangguan koneksi ke service backend (${err.message || "Network Error"}). Pastikan service backend aktif.`
      );
      return null;
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
            {!activeQuestion ? (
              <div className="h-full flex justify-center items-center">
                <p className="text-gray-500">Pilih nomor audit nya dulu baru bisa isi pertanyaan</p>
              </div>
            ) : (() => {
              const currentTemplate = (dataTemplate ?? []).find(
                (q) => q.UUID === activeQuestion
              );
              const currentAudit = (dataAudit ?? []).find(
                (q) => q.TemplateDokumenTambahanUUID === activeQuestion
              );

              if (!currentTemplate) {
                return (
                  <div className="h-full flex justify-center items-center">
                    <p className="text-gray-500">Pertanyaan tidak ditemukan atau sedang dimuat...</p>
                  </div>
                );
              }

              const docName =
                currentAudit?.Dokumen ||
                currentTemplate?.Dokumen ||
                currentTemplate?.JenisFile ||
                "Dokumen Tambahan";

              const questionText =
                currentAudit?.Pertanyaan ||
                currentTemplate?.Pertanyaan ||
                currentTemplate?.Indikator ||
                "";

              return (
                <div
                  className="flex flex-col space-y-4"
                  key={currentTemplate.UUID}
                  id={`q-${currentTemplate.UUID}`}
                >
                  <div className="flex flex-col pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        Point {currentTemplate.Pointing}
                      </span>
                      {currentTemplate.Klasifikasi && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {currentTemplate.Klasifikasi}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">{docName}</h3>
                    {questionText && (
                      <p className="italic text-sm text-gray-600 mt-1">
                        {questionText}
                      </p>
                    )}
                  </div>

                  {level === "auditee" ? (
                    <TextInput
                      type="text"
                      label="Link Berkas"
                      placeholder="misal: drive.google.com/..."
                      error={errors.link?.message}
                      {...register("link", {
                        required: "Link wajib diisi",
                      })}
                    />
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link Berkas
                      </label>
                      {isEmpty(watch("link")) ? (
                        <p className="text-sm text-gray-400 italic">Tidak ada link bukti</p>
                      ) : (
                        <a
                          href={watch("link")?.startsWith("http") ? watch("link") : `https://${watch("link")}`}
                          className="text-purple-600 hover:text-purple-800 underline text-sm break-all font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {watch("link")}
                        </a>
                      )}
                    </div>
                  )}

                  {(level === "auditor1" || level === "auditor2") && (
                    <div className="space-y-4 pt-2 border-t border-gray-150">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Capaian
                        </label>
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
                        {errors.capaian_auditor && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.capaian_auditor.message}
                          </p>
                        )}
                      </div>

                      {watch("capaian_auditor") === "0" && (
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Catatan
                          </label>
                          <textarea
                            {...register("catatan_auditor", {
                              required: "Catatan wajib diisi jika capaian tidak",
                            })}
                            placeholder="Tulis catatan kenapa tidak tercapai..."
                            className="w-full text-sm p-2.5 rounded-xl border outline-none transition border-gray-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                            rows={4}
                          />
                          {errors.catatan_auditor && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.catatan_auditor.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-sm font-medium text-white rounded-xl py-2.5 transition shadow-sm cursor-pointer"
                    >
                      {loading ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
              );
            })()}
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
