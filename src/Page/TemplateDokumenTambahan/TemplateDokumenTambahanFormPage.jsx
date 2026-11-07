import React, { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import TextInput from "@/Components/TextInput";
import RadioButton from "@/Components/RadioButton";
import { ArrowLeft, FolderArchive } from "lucide-react";
import SearchSelect from "@/Components/SearchSelect";
import ErrorSection from "@/Components/ErrorSection";
import Shimmer from "@/Components/Shimmer";
import ShimmerTable from "@/Components/ShimmerTable";

import { useToast } from "@/Providers/ToastProvider";
import {
  delay,
  formatFetchError,
  isEmpty,
  isValidationError,
  normalizeValidationMessage,
  throwIfResponseNotOk,
  get,
} from "@/Common/Utils";
import RowClearAction from "@/Components/RowClearAction";
import RowStatusAction from "@/Components/RowStatusAction";
import { useErrorModal } from "@/Components/ErrorModal/useErrorModal";
import ErrorModal from "@/Components/ErrorModal/ErrorModal";
import { useContent } from "@/Providers/ContentProvider";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import Navbar from "@/Components/Navbar";
import { useAuth } from "@/Providers/AuthProvider";
import { apiClient } from "@/Common/api";

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
  const {getValidToken} = useAuth()
  const { tahun, uuidJenisFile } = useParams();
  const { addToast } = useToast();
  const mode = !isEmpty(tahun) && !isEmpty(uuidJenisFile) ? "edit" : "add";
  const { modal, openModal, closeModal } = useErrorModal();

  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } = useContent();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    trigger,
    clearErrors,
    formState: { errors, isSubmitting },
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
  const [errorJenisFile, setErrorJenisFile] = useState(null);

  const setLoad = (k, v) => setLoading((s) => ({ ...s, [k]: v }));

  const fetchJenisFileOptions = async (tahun) => {
    setLoad("jenisfile", true);
    setErrorJenisFile(null);
    try {
      const res = await apiClient.get(
        tahun ? `/jenisfiles?mode=all&filters=tahun:eq:${tahun}` : `/jenisfiles?mode=all`
      );
      const raw = res?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : [];
      setJenisFileOptions(
        list.map((d) => ({
          ...d,
          id: d.UUID,
          nama: d.Nama,
        }))
      );
    } catch (err) {
      setErrorJenisFile(err?.message || "Gagal memuat jenis file");
    } finally {
      setLoad("jenisfile", false);
    }
  };

  const fetchTemplateDokumenTambahanEdit = async (tahun, jenisFileUuid) => {
    setLoad("template", true);
    try {
      const data = await apiClient.get(
        `/templatedokumentambahans?mode=all&filters=tahun:eq:${tahun};jenisfileuuid:eq:${jenisFileUuid}`
      );
      const list = Array.isArray(data) ? data : (data?.data || []);

      list.forEach((row, i) => {
        if (i == 0) {
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
    await trigger();
  };

  useEffect(() => {
    if (tahun) setValue("tahun", tahun);
  }, [tahun]);

  useEffect(() => {
    fetchJenisFileOptions(watchedTahun);
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
    const token = getValidToken();
    if (!token) {
      addToast("error", "Sesi login tidak valid atau telah berakhir. Silakan login kembali.");
      return;
    }

    console.log("kirim");

    const valid = await trigger();
    if (!valid) {
      addToast("error", "Masih ada data yang belum lengkap");
      return;
    }

    const totalSendData = Object.values(data.rows).filter(
      (row) => row?.enable
    ).length;

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

    let successCount = 0;
    await Promise.all(
      payloads.map(async ({ key, fd }) => {
        try {
          setValue(`rows.${key}.status`, "loading");
          await delay(3000);

          try {
            await apiClient.post("/templatedokumentambahan", fd);

            setValue(`rows.${key}.status`, "success");
            addToast("success", "Data berhasil disimpan");
            successCount++;
            if (successCount >= totalSendData && mode == "add") {
              navigate(`/template_dokumen_tambahan`);
            }
          } catch (err) {
            console.log(err);
            setValue(`rows.${key}.status`, "error");
            if (isValidationError(err?.code)) {
              const validationMessage = normalizeValidationMessage(
                err?.message
              );
              setValue(`rows.${key}.errormessage`, validationMessage);
              addToast("error", validationMessage);
            } else {
              setValue(`rows.${key}.errormessage`, err?.message || "Gagal");
              addToast("error", err?.message || "Gagal");
            }
          }
        } catch (err) {
          console.log(err);
          setValue(`rows.${key}.status`, "error");
          setValue(`rows.${key}.errormessage`, err?.message || "Gagal");
          addToast("error", "Server tidak dapat dihubungi");
        }
      })
    );
  };

  if (error) return <ErrorSection />;

  const rowsValues = watch("rows") || {};
  const isRowLoading = Object.values(rowsValues).some(
    (row) => row?.status === "loading"
  );
  const isSaving = isSubmitting || isRowLoading;
  const isDataLoading = Boolean(loading.jenisfile || loading.template);
  const isButtonLoading = isSaving || isDataLoading;

  /* =========================
     RENDER
  ========================== */
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
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 pb-20">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-gray-150 p-5 md:p-6 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <Link
                to="/template_dokumen_tambahan"
                className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition cursor-pointer"
                title="Kembali ke Template Dokumen Tambahan"
              >
                <ArrowLeft className="w-5 h-5 stroke-[1.8]" />
              </Link>
              <div>
                <nav className="text-xs text-gray-500 mb-0.5" aria-label="Breadcrumb">
                  <ol className="list-none p-0 inline-flex items-center gap-1.5">
                    <li>
                      <Link to="/template_dokumen_tambahan" className="hover:text-purple-700 transition">
                        Template Dokumen Tambahan
                      </Link>
                    </li>
                    <li className="text-gray-400">/</li>
                    <li className="text-gray-700 font-medium">
                      {mode === "edit" ? "Edit Template" : "Tambah Template Baru"}
                    </li>
                  </ol>
                </nav>
                <h1 className="text-lg font-bold text-gray-900">
                  {mode === "edit" ? "Edit Template Dokumen Tambahan" : "Tambah Template Dokumen Tambahan"}
                </h1>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
              <FolderArchive className="w-5 h-5 stroke-[1.8]" />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-5">
            <TextInput
              type="number"
              label="Tahun"
              {...register("tahun", { required: "Tahun wajib diisi" })}
              error={errors.tahun?.message}
            />

            <SearchSelect
              label="Jenis File"
              options={jenisFileOptions}
              value={watch("jenis_file")}
              loading={loading.jenisfile}
              loadError={errorJenisFile}
              onRetry={() =>
                watchedTahun && fetchJenisFileOptions(watchedTahun)
              }
              onChange={(v) =>
                setValue("jenis_file", v, { shouldValidate: true })
              }
            />

            <TextInput
              label="Pertanyaan"
              {...register("pertanyaan", {
                required: "Pertanyaan wajib diisi",
              })}
              error={errors.pertanyaan?.message}
            />
          </div>

          {/* TABLE */}
          {loading.template ? (
            <ShimmerTable />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full table-auto min-w-[900px]">
                  <thead className="bg-purple-50/60 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-left">Stakeholder</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Klasifikasi</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Tugas</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-[90px]">Aksi</th>
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

                      const errKlasifikasi = get(
                        errors,
                        klasifikasiPath
                      )?.message;
                      const errTugas = get(errors, tugasPath)?.message;

                      const valKlasifikasi = watch(klasifikasiPath);
                      const valTugas = watch(tugasPath);
                      const isRowEmpty = !valKlasifikasi && !valTugas;

                      return (
                        <tr key={rowKey} className="border-b text-center">
                          <td className="px-3 py-2 capitalize">{type}</td>

                          {/* KLASIFIKASI */}
                          <td className="px-3 py-2">
                            <div className="flex gap-4 justify-center">
                              {["minor", "major", "observe"].map((v) => (
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
                                    });
                                    markRowActive(rowKey);
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
                                      !enabled || val
                                        ? true
                                        : "Tugas wajib diisi",
                                  })}
                                  checked={watch(tugasPath) === v}
                                  onChange={() => {
                                    setValue(tugasPath, v, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    });
                                    markRowActive(rowKey);
                                  }}
                                />
                              ))}
                            </div>
                            {enabled && errTugas && (
                              <p className="text-red-500 text-sm mt-1">
                                {errTugas}
                              </p>
                            )}
                          </td>

                          {/* ACTION */}
                          <td className="px-3 py-2.5 text-center align-middle">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <RowClearAction
                                status={status}
                                disabled={isRowEmpty}
                                onClear={() => {
                                  setValue(
                                    `rows.${rowKey}`,
                                    {
                                      klasifikasi: null,
                                      tugas: null,
                                      enable: false,
                                      status: null,
                                    },
                                    { shouldValidate: true, shouldDirty: true }
                                  );
                                  clearErrors([klasifikasiPath, tugasPath]);
                                }}
                              />
                              {status && (
                                <RowStatusAction
                                  status={status}
                                  errorMessage={errorMessage}
                                  onShowError={(message) =>
                                    openModal({
                                      title: "Pesan error",
                                      message: message,
                                    })
                                  }
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              to="/template_dokumen_tambahan"
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isButtonLoading}
              className={`
                inline-flex items-center justify-center gap-2
                px-5 py-2 text-xs font-semibold rounded-xl text-white
                transition shadow-xs cursor-pointer
                ${
                  isButtonLoading
                    ? "bg-purple-400 cursor-not-allowed opacity-90"
                    : "bg-purple-700 hover:bg-purple-800"
                }
              `}
            >
              {isButtonLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span>{isSaving ? "Menyimpan..." : isDataLoading ? "Memuat..." : "Simpan Template"}</span>
            </button>
          </div>

          <ErrorModal modal={modal} onClose={closeModal} />
        </form>
      </div>
    </div>
    </>
  );
};

export default TemplateDokumenTambahanFormPage;
