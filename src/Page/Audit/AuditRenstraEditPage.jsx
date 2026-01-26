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

//[pr] masih problem ux antara modal user
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

  const onSubmit = async (data) => {
    if (isEmpty(getValidToken())) return;
    const audit = (dataAudit ?? []).find(
      (item) => item.TemplateRenstraUUID == activeQuestion
    );

    if (!audit?.UUID) {
      addToast("error", "ada masalah pada audit bagian kode referensi");
      return;
    }

    console.log(audit?.TahunIndikator, audit?.TahunRenstra, positionYear)
    if (
      audit?.TahunIndikator !== positionYear ||
      audit?.TahunRenstra !== positionYear
    ) {
      addToast(
        "error",
        "ada masalah pada audit karena tidak sinkron tahun pertanyaan dengan tahun audit"
      );
      return;
    }

    const url = `http://localhost:3000/renstranilai/${positionYear}/${audit.UUID}`;

    const dataForm = new FormData();
    dataForm.append("uuidRenstra", audit?.RenstraUUID ?? "");
    dataForm.append("mode", level);

    if (level == "auditee") {
      dataForm.append("capaian", data?.capaian ?? "");
      dataForm.append("catatan", data?.catatan ?? "");
      dataForm.append("linkBukti", data?.link_bukti ?? "");
    } else if (level == "auditor1" || level == "auditor2") {
      dataForm.append("capaianAuditor", data?.capaian_auditor ?? "");
      dataForm.append("catatanAuditor", data?.catatan_auditor ?? "");
    }

    try {
      setLoading(true);
      await delay(1000);

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
      setDataAudit((prev) => {
        return prev.map((item) => {
          if (item.TemplateRenstraUUID !== activeQuestion) return item;

          if (level == "auditee") {
            return {
              ...item,
              CapaianAuditee: data.capaian,
              CatatanAuditee: data.catatan,
              LinkBukti: data.LinkBukti,
            };
          }

          return {
            ...item,
            CapaianAuditor: data.capaian_auditor,
            CatatanAuditor: data.catatan_auditor,
          };
        });
      });
    } catch {
      addToast("error", "Server tidak dapat dihubungi");
    } finally {
      setLoading(false);
    }

    console.log(data);
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
        "renstra",
        dataRenstra?.Tahun,
        dataRenstra?.FakultasUnitUuid
      );
    })();
  }, [dataRenstra]);

  useEffect(() => {
    console.log("dataAudit", dataAudit);
  }, [dataAudit]);

  useEffect(() => {
    const data = (dataAudit ?? []).find(
      (item) => item.TemplateRenstraUUID == activeQuestion
    );

    reset({
      capaian: data?.CapaianAuditee ?? "",
      catatan: data?.CatatanAuditee ?? "",
      link_bukti: data?.LinkBukti ?? "",
      capaian_auditor: data?.CapaianAuditor ?? "",
      catatan_auditor: data?.CatatanAuditor ?? "",
    });
  }, [activeQuestion]);

  const fetchTemplateQuestion = async (
    tipe = "renstra",
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
      setDataTemplate(json);
    } catch (err) {
      //[pr] banyak yg belum tangkap error selain 200
      console.error("Fetch Indikator renstra gagal:", err);
    }
  };

  const fetchDataAudit = async (uuidRenstra) => {
    if (isEmpty(getValidToken())) return;

    try {
      const res = await fetch(
        `http://localhost:3000/renstranilais?mode=sse&filters=uuidrenstra:eq:${uuidRenstra}`,
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
            {!activeQuestion ? (
              <div className="h-full flex justify-center items-center">
                <p className="text-gray-500">
                  Pilih nomor audit nya dulu baru bisa isi pertanyaan
                </p>
              </div>
            ) : (
              (dataAudit ?? [])
                .filter((q) => q.TemplateRenstraUUID === activeQuestion)
                .map((q) => {
                  if (
                    q.TahunIndikator != positionYear ||
                    q.TahunRenstra != positionYear
                  ) {
                    return (
                      <div className="h-full flex justify-center items-center">
                        <p className="text-gray-500">
                          ada masalah pada audit karena tidak sinkron tahun
                          pertanyaan dengan tahun audit
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div
                      className="flex flex-col space-y-2"
                      key={q.TemplateRenstraUUID}
                      id={`q-${q.TemplateRenstraUUID}`}
                    >
                      <div className="flex flex-col">
                        <p className="flex-1 font-bold text-lg">
                          {q.Indikator}
                        </p>
                        <small className="flex-1 italic text-sm">
                          {q.NamaStandarRenstra}
                        </small>
                      </div>

                      <TextInput
                        label="Capaian yg diharapkan"
                        value={renderCapaian(q)}
                        disabled
                      />

                      <TextInput label="Satuan" value={q.Satuan} disabled />

                      {renderInputCapaian(q)}

                      <div className="relative">
                        <label class="block text-sm font-medium mb-1">
                          Catatan Auditee
                        </label>
                        {level == "auditee" ? (
                          <textarea
                            value={watch("catatan")}
                            {...register("catatan")}
                            placeholder="Tulis catatan..."
                            className="w-full text-sm p-2 rounded border outline-none transition border-gray-300 focus:ring-2 focus:ring-purple-600"
                            rows={5}
                          />
                        ) : (
                          <textarea
                            value={watch("catatan")}
                            placeholder="Tulis catatan..."
                            className="w-full text-sm p-2 rounded border outline-none transition border-gray-300 focus:ring-2 focus:ring-purple-600"
                            rows={5}
                            disabled
                          />
                        )}
                      </div>

                      {level == "auditee" ? (
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
                        <TextInput
                          type="text"
                          label="Link Bukti"
                          placeholder="misal: drive.google.com"
                          value={watch("link_bukti")}
                          disabled
                        />
                      )}

                      {(level == "auditor1" || level == "auditor2") && (
                        <>
                          <hr className="my-3" />

                          {renderInputCapaianAuditor(q)}

                          <div className="relative">
                            <label class="block text-sm font-medium mb-1">
                              Catatan
                            </label>
                            <textarea
                              value={watch("catatan_auditor")}
                              {...register("catatan_auditor")}
                              placeholder="Tulis catatan..."
                              className="w-full text-sm p-2 rounded border outline-none transition border-gray-300 focus:ring-2 focus:ring-purple-600"
                              rows={5}
                            />
                          </div>
                        </>
                      )}

                      <button
                        className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-sm text-white rounded py-2"
                        disabled={loading}
                        onClick={handleSubmit(onSubmit)}
                      >
                        Simpan
                      </button>
                    </div>
                  );
                })
            )}
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
