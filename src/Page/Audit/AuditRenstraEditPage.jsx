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
import SearchSelect from "@/Components/SearchSelect";
import InfoAuditCard from "@/Components/InfoAuditCard";
import { apiClient, API_BASE_URL } from "@/Common/api";

//[pr] ini masih belum selesai
const AuditRenstraEditPage = () => {
  const { uuidRenstra } = useParams();
  const { addToast } = useToast();
  const {
    level,
    listLevel,
    setLevel,
    openChangeLevel,
    setOpenChangeLevel,
    positionYear,
  } = useContent();
  const { getValidToken } = useAuth();

  const [dataAudit, setDataAudit] = useState([]);
  const [dataTemplate, setDataTemplate] = useState([]);
  const [dataRenstra, setDataRenstra] = useState(null);
  const [templateNotFound, setTemplateNotFound] = useState(false);

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
  } = useForm({
    defaultValues: {
      capaian: "",
      catatan: "",
      link_bukti: "",
      capaian_auditor: "",
      catatan_auditor: "",
    },
  });

  const ensureGenerated = async (renstra) => {
    if (!renstra?.Tahun || !renstra?.UUID || !renstra?.FakultasUnitUuid) return [];

    try {
      const fd = new FormData();
      fd.append("tahun", renstra.Tahun);
      fd.append("renstra", renstra.UUID);
      fd.append("fakultas_unit", renstra.FakultasUnitUuid);

      await apiClient.post("/renstra/generate", fd);
      return await fetchDataAudit(renstra.UUID);
    } catch (err) {
      console.error("Auto generate renstra error:", err);
    }
    return [];
  };

  const onSubmit = async (data) => {
    if (isEmpty(getValidToken())) return;
    let audit = (dataAudit ?? []).find(
      (item) => item.TemplateRenstraUUID === activeQuestion
    );

    if (!audit?.UUID && dataRenstra) {
      setLoading(true);
      const generatedList = await ensureGenerated(dataRenstra);
      audit = (generatedList ?? []).find(
        (item) => item.TemplateRenstraUUID === activeQuestion
      );
    }

    if (!audit?.UUID) {
      addToast("error", "Ada masalah pada audit bagian kode referensi. Silakan coba kembali.");
      setLoading(false);
      return;
    }

    const targetTahun = dataRenstra?.Tahun || positionYear;

    if (
      audit?.TahunIndikator &&
      audit?.TahunRenstra &&
      (String(audit.TahunIndikator) !== String(targetTahun) ||
        String(audit.TahunRenstra) !== String(targetTahun))
    ) {
      addToast(
        "error",
        "ada masalah pada audit karena tidak sinkron tahun pertanyaan dengan tahun audit"
      );
      return;
    }

    const url = `/renstranilai/${targetTahun}/${audit.UUID}`;

    const dataForm = new FormData();
    dataForm.append("uuidRenstra", audit?.RenstraUUID ?? dataRenstra?.UUID ?? "");
    dataForm.append("mode", level);

    if (level === "auditee") {
      dataForm.append("capaian", data?.capaian ?? "");
      dataForm.append("catatan", data?.catatan ?? "");
      dataForm.append("linkBukti", data?.link_bukti ?? "");
    } else if (level === "auditor1" || level === "auditor2") {
      dataForm.append("capaianAuditor", data?.capaian_auditor ?? "");
      dataForm.append("catatanAuditor", data?.catatan_auditor ?? "");
    }

    try {
      setLoading(true);
      await delay(500);

      await apiClient.put(url, dataForm);

      addToast("success", "Berhasil disimpan");
      setDataAudit((prev) => {
        return prev.map((item) => {
          if (item.TemplateRenstraUUID !== activeQuestion) return item;

          if (level === "auditee") {
            return {
              ...item,
              CapaianAuditee: data.capaian,
              CatatanAuditee: data.catatan,
              LinkBukti: data.link_bukti,
            };
          }

          return {
            ...item,
            CapaianAuditor: data.capaian_auditor,
            CatatanAuditor: data.catatan_auditor,
          };
        });
      });
    } catch (err) {
      addToast(
        "error",
        `Gagal menyimpan data audit: ${err?.message || "Server tidak dapat dihubungi atau offline"}`
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
        "renstra",
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
      (item) => item.TemplateRenstraUUID === activeQuestion
    );

    reset({
      capaian: data?.CapaianAuditee ?? "",
      catatan: data?.CatatanAuditee ?? "",
      link_bukti: data?.LinkBukti ?? "",
      capaian_auditor: data?.CapaianAuditor ?? "",
      catatan_auditor: data?.CatatanAuditor ?? "",
    });
  }, [activeQuestion, dataAudit]);

  const fetchTemplateQuestion = async (
    tipe = "renstra",
    tahun,
    uuidfakultasunit
  ) => {
    const token = getValidToken();
    if (isEmpty(token)) return;

    try {
      const json = await apiClient.get(
        `/preview/audit/${tipe}/${tahun}/${uuidfakultasunit}`
      );
      setTemplateNotFound(false);
      setDataTemplate(Array.isArray(json) ? json : []);
    } catch (err) {
      if (err?.response?.status === 404) {
        setTemplateNotFound(true);
        setDataTemplate([]);
        return;
      }
      console.error("Fetch Indikator renstra gagal:", err);
      addToast(
        "error",
        `Gagal memuat indikator audit: Gangguan koneksi ke service backend (${err?.message || "Network Error"}). Pastikan service backend aktif.`
      );
    }
  };

  const fetchDataAudit = async (uuidRenstra) => {
    const token = getValidToken();
    if (isEmpty(token)) return [];

    try {
      const res = await fetch(
        `${API_BASE_URL}/renstranilais?mode=sse&filters=uuidrenstra:eq:${uuidRenstra}`,
        {
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        let errorMsg = `Layanan data nilai audit renstra gagal (HTTP ${res.status})`;
        try {
          const jsonErr = await res.json();
          if (jsonErr?.message) errorMsg = jsonErr.message;
        } catch (_) {}
        addToast("error", errorMsg);
        return [];
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
        `Gagal memuat data nilai audit renstra: Gangguan koneksi ke service backend (${err.message || "Network Error"}). Pastikan service backend aktif.`
      );
      return [];
    }
  };

  const fetchDataRenstra = async (uuidRenstra) => {
    try {
      const json = await apiClient.get(`/renstra/${uuidRenstra}`);
      setDataRenstra(json);
      return json;
    } catch (err) {
      console.error("Fetch data renstra gagal:", err);
      addToast(
        "error",
        `Gagal memuat data jadwal renstra: Gangguan koneksi ke service backend (${err?.message || "Network Error"}). Pastikan service backend aktif.`
      );
      return null;
    }
  };

  const getButtonClass = (dataTemplate) => {
    const data = (dataAudit ?? []).find(
      (item) => item.TemplateRenstraUUID === dataTemplate.UUID
    );

    let style =
      dataTemplate.UUID === activeQuestion
        ? "border-2 border-purple-500"
        : "border";

    const isDone =
      (level === "auditee" && !!data?.CapaianAuditee) ||
      (level !== "auditee" && !!data?.CapaianAuditor);

    if (isDone) style += " bg-green-400 text-white";

    return style;
  };

  function mirrorOperator(operator) {
    if (operator == ">=") {
      return ">=";
    } else if (operator == ">") {
      return ">";
    } else if (operator == "<=") {
      return "<=";
    } else if (operator == "<") {
      return "<";
    } else if (operator == "≥") {
      return "≥";
    } else if (operator == "≤") {
      return "≤";
    }
    return "#";
  }
  
  const renderCapaian = (dataAudit) => {
    if (dataAudit.Kategori == "kategori") {
      return dataAudit.Target ?? "-";
    } else if (dataAudit.Kategori == "range") {
      return `${dataAudit.TargetMin} ${dataAudit.TargetMin} ${
        dataAudit.Operator
      } nilai ${mirrorOperator(dataAudit.Operator)} ${dataAudit.TargetMax} ${
        dataAudit.TargetMax
      }`;
    } else {
      return dataAudit.Target ?? ">=";
    }
  };

  //[pr] belum di disable berdasarkan dataRenstra range
  const renderInputCapaian = (dataAudit) => {
    if (dataAudit.Kategori == "kategori") {
      return level == "auditee" ? (
        <SearchSelect
          label="Isi Capaian"
          options={
            dataAudit.Target == "tercapai"
              ? [
                  { id: "tercapai", nama: "Tercapai" },
                  { id: "belum_tercapai", nama: "Belum Tercapai" },
                ]
              : [
                  { id: "terlaksana", text: "Terlaksana" },
                  { id: "belum_terlaksana", text: "Belum Terlaksana" },
                ]
          }
          placeholder="Pilih capaiannya"
          value={watch("capaian")}
          onChange={(item) =>
            setValue("capaian", item, {
              shouldValidate: true,
            })
          }
        />
      ) : (
        <SearchSelect
          label="Isi Capaian Auditee"
          options={
            dataAudit.Target == "tercapai"
              ? [
                  { id: "tercapai", nama: "Tercapai" },
                  { id: "belum_tercapai", nama: "Belum Tercapai" },
                ]
              : [
                  { id: "terlaksana", text: "Terlaksana" },
                  { id: "belum_terlaksana", text: "Belum Terlaksana" },
                ]
          }
          placeholder="Pilih capaiannya"
          value={watch("capaian")}
          disabled
        />
      );
    } else if (dataAudit.Kategori == "range") {
      return level == "auditee" ? (
        <TextInput
          type="number"
          step="0.0001"
          label="Isi Capaian"
          placeholder="masukkan nilai capaiannya"
          min={dataAudit?.TargetMin ?? 0}
          max={dataAudit?.TargetMax ?? 0}
          error={errors.capaian?.message}
          {...register("capaian", {
            required: "Isi Capaian wajib diisi",
          })}
        />
      ) : (
        <TextInput
          type="number"
          step="0.0001"
          min={dataAudit?.TargetMin ?? 0}
          max={dataAudit?.TargetMax ?? 0}
          label="Isi Capaian Auditee"
          placeholder="masukkan nilai capaiannya"
          value={watch("capaian")}
          disabled
        />
      );
    } else {
      return level == "auditee" ? (
        <TextInput
          type={dataAudit.Kategori == "numerik" ? "number" : "text"}
          label="Isi Capaian"
          placeholder="masukkan capaiannya"
          error={errors.capaian?.message}
          {...register("capaian", {
            required: "Isi Capaian wajib diisi",
          })}
        />
      ) : (
        <TextInput
          type={dataAudit.Kategori == "numerik" ? "number" : "text"}
          label="Isi Capaian Auditee"
          placeholder="masukkan capaiannya"
          value={watch("capaian")}
          disabled
        />
      );
    }
  };

  //[pr] belum di disable berdasarkan dataRenstra range
  const renderInputCapaianAuditor = (dataAudit) => {
    if (dataAudit.Kategori == "kategori") {
      return (
        <SearchSelect
          label="Isi Capaian"
          options={
            dataAudit.Target == "tercapai"
              ? [
                  { id: "tercapai", nama: "Tercapai" },
                  { id: "belum_tercapai", nama: "Belum Tercapai" },
                ]
              : [
                  { id: "terlaksana", text: "Terlaksana" },
                  { id: "belum_terlaksana", text: "Belum Terlaksana" },
                ]
          }
          placeholder="Pilih capaiannya"
          value={watch("capaian_auditor")}
          onChange={(item) =>
            setValue("capaian_auditor", item, {
              shouldValidate: true,
            })
          }
        />
      );
    } else if (dataAudit.Kategori == "range") {
      return (
        <TextInput
          type="number"
          step="0.0001"
          label="Isi Capaian"
          min={dataAudit?.TargetMin ?? 0}
          max={dataAudit?.TargetMax ?? 0}
          placeholder="masukkan nilai capaiannya"
          error={errors.capaian_auditor?.message}
          {...register("capaian_auditor", {
            required: "Isi Capaian wajib diisi",
          })}
        />
      );
    } else {
      return (
        <TextInput
          type={dataAudit.Kategori == "numerik" ? "number" : "text"}
          label="Isi Capaian"
          placeholder="masukkan capaiannya"
          error={errors.capaian_auditor?.message}
          {...register("capaian_auditor", {
            required: "Isi Capaian wajib diisi",
          })}
        />
      );
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
      <div class="p-3 bg-white min-h-screen flex flex-col md:flex-row w-full overflow-x-hidden">
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
                      className={`w-10 h-10 flex items-center justify-center rounded ${getButtonClass(
                        q
                      )}`}
                    >
                      {q.Pointing}
                    </button>
                  );
                })}
            </div>

            <button
              className="w-full my-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-sm text-white rounded py-2"
              onClick={() => {
                setPanelOpen(false);
                //[pr] bikin modal
              }}
              disabled
            >
              Catatan Akhir
            </button>
          </div>
        </div>

        {/* Sisi kiri: pertanyaan aktif */}
        <div class="flex-1 flex flex-col md:mr-4 h-screen gap-4 min-w-0">
          <InfoAuditCard info={dataRenstra} />

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 p-4 border rounded md:mr-4 overflow-y-auto h-screen"
          >
            {templateNotFound ? (
              <div className="h-full flex flex-col justify-center items-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3 text-lg font-bold">
                  !
                </div>
                <h4 className="font-semibold text-gray-800 text-base mb-1">
                  Template Renstra Belum Tersedia
                </h4>
                <p className="text-gray-500 text-sm max-w-md">
                  Target audit ini tidak memiliki template indikator renstra untuk tahun {dataRenstra?.Tahun || positionYear}.
                </p>
              </div>
            ) : !activeQuestion ? (
              <div className="h-full flex justify-center items-center">
                <p className="text-gray-500">
                  Pilih nomor audit nya dulu baru bisa isi pertanyaan
                </p>
              </div>
            ) : (() => {
              const currentTemplate = (dataTemplate ?? []).find(
                (q) => q.UUID === activeQuestion
              );
              const currentAudit = (dataAudit ?? []).find(
                (q) => q.TemplateRenstraUUID === activeQuestion
              );

              if (!currentTemplate) {
                return (
                  <div className="h-full flex justify-center items-center">
                    <p className="text-gray-500">
                      Pertanyaan sedang dimuat atau tidak ditemukan...
                    </p>
                  </div>
                );
              }

              const itemData = {
                ...currentTemplate,
                ...currentAudit,
                Kategori: currentAudit?.Kategori || currentTemplate?.Kategori,
                Target: currentAudit?.Target || currentTemplate?.Target,
                TargetMin: currentAudit?.TargetMin || currentTemplate?.TargetMin,
                TargetMax: currentAudit?.TargetMax || currentTemplate?.TargetMax,
                Satuan: currentAudit?.Satuan || currentTemplate?.Satuan,
                Operator: currentAudit?.Operator || currentTemplate?.Operator,
                NamaIndikator: currentAudit?.NamaIndikator || currentTemplate?.Indikator,
              };

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
                    <h3 className="font-bold text-lg text-gray-800">
                      {itemData.NamaIndikator}
                    </h3>
                  </div>

                  <TextInput
                    label="Capaian yg diharapkan"
                    value={renderCapaian(itemData)}
                    disabled
                  />

                  <TextInput label="Satuan" value={itemData.Satuan || "-"} disabled />

                  {renderInputCapaian(itemData)}

                  <div className="relative">
                    <label className="block text-sm font-medium mb-1">
                      Catatan Auditee
                    </label>
                    {level === "auditee" ? (
                      <textarea
                        value={watch("catatan")}
                        {...register("catatan")}
                        placeholder="Tulis catatan..."
                        className="w-full text-sm p-2.5 rounded-xl border outline-none transition border-gray-300 focus:ring-2 focus:ring-purple-600"
                        rows={5}
                      />
                    ) : (
                      <textarea
                        value={watch("catatan")}
                        placeholder="Tulis catatan..."
                        className="w-full text-sm p-2.5 rounded-xl border outline-none transition border-gray-300 focus:ring-2 focus:ring-purple-600 bg-gray-50"
                        rows={5}
                        disabled
                      />
                    )}
                  </div>

                  {level === "auditee" ? (
                    <TextInput
                      type="text"
                      label="Link Bukti"
                      placeholder="misal: drive.google.com"
                      error={errors.link_bukti?.message}
                      {...register("link_bukti", {
                        required: "Link Bukti wajib diisi",
                      })}
                    />
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link Bukti
                      </label>
                      {isEmpty(watch("link_bukti")) ? (
                        <p className="text-sm text-gray-400 italic">Tidak ada link bukti</p>
                      ) : (
                        <a
                          href={watch("link_bukti")?.startsWith("http") ? watch("link_bukti") : `https://${watch("link_bukti")}`}
                          className="text-purple-600 hover:text-purple-800 underline text-sm break-all font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {watch("link_bukti")}
                        </a>
                      )}
                    </div>
                  )}

                  {(level === "auditor1" || level === "auditor2") && (
                    <div className="space-y-4 pt-2 border-t border-gray-150">
                      {renderInputCapaianAuditor(itemData)}

                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Catatan Auditor
                        </label>
                        <textarea
                          value={watch("catatan_auditor")}
                          {...register("catatan_auditor")}
                          placeholder="Tulis catatan..."
                          className="w-full text-sm p-2.5 rounded-xl border outline-none transition border-gray-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                          rows={4}
                        />
                      </div>
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
                    className={`w-10 h-10 flex items-center justify-center rounded ${getButtonClass(
                      q
                    )}`}
                  >
                    {q.Pointing}
                  </button>
                );
              })}
          </div>
          <button
            className="w-full my-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-sm text-white rounded py-2"
            onClick={() => {
              //[pr] bikin modal
            }}
            disabled
          >
            Catatan Akhir
          </button>
        </div>
      </div>
    </>
  );
};

export default AuditRenstraEditPage;
