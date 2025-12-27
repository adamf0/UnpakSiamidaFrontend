import React, { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import get from "lodash.get";

import TextInput from "@/Components/TextInput";
import RadioButton from "@/Components/RadioButton";
import SearchSelect from "@/Components/SearchSelect";
import ErrorSection from "@/Components/ErrorSection";
import Shimmer from "@/Components/Shimmer";
import ShimmerTable from "@/Components/ShimmerTable";

import { useToast } from "@/Providers/ToastProvider";
import { delay, isEmpty, isValidationError, normalizeValidationMessage } from "@/Common/Utils";
import RowClearAction from "@/Components/RowClearAction";
import RowStatusAction from "@/Components/RowStatusAction";
import { useErrorModal } from "@/Components/ErrorModal/useErrorModal";
import ErrorModal from "@/Components/ErrorModal/ErrorModal";
import { useContent } from "@/Providers/ContentProvider";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import Navbar from "@/Components/Navbar";

/* =========================
   STAKEHOLDER CONFIG
========================= */
const STAKEHOLDER_TYPES = ["fakultas", "prodi", "unit"];
const buildRowKey = (type) => `${type}#all`;

/* =========================
   ROW ACTIVE CHECK
========================= */
const isRowActive = (row) => {
  if (!row) return false;
  return Boolean(row.enable);
};

const TemplateDokumenTambahanFormPage = () => {
  const navigate = useNavigate();
  const { tahun, uuidJenisFile } = useParams();
  const { addToast } = useToast();
  const mode = !isEmpty(tahun) && !isEmpty(uuidIndikator)? "edit":"add"
  const { modal, openModal, closeModal } = useErrorModal();

  const {
      level,
      setLevel,
      openChangeLevel,
      setOpenChangeLevel,
  } = useContent();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      tahun: "",
      jenis_file: null,
      pertanyaan: "",
      rows: {},
    },
  });

  const watchedTahun = useWatch({ control, name: "tahun" });
  const watchedJenisFile = useWatch({ control, name: "jenis_file" });

  const [jenisFileOptions, setJenisFileOptions] = useState([]);
  const [loading, setLoading] = useState({
    jenisfile: false,
    template: false,
  });
  const [error, setError] = useState(null);

  const setLoad = (k, v) => setLoading((s) => ({ ...s, [k]: v }));

  const fetchJenisFileOptions = async (tahun) => {
    setLoad("jenisfile", true);
    try {
      const res = await fetch(
        `http://localhost:3000/jenisfiles?filters=tahun:eq:${tahun}`
      );
      const json = await res.json();
      setJenisFileOptions(
        json.data.map((d) => ({
          ...d,
          id: d.UUID,
          nama: d.Nama,
        }))
      );
    } catch {
      setError("Gagal memuat jenis file");
    } finally {
      setLoad("jenisfile", false);
    }
  };

  const fetchTemplateDokumenTambahanEdit = async (tahun, jenisFileUuid) => {
    setLoad("template", true);
    try {
      const res = await fetch(
        `http://localhost:3000/templatedokumentambahans?mode=all&filters=tahun:eq:${tahun};jenisfileuuid:eq:${jenisFileUuid}`
      );
      const data = await res.json();

      data.forEach((row, i) => {
        if(i==0){
          setValue("pertanyaan", row.Pertanyaan);
        }

        const key = row.FakultasProdiUnit;
        setValue(
          `rows.${key}`,
          {
            enable: Boolean(row.Klasifikasi || row.Tugas),
            klasifikasi: row.Klasifikasi || null,
            tugas: row.Tugas || null,
          },
          { shouldDirty: false, shouldValidate: false }
        );
        markRowActive(key);
      });
    } catch {
      setError("Gagal memuat template");
    } finally {
      setLoad("template", false);
    }
  };

  /* =========================
     MARK ROW ACTIVE & TRIGGER VALIDASI
  ========================== */
  const markRowActive = async (rowKey) => {
    const row = watch(`rows.${rowKey}`) || {};
    const isActive = Object.values(row).some((v) => v); // aktif jika ada isi

    // setValue langsung validasi, trigger manual tidak perlu
    setValue(`rows.${rowKey}.enable`, isActive, { shouldValidate: true });
    await trigger()
  };

  useEffect(() => {
    if (tahun) setValue("tahun", tahun);
  }, [tahun]);

  useEffect(() => {
    if (watchedTahun) fetchJenisFileOptions(watchedTahun);
  }, [watchedTahun]);

  useEffect(() => {
    if (!jenisFileOptions.length || !uuidJenisFile) return;
    const selected = jenisFileOptions.find((i) => i.UUID === uuidJenisFile);
    if (selected) {
      setValue("jenis_file", selected, { shouldDirty: false });
    }
  }, [uuidJenisFile, jenisFileOptions]);

  useEffect(() => {
    if (!watchedTahun || !watchedJenisFile?.UUID) return;
    if (uuidJenisFile) {
      fetchTemplateDokumenTambahanEdit(watchedTahun, watchedJenisFile.UUID);
    }
  }, [watchedTahun, watchedJenisFile?.UUID]);

  const onSubmit = async (data) => {
    console.log("kirim")

    const valid = await trigger();
    if (!valid) {
      addToast("error", "Masih ada data yang belum lengkap");
      return;
    }

    const totalSendData = Object.values(data.rows)
    .filter(row => row?.enable)
    .length;

    const payloads = Object.entries(data.rows)
    .filter(([_, row]) => row?.enable)
    .map(([key, row]) => {
      const fd = new FormData();
      fd.append("tahun", data.tahun);
      fd.append("jenisFile", data.jenis_file.UUID);
      fd.append("pertanyaan", data.pertanyaan);
      fd.append("kategori", key);
      fd.append("klasifikasi", row.klasifikasi);
      fd.append("tugas", row.tugas);

      return { key, fd };
    });
    console.log("SUBMIT:", data, payloads);
    
    await Promise.all(
      payloads.map(async ({ key, fd }) => {
        try {
          setValue(`rows.${key}.status`, "loading");
          await delay(3000);

          const res = await fetch(
            "http://localhost:3000/templatedokumentambahan",
            {
              method: "POST",
              body: fd,
            }
          );

          const json = await res.json();

          if (!res.ok) {
            console.log(json)
            setValue(`rows.${key}.status`, "error");
            if(isValidationError(json.code)){
              const validationMessage = normalizeValidationMessage(json.message);
              setValue(`rows.${key}.errormessage`, validationMessage);
              addToast("error", validationMessage);
            } else{
              setValue(`rows.${key}.errormessage`, json.message || "Gagal");
              addToast("error", json.message);
            }
            return;
          }

          setValue(`rows.${key}.status`, "success");
          addToast("success", "Data berhasil disimpan");
          successCount++;
          if(successCount>=totalSendData && mode=="add"){
            navigate(`/template_dokumen_tambahan`)
          }
        } catch (err){
          console.log(err)
          setValue(`rows.${key}.status`, "error");
          setValue(`rows.${key}.errormessage`, err?.message || "Gagal");
          addToast("error", "Server tidak dapat dihubungi");
        }
      })
    );
  };

  if (error) return <ErrorSection />;

  /* =========================
     RENDER
  ========================== */
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
    <div className="p-4 bg-white w-full">
      <div className="mb-4 flex flex-col gap-4">
        <nav className="flex-1 text-sm text-gray-500 mb-1" aria-label="Breadcrumb">
          <ol className="list-none p-0 inline-flex">
            <li className="flex items-center">
              <Link to="/template_dokumen_tambahan" className="hover:underline">Template Dokumen Tambahan</Link>
              <span className="mx-2">/</span>
            </li>
            <li className="flex items-center text-gray-700 font-medium">
              Form {mode=="edit"? "Edit":"Add"}
            </li>
          </ol>
        </nav>

        <h2 className="flex-1 text-lg font-semibold">Form {mode=="edit"? "Edit":"Add"}</h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-6 p-6 space-y-4 border rounded-lg">
          <TextInput
            type="number"
            label="Tahun"
            {...register("tahun", { required: "Tahun wajib diisi" })}
            error={errors.tahun?.message}
          />

          {loading.jenisfile ? (
            <Shimmer rows={1} />
          ) : (
            <SearchSelect
              label="Jenis File"
              options={jenisFileOptions}
              value={watch("jenis_file")}
              onChange={(v) =>
                setValue("jenis_file", v, { shouldValidate: true })
              }
            />
          )}

          <TextInput
            label="Pertanyaan"
            {...register("pertanyaan", { required: "Pertanyaan wajib diisi" })}
            error={errors.pertanyaan?.message}
          />
        </div>

        {/* TABLE */}
        {loading.template ? (
          <ShimmerTable />
        ) : (
          <div className="p-6 border rounded-lg w-full mt-2 overflow-x-auto">
            <div className="w-full overflow-x-auto">
              <table className="w-full table-auto min-w-[900px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2">Stakeholder</th>
                    <th className="px-3 py-2">Klasifikasi</th>
                    <th className="px-3 py-2">Tugas</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {STAKEHOLDER_TYPES.map((type) => {
                    const rowKey = buildRowKey(type);
                    const rowValue = watch(`rows.${rowKey}`) || {};
                    const enabled = isRowActive(rowValue);

                    const klasifikasiPath = `rows.${rowKey}.klasifikasi`;
                    const tugasPath = `rows.${rowKey}.tugas`;
                    const status = watch(`rows.${rowKey}.status`);
                    const errorMessage = watch(`rows.${rowKey}.errormessage`);

                    const errKlasifikasi = get(errors, klasifikasiPath)?.message;
                    const errTugas = get(errors, tugasPath)?.message;

                    return (
                      <tr key={rowKey} className="border-b text-center">
                        <td className="px-3 py-2 capitalize">{type}</td>

                        {/* KLASIFIKASI */}
                        <td className="px-3 py-2">
                          <div className="flex gap-4 justify-center">
                            {["minor", "major"].map((v) => (
                              <RadioButton
                                key={v}
                                value={v}
                                text={v.toUpperCase()}
                                {...register(klasifikasiPath, {
                                  validate: (val) =>
                                    !enabled || val
                                      ? true
                                      : "Klasifikasi wajib diisi",
                                })}
                                checked={watch(klasifikasiPath) === v}
                                onChange={() => {
                                  setValue(klasifikasiPath, v, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  })
                                  markRowActive(rowKey)
                                }}
                              />
                            ))}
                          </div>
                          {enabled && errKlasifikasi && (
                            <p className="text-red-500 text-sm mt-1">
                              {errKlasifikasi}
                            </p>
                          )}
                        </td>

                        {/* TUGAS */}
                        <td className="px-3 py-2">
                          <div className="flex gap-4 justify-center">
                            {["auditor1", "auditor2"].map((v) => (
                              <RadioButton
                                key={v}
                                value={v}
                                text={v.toUpperCase()}
                                {...register(tugasPath, {
                                  validate: (val) =>
                                    !enabled || val ? true : "Tugas wajib diisi",
                                })}
                                checked={watch(tugasPath) === v}
                                onChange={() => {
                                  setValue(tugasPath, v, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  })
                                  markRowActive(rowKey)
                                }}
                              />
                            ))}
                          </div>
                          {enabled && errTugas && (
                            <p className="text-red-500 text-sm mt-1">{errTugas}</p>
                          )}
                        </td>

                        {/* ACTION */}
                        <td className="px-3 py-2 flex gap-2">
                          <RowClearAction
                            status={status}
                            onClear={() =>
                              setValue(
                                `rows.${rowKey}`,
                                {
                                  klasifikasi: null,
                                  tugas: null,
                                  enable: false,
                                  status: null,
                                },
                                { shouldValidate: true, shouldDirty: true }
                              )
                            }
                          />
                          {
                            status && 
                            <RowStatusAction
                              status={status}
                              errorMessage={errorMessage}
                              onShowError={(message) => openModal({ title: "Pesan error", message: message })}
                            />
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="px-4 py-2 mt-4 bg-purple-500 text-white rounded"
        >
          Simpan
        </button>

        <ErrorModal modal={modal} onClose={closeModal} />

      </form>
    </div>
    </>
  );
};

export default TemplateDokumenTambahanFormPage;