import React, { useEffect, useState } from "react";
import { useToast } from "@/Providers/ToastProvider";
import { useForm } from "react-hook-form";
import SearchSelect from "@/Components/SearchSelect";
import {
  delay,
  formatFetchError,
  isEmpty,
  isOverlap,
  throwIfResponseNotOk,
} from "@/Common/Utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import ErrorSection from "@/Components/ErrorSection";
import Shimmer from "@/Components/Shimmer";
import { useErrorModal } from "@/Components/ErrorModal/useErrorModal";
import ErrorModal from "@/Components/ErrorModal/ErrorModal";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import TextInput from "@/Components/TextInput";
import DateRangeInput from "@/Components/DateRangeInput";
import { useAuth } from "@/Providers/AuthProvider";
import { apiClient, API_BASE_URL } from "@/Common/api";
import { CalendarCheck, ArrowLeft } from "lucide-react";

const ScheduleAuditFormPage = () => {
  const {getValidToken} = useAuth()
  const navigate = useNavigate();
  const { uuidSchedule } = useParams();
  const { addToast } = useToast();
  const mode = !isEmpty(uuidSchedule) ? "edit" : "add";
  const { modal, closeModal } = useErrorModal();
  const [fakultasUnits, setFakultasUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState({
    detail: false,
    user: false,
    target: false,
  });
  const [error, setError] = useState({
    detail: null,
    user: null,
    target: null,
  });

  function setLoad(key, value) {
    setLoading((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function setErr(key, value) {
    setError((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const toDateInput = (val) => {
    if (!val) return "";
    return val.split("T")[0];
  };

  const { level, listLevel, setLevel, openChangeLevel, setOpenChangeLevel } = useContent();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      uuid: uuidSchedule,
      tahun: "",
      target_audit: "",
      periode_upload_mulai: "",
      periode_assesment_dokumen_mulai: "",
      periode_assesment_lapangan_mulai: "",
      periode_upload_akhir: "",
      periode_assesment_dokumen_akhir: "",
      periode_assesment_lapangan_akhir: "",
      auditee: "",
      auditor1: "",
      auditor2: "",
      kode_akses: "",
    },
  });

  const resetFormFromApi = (data) => {
    const targetSelected = fakultasUnits.find(item => item.UUID == data.FakultasUnitUuid);
    const auditeeSelected = users.find(item => item.UUID == data.AuditeeUuid);
    const auditor1Selected = users.find(item => item.UUID == data.Auditor1Uuid);
    const auditor2Selected = users.find(item => item.UUID == data.Auditor2Uuid);

    reset({
      uuid: data.UUID,
      tahun: data.Tahun,
      target_audit: targetSelected,
      periode_upload_mulai: toDateInput(data.PeriodeUploadMulai),
      periode_upload_akhir: toDateInput(data.PeriodeUploadAkhir),
      periode_assesment_dokumen_mulai: toDateInput(data.PeriodeAssesmentDokumenMulai),
      periode_assesment_dokumen_akhir: toDateInput(data.PeriodeAssesmentDokumenAkhir),
      periode_assesment_lapangan_mulai: toDateInput(data.PeriodeAssesmentLapanganMulai),
      periode_assesment_lapangan_akhir: toDateInput(data.PeriodeAssesmentLapanganAkhir),
      auditee: auditeeSelected,
      auditor1: auditor1Selected,
      auditor2: auditor2Selected,
    });
  };

  const resetForm = () => {
    reset({
      uuid: null,
      tahun: null,
      target_audit: null,
      periode_upload_mulai: null,
      periode_upload_akhir: null,
      periode_assesment_dokumen_mulai: null,
      periode_assesment_dokumen_akhir: null,
      periode_assesment_lapangan_mulai: null,
      periode_assesment_lapangan_akhir: null,
      auditee: null,
      auditor1: null,
      auditor2: null,
    });
  };

  const fetchData = async (uuid) => {
    const token = getValidToken();
    if (!token) {
      setErr("detail", "Sesi login tidak valid atau telah berakhir");
      return;
    }

    setLoad("detail", true);
    setErr("detail", null);

    try {
      const result = await apiClient.get(`/renstra/${uuid}`);
      setData(result?.data ?? result);
    } catch (err) {
      console.error(err);
      setErr("detail", err?.message || "Gagal memuat data");
    } finally {
      setLoad("detail", false);
    }
  };

  const fetchTargets = async () => {
    const token = getValidToken();
    if (!token) return;

    setLoad("target", true);
    setErr("target", null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/fakultasunits?mode=sse`,
        {
          headers: { 
            Accept: "text/event-stream", 
            Authorization: `Bearer ${token}` 
          },
        }
      );
      await throwIfResponseNotOk(res, "Gagal memuat target audit");
        if (!res.body) throw new Error("[BE Golang] SSE stream tidak didukung oleh response server");
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
              if (
                isEmpty(parsed.UUID) ||
                parsed.UUID == "00000000-0000-0000-0000-000000000000"
              ) {
                continue;
              }

              let label = "";
              if (parsed.Type == "prodi") {
                label = `${parsed.Nama} - ${parsed.Jenjang} (prodi)`;
              } else if (parsed.Type == "fakultas") {
                label = `${parsed.Nama} (fakultas)`;
              } else {
                label = `${parsed.Nama} (unit)`;
              }

              result.push({
                id: parsed.UUID,
                nama: label,
                ...parsed,
              });
            } catch {}
          }
        }
        setFakultasUnits(result);
      } catch (err) {
        console.error(err);
        setErr("target", formatFetchError(err, "Gagal memuat target audit"));
      } finally {
        setLoad("target", false);
      }
  };

  const fetchUser = async () => {
    const token = getValidToken();
    if (!token) return;

    setLoad("user", true);
    setErr("user", null);

    try {
      const res = await fetch(`${API_BASE_URL}/users?mode=sse`, {
        headers: { 
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}` 
        },
      });
      await throwIfResponseNotOk(res, "Gagal memuat daftar akun");
      if (!res.body) throw new Error("[BE Golang] SSE stream tidak didukung oleh response server");
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

            result.push({
              id: parsed.UUID,
              nama: parsed.Name,
              ...parsed,
            });
          } catch {}
        }
      }
      setUsers(result);
    } catch (err) {
      console.error(err);
      setErr("user", formatFetchError(err, "Gagal memuat daftar akun"));
    } finally {
      setLoad("user", false);
    }
  };

  useEffect(() => {
    fetchTargets();
    fetchUser();
  }, []);

  useEffect(() => {
    if (uuidSchedule) {
      fetchData(uuidSchedule);
    }
  }, [uuidSchedule]);

  useEffect(()=>{
    if(!users) return;
    if(!fakultasUnits) return;
    if(!data) return;

    resetFormFromApi(data);
  },[data, users, fakultasUnits])

  const onSubmit = async (data) => {
    console.log("kirim");
    const valid = await trigger(); // validate semua field
    if (!valid) {
      addToast("error", "Masih ada data yang belum lengkap");
      return;
    }

    const token = getValidToken();
    if (!token) {
      addToast("error", "Sesi login Anda tidak valid atau telah berakhir. Silakan login kembali.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("tahun", data.tahun);
      fd.append("fakultas_unit", data.target_audit?.UUID);
      fd.append("periode_upload_mulai", data.periode_upload_mulai);
      fd.append("periode_upload_akhir", data.periode_upload_akhir);
      fd.append("periode_assesment_dokumen_mulai", data.periode_assesment_dokumen_mulai);
      fd.append("periode_assesment_dokumen_akhir", data.periode_assesment_dokumen_akhir);
      fd.append("periode_assesment_lapangan_mulai", data.periode_assesment_lapangan_mulai);
      fd.append("periode_assesment_lapangan_akhir", data.periode_assesment_lapangan_akhir);
      fd.append("auditee", data.auditee?.UUID);
      fd.append("auditor1", data.auditor1?.UUID);
      fd.append("auditor2", data.auditor2?.UUID);

      if (mode === "edit") {
        await apiClient.put(`/renstra/${uuidSchedule}`, fd);
      } else {
        await apiClient.post("/renstra", fd);
      }

      addToast("success", "Berhasil disimpan");
      if(mode !== "edit"){
        resetForm();
        navigate("/schedule_audit");
      }
    } catch (e){
      addToast("error", e?.message || "Server tidak dapat dihubungi");
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

      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen w-full">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <Link
                to="/schedule_audit"
                className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition cursor-pointer"
                title="Kembali ke Jadwal Audit"
              >
                <ArrowLeft className="w-5 h-5 stroke-[1.8]" />
              </Link>
              <div>
                <nav className="text-xs text-gray-500 mb-0.5" aria-label="Breadcrumb">
                  <ol className="list-none p-0 inline-flex items-center gap-1.5">
                    <li>
                      <Link to="/schedule_audit" className="hover:text-purple-700 transition">
                        Jadwal Audit
                      </Link>
                    </li>
                    <li className="text-gray-400">/</li>
                    <li className="text-gray-700 font-medium">
                      {mode === "edit" ? "Edit Jadwal" : "Tambah Jadwal Baru"}
                    </li>
                  </ol>
                </nav>
                <h1 className="text-lg font-bold text-gray-900">
                  {mode === "edit" ? "Edit Jadwal Audit Mutu" : "Tambah Jadwal Audit Mutu"}
                </h1>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5 stroke-[1.8]" />
            </div>
          </div>

          {mode == "edit" && error.detail ? (
            <ErrorSection />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-5">
              <TextInput
                type="number"
                label="Tahun Audit"
                required
                min="0"
                error={errors.tahun?.message}
                {...register("tahun", { required: "Tahun wajib diisi" })}
              />

              <SearchSelect
                label="Target Audit"
                required
                options={fakultasUnits}
                placeholder="Cari target audit"
                value={fakultasUnits.find(
                  (o) => o?.UUID === watch("target_audit")?.UUID
                )}
                error={errors.target_audit?.message}
                loading={loading.target}
                loadError={error.target}
                onRetry={fetchTargets}
                onChange={(item) =>
                  setValue("target_audit", item || "", {
                    shouldValidate: true,
                  })
                }
              />

              <input
                type="hidden"
                {...register("target_audit", {
                  required: "Target Audit wajib dipilih",
                })}
              />

              <DateRangeInput
                label="Periode Upload"
                required
                start={register("periode_upload_mulai", {
                  required: "Periode Upload Mulai wajib diisi",
                  validate: () => {
                    const v = getValues();
                    if (
                      isOverlap(
                        v.periode_upload_mulai,
                        v.periode_upload_akhir,
                        v.periode_assesment_dokumen_mulai,
                        v.periode_assesment_dokumen_akhir
                      ) ||
                      isOverlap(
                        v.periode_upload_mulai,
                        v.periode_upload_akhir,
                        v.periode_assesment_lapangan_mulai,
                        v.periode_assesment_lapangan_akhir
                      )
                    ) {
                      return "Periode Upload tidak boleh overlap dengan periode lain";
                    }
                    return true;
                  },
                })}
                end={register("periode_upload_akhir", {
                  required: "Periode Upload Selesai wajib diisi",
                })}
                startError={errors.periode_upload_mulai?.message}
                endError={errors.periode_upload_akhir?.message}
              />

              <DateRangeInput
                label="Periode Assesment Dokumen"
                required
                start={register("periode_assesment_dokumen_mulai", {
                  required: "Periode Assesment Dokumen Mulai wajib diisi",
                  validate: () => {
                    const v = getValues();
                    if (
                      isOverlap(
                        v.periode_assesment_dokumen_mulai,
                        v.periode_assesment_dokumen_akhir,
                        v.periode_upload_mulai,
                        v.periode_upload_akhir
                      ) ||
                      isOverlap(
                        v.periode_assesment_dokumen_mulai,
                        v.periode_assesment_dokumen_akhir,
                        v.periode_assesment_lapangan_mulai,
                        v.periode_assesment_lapangan_akhir
                      )
                    ) {
                      return "Periode Assesment Dokumen tidak boleh overlap dengan periode lain";
                    }
                    return true;
                  },
                })}
                end={register("periode_assesment_dokumen_akhir", {
                  required: "Periode Assesment Dokumen Selesai wajib diisi",
                })}
                startError={errors.periode_assesment_dokumen_mulai?.message}
                endError={errors.periode_assesment_dokumen_akhir?.message}
              />

              <DateRangeInput
                label="Periode Assesment Lapangan"
                required
                start={register("periode_assesment_lapangan_mulai", {
                  required: "Periode Assesment Lapangan Mulai wajib diisi",
                  validate: () => {
                    const v = getValues();
                    if (
                      isOverlap(
                        v.periode_assesment_lapangan_mulai,
                        v.periode_assesment_lapangan_akhir,
                        v.periode_upload_mulai,
                        v.periode_upload_akhir
                      ) ||
                      isOverlap(
                        v.periode_assesment_lapangan_mulai,
                        v.periode_assesment_lapangan_akhir,
                        v.periode_assesment_dokumen_mulai,
                        v.periode_assesment_dokumen_akhir
                      )
                    ) {
                      return "Periode Assesment Lapangan tidak boleh overlap dengan periode lain";
                    }
                    return true;
                  },
                })}
                end={register("periode_assesment_lapangan_akhir", {
                  required: "Periode Assesment Lapangan Selesai wajib diisi",
                })}
                startError={errors.periode_assesment_lapangan_mulai?.message}
                endError={errors.periode_assesment_lapangan_akhir?.message}
              />

              <SearchSelect
                label="Penugasan Auditee"
                required
                options={users}
                placeholder="Cari nama akun"
                value={users.find((u) => u?.UUID === watch("auditee")?.UUID)}
                error={errors.auditee?.message}
                loading={loading.user}
                loadError={error.user}
                onRetry={fetchUser}
                onChange={(item) =>
                  setValue("auditee", item || "", { shouldValidate: true })
                }
              />

              <input
                type="hidden"
                {...register("auditee", {
                  required: "Auditee wajib dipilih",
                  validate: (value) => {
                    const { auditor1, auditor2 } = getValues();
                    if (
                      value.UUID === auditor1?.UUID ||
                      value.UUID === auditor2?.UUID
                    ) {
                      return "Auditee tidak boleh sama dengan Auditor";
                    }
                    return true;
                  },
                })}
              />

              <SearchSelect
                label="Penugasan Auditor 1"
                required
                options={users}
                placeholder="Cari nama akun"
                value={users.find((u) => u?.UUID === watch("auditor1")?.UUID)}
                error={errors.auditor1?.message}
                loading={loading.user}
                loadError={error.user}
                onRetry={fetchUser}
                onChange={(item) =>
                  setValue("auditor1", item || "", { shouldValidate: true })
                }
              />

              <input
                type="hidden"
                {...register("auditor1", {
                  required: "Auditor 1 wajib dipilih",
                  validate: (value) => {
                    const { auditee, auditor2 } = getValues();
                    if (value.UUID === auditee?.UUID)
                      return "Auditor 1 tidak boleh sama dengan Auditee";
                    if (value.UUID === auditor2?.UUID)
                      return "Auditor 1 tidak boleh sama dengan Auditor 2";
                    return true;
                  },
                })}
              />

              <SearchSelect
                label="Penugasan Auditor 2"
                required
                options={users}
                placeholder="Cari nama akun"
                value={users.find((u) => u?.UUID === watch("auditor2")?.UUID)}
                error={errors.auditor2?.message}
                loading={loading.user}
                loadError={error.user}
                onRetry={fetchUser}
                onChange={(item) =>
                  setValue("auditor2", item || "", { shouldValidate: true })
                }
              />

              <input
                type="hidden"
                {...register("auditor2", {
                  required: "Auditor 2 wajib dipilih",
                  validate: (value) => {
                    const { auditee, auditor1 } = getValues();
                    if (value.UUID === auditee?.UUID)
                      return "Auditor 2 tidak boleh sama dengan Auditee";
                    if (value.UUID === auditor1?.UUID)
                      return "Auditor 2 tidak boleh sama dengan Auditor 1";
                    return true;
                  },
                })}
              />

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <Link
                  to="/schedule_audit"
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer"
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-2xs transition cursor-pointer"
                >
                  {mode === "edit" ? "Perbarui Jadwal" : "Simpan Jadwal"}
                </button>
              </div>
            </div>
          </form>
        )}
        </div>
      </div>

      <ErrorModal modal={modal} onClose={closeModal} />
    </>
  );
};

export default ScheduleAuditFormPage;
