import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/Providers/ToastProvider";
import { useForm, useWatch } from "react-hook-form";
import SearchSelect from "@/Components/SearchSelect";
import TextInput from "@/Components/TextInput";
import RadioButton from "@/Components/RadioButton";
import { PencilIcon } from "lucide-react";
import { delay, isEmpty, isValidationError, normalizeValidationMessage } from "@/Common/Utils";
import get from "lodash.get";
import { Link, useNavigate, useParams } from "react-router-dom";
import ErrorSection from "@/Components/ErrorSection";
import Shimmer from "@/Components/Shimmer";
import ShimmerTable from "@/Components/ShimmerTable";
import RowStatusAction from "@/Components/RowStatusAction";
import RowClearAction from "@/Components/RowClearAction";
import { useErrorModal } from "@/Components/ErrorModal/useErrorModal";
import ErrorModal from "@/Components/ErrorModal/ErrorModal";
import AutoFillModalFill from "@/Components/ModalAutoFill/AutoFillModal";
import { useAutoFillModalFill } from "@/Components/ModalAutoFill/useAutoFillModal";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";

const TemplateRenstraFormPage = () => {
  const navigate = useNavigate();
  const { tahun, uuidIndikator } = useParams();
  const { addToast } = useToast();
  const mode = !isEmpty(tahun) && !isEmpty(uuidIndikator)? "edit":"add";
  const { modal, openModal, closeModal } = useErrorModal();
  const { modalFill, openModalFill, closeModalFill, activeGroupFill } = useAutoFillModalFill();

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
      indikator_renstra: null,
      rows: {},
    },
  });

  const watchedTahun = useWatch({
    control,
    name: "tahun",
  });

  const [indikatorOptions, setIndikatorOptions] = useState([]);
  const [groupDatas, setGroupDatas] = useState([]);
  const [fakultasUnits, setFakultasUnits] = useState([]);
  const prevIndikatorRef = useRef(null);
  const [loading, setLoading] = useState({
    indikator: false,
    fakultas: false,
    template: false,
  });

  const [error, setError] = useState({
    indikator: null,
    fakultas: null,
    template: null,
  });

  const setLoad = (key, val) => setLoading((s) => ({ ...s, [key]: val }));

  const setErr = (key, val) => setError((s) => ({ ...s, [key]: val }));

  const buildRowLabel = (gd, target) => `${gd.Type.toUpperCase()} - ${gd.Jenjang.toUpperCase()} - ${target.Nama.toUpperCase()}`;

  const markRowActive = async (rowKey) => {
    const row = watch(`rows.${rowKey}`) || {};
    const isActive = Object.values(row).some((v) => v); // aktif jika ada isi
    setValue(`rows.${rowKey}.enable`, isActive, { shouldValidate: true });

    // Trigger validasi semua field row supaya errors muncul lengkap
    await trigger([
        `rows.${rowKey}.klasifikasi`,
        `rows.${rowKey}.satuan`,
        `rows.${rowKey}.pembagian_tugas`,
        ...(watch("indikator_renstra")?.TipeTarget === "range"
            ? [`rows.${rowKey}.target_min`, `rows.${rowKey}.target_max`]
            : [`rows.${rowKey}.target`]),
    ]);
  };

  const applyToGroup = (field, value) => {
    if (!activeGroupFill) return;
    activeGroupFill.Targets.forEach((t) => {
      const rowKey = buildRowLabel(activeGroupFill, t);
      setValue(`rows.${rowKey}.${field}`, value, {
        shouldDirty: true,
        shouldValidate: true,
      });
      markRowActive(rowKey);
    });
  };

  const fetchIndikatorRenstraOptions = async (tahun) => {
    setLoad("indikator", true);
    setErr("indikator", null);

    setTimeout(async ()=>{
        try {
            const res = await fetch(
                `http://localhost:3000/indikatorrenstras?mode=sse&filters=tahun:eq:${tahun}`,
                { headers: { Accept: "text/event-stream" } }
            );
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
                    result.push({
                    id: parsed.Id,
                    uuid: parsed.Uuid,
                    parent: parsed.Parent,
                    nama: `${parsed.Indikator} (${parsed.Tahun})`,
                    ...parsed,
                    });
                } catch (e) {
                    console.error(e);
                }
                }
            }
            setIndikatorOptions(result);
            } catch (err) {
            console.error(err);
            setErr("indikator", err.message || "Gagal memuat indikator");
            } finally {
                setLoad("indikator", false);
            }
    },3000);
  };

  const fetchFakultasUnit = async () => {
    setLoad("fakultas", true);
    setErr("fakultas", null);

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
            setFakultasUnits(result);
            setGroupDatas(groupDataAdapter(result));
            } catch (err) {
            console.error(err);
            setErr("fakultas", e.message || "Gagal memuat fakultas");
            } finally {
                setLoad("fakultas", false);
            }
    },3000);
  };

  const fetchTemplateRenstraEdit = async (indikatorUuid) => {
    setLoad("template", true);
    setErr("template", null);

    setTimeout(async ()=>{
        try {
            const res = await fetch(
                `http://localhost:3000/templaterenstras?mode=all&filters=indikatorrenstrauuid:eq:${indikatorUuid}`
            );
            const data = await res.json();

            data.forEach((item) => {
                // cari group yang sesuai
                const gd = groupDatas.find(
                    (g) =>
                    g.Type === item.Kategori.split("#")[0] &&
                    g.Jenjang === item.Kategori.split("#")[1]
                );
                if (!gd) return;

                // cari target row
                const target = gd.Targets.find((t) => t.Nama === item.FakultasUnit);
                if (!target) return;

                const rowKey = buildRowLabel(gd, target);

                // set value row
                setValue(`rows.${rowKey}`, {
                    enable: true,
                    klasifikasi: item.Klasifikasi,
                    satuan: item.Satuan,
                    pembagian_tugas: item.Tugas,
                    target: item.Target,
                    target_min: item.TargetMin,
                    target_max: item.TargetMax,
                }, { shouldDirty: false, shouldValidate: false });

                // trigger validasi per row
                trigger([ //ini sidah masuk namun tidak muncul di ui
                    `rows.${rowKey}.klasifikasi`,
                    `rows.${rowKey}.satuan`,
                    `rows.${rowKey}.pembagian_tugas`,
                    ...(watch("indikator_renstra")?.TipeTarget === "range"
                    ? [`rows.${rowKey}.target_min`, `rows.${rowKey}.target_max`]
                    : [`rows.${rowKey}.target`]),
                ]);
            });
        } catch (err) {
            console.error(err);
            setErr("template", err.message || "Gagal memuat template");
        } finally {
            setLoad("template", false);
        }
    },300);
  };

  useEffect(() => {
    fetchFakultasUnit();
  }, []);

  useEffect(() => {
    const indikator = watch("indikator_renstra");
    if (!indikator) return;

    if (
        prevIndikatorRef.current &&
        prevIndikatorRef.current.Uuid !== indikator.Uuid
    ) {
        setValue("rows", {}, { shouldValidate: false });
    }

    prevIndikatorRef.current = indikator;
  }, [watch("indikator_renstra")]);

  useEffect(() => {
    if (!uuidIndikator) return;
    if (!groupDatas.length) return;

    fetchTemplateRenstraEdit(uuidIndikator);
    }, [uuidIndikator, groupDatas]);

  useEffect(() => {
    if (!watchedTahun) return;
    fetchIndikatorRenstraOptions(watchedTahun);
  }, [watchedTahun]);

  useEffect(() => {
    if (!tahun) return;
    setValue("tahun", tahun, { shouldDirty: false });
  }, [tahun]);

  useEffect(() => {
    if (!uuidIndikator) return;
    if (!indikatorOptions.length) return;

    const selected = indikatorOptions.find(
        (i) => i.Uuid === uuidIndikator
    );

    if (selected) {
        setValue("indikator_renstra", selected, {
        shouldDirty: false,
        shouldValidate: true,
        });
    }
  }, [uuidIndikator, indikatorOptions]);
  

  const onSubmit = async (data) => {
    console.log("kirim")
    const valid = await trigger(); // validate semua field
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
      const [type, jenjang, nama] = key.split("-").map(v => v.trim().toLowerCase());
      const targetAudit = fakultasUnits.find((item) => item.Type.toLowerCase()===type && item.Jenjang.toLowerCase()===jenjang && item.Nama.toLowerCase()===nama)
      const kategori = !isEmpty(targetAudit?.Type.toLowerCase())? `${targetAudit?.Type.toLowerCase()}#${targetAudit?.Type.toLowerCase()==="fakultas"? "all":targetAudit?.Jenjang.toLowerCase()}`:"";
      const fakultasUnit = targetAudit?.UUID ?? "";

      const fd = new FormData();
      fd.append("tahun", data.tahun);
      fd.append("indikator", data.indikator_renstra.Uuid);
      fd.append("isPertanyaan", 1);
      fd.append("fakultasUnit", fakultasUnit);
      fd.append("kategori", kategori);
      fd.append("klasifikasi", row.klasifikasi);
      fd.append("satuan", row.satuan);
      fd.append("target", row?.target ?? "");
      fd.append("targetMin", row?.target_min ?? "");
      fd.append("targetMax", row?.target_max ?? "");
      fd.append("tugas", row.pembagian_tugas);

      return { key, fd };
    });
    console.log("SUBMIT:", data, payloads);

    let successCount = 0;
    await Promise.all(
      payloads.map(async ({ key, fd }) => {
        try {
          setValue(`rows.${key}.status`, "loading");

          await delay(3000);

          const res = await fetch("http://localhost:3000/templaterenstra", {
            method: "POST",
            body: fd,
          });

          const json = await res.json();

          if (!res.ok) {
            setValue(`rows.${key}.status`, "error");

            if (isValidationError(json.code)) {
              const msg = normalizeValidationMessage(json.message);
              setValue(`rows.${key}.errormessage`, msg);
              addToast("error", msg);
            } else {
              setValue(`rows.${key}.errormessage`, json.message || "Gagal");
              addToast("error", json.message || "Gagal");
            }

            return;
          }

          setValue(`rows.${key}.status`, "success");
          addToast("success", "Data berhasil disimpan");
          successCount++;
          if(successCount>=totalSendData && mode=="add"){
            navigate(`/template_renstra`)
          }
        } catch (err) {
          console.log(err)
          setValue(`rows.${key}.status`, "error");
          setValue(`rows.${key}.errormessage`, err?.message || "Gagal");
          addToast("error", "Server tidak dapat dihubungi");
        }
      })
    );
  };

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
                <Link to="/template_renstra" className="hover:underline">Template Renstra</Link>
                <span className="mx-2">/</span>
              </li>
              <li className="flex items-center text-gray-700 font-medium">
                Form {mode=="edit"? "Edit":"Add"}
              </li>
            </ol>
          </nav>

          <h2 className="flex-1 text-lg font-semibold">Form {mode=="edit"? "Edit":"Add"}</h2>
        </div>
        {
          error.fakultas || error.indikator || error.template? 
          <ErrorSection/> : 
          <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-6 p-6 space-y-4 border rounded-lg w-full">
              <TextInput
                  type="number"
                  label="Tahun Renstra"
                  required
                  error={errors.tahun?.message}
                  {...register("tahun", { required: "Tahun wajib diisi" })}
              />

              {loading.indikator ? (
                      <>
                          <label className="block text-sm font-medium mb-1">Nama Indikator Renstra <span className="text-red-500">*</span></label>
                          <Shimmer rows={1} />
                      </>
                  ) : (
                      <SearchSelect
                          label="Nama Indikator Renstra"
                          required
                          options={indikatorOptions}
                          placeholder={
                          !isEmpty(watch("tahun"))
                              ? "Cari indikator renstra"
                              : "Pilih dulu tahun renstra"
                          }
                          value={watch("indikator_renstra")}
                          error={errors.indikator_renstra?.message}
                          onChange={(item) => setValue("indikator_renstra", item, { shouldValidate: true })}
                      />
              )}
              </div>

              {loading.fakultas || loading.template ? (
                <ShimmerTable />
              ) : (
                groupDatas.map((gd) => (
                  <GroupDataTable
                    key={gd.Type + gd.Jenjang}
                    gd={gd}
                    watch={watch}
                    register={register}
                    setValue={setValue}
                    markRowActive={markRowActive}
                    errors={errors}
                    openModalFill={openModalFill}
                    addToast={addToast}
                    openModal={openModal}
                  />
                ))
              )}

              <SubmitButtonWithLoading
                groupDatas={groupDatas}
                watch={watch}
                loading={loading}
              />
          </form>
        }
      </div>

      <AutoFillModalFill
        modalFill={modalFill}
        closeModalFill={closeModalFill}
        watch={watch}
        applyToGroup={applyToGroup}
      />

      <ErrorModal modal={modal} onClose={closeModal} />
    </>
  );
};

export default TemplateRenstraFormPage;

export const groupDataAdapter = (rows = []) => {
  const map = {};
  for (const r of rows) {
    const key = `${r.Type}-${r.Jenjang}`;
    if (!map[key]) {
      map[key] = { Type: r.Type, Jenjang: r.Jenjang, Targets: [] };
    }
    map[key].Targets.push({ ID: r.ID, UUID: r.UUID, Nama: r.Nama });
  }
  return Object.values(map);
};

export const GroupDataTable = ({
  gd,
  watch,
  register,
  setValue,
  markRowActive,
  errors,
  openModalFill,
  addToast,
  openModal,
}) => {
  const buildRowLabel = (gd, target) => `${gd.Type.toUpperCase()} - ${gd.Jenjang.toUpperCase()} - ${target.Nama.toUpperCase()}`;

  return (
    <div key={gd.Type + gd.Jenjang} className="p-6 border rounded-lg w-full mt-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-medium">
          {gd.Jenjang ? `${gd.Type.toUpperCase()} - ${gd.Jenjang.toUpperCase()}` : gd.Type.toUpperCase()}
        </h2>
        <button
          type="button"
          onClick={() => {
            if (watch("indikator_renstra")) openModalFill(gd);
            else addToast("error", "Pilih dulu indikator");
          }}
          className="w-[30px] h-[30px] bg-purple-500 hover:bg-purple-400 rounded text-white flex items-center justify-center"
        >
          <PencilIcon size={16} />
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 w-[140px]">Stakeholder</th>
              <th className="px-3 py-2 w-[220px]">Klasifikasi Temuan</th>
              <th className="px-3 py-2 w-[140px]">Satuan</th>
              <th className="px-3 py-2 w-[180px]">Target</th>
              <th className="px-3 py-2 w-[220px]">Pembagian Tugas</th>
              <th className="px-3 py-2 w-[80px]">Action</th>
            </tr>
          </thead>
          <tbody>
            {watch("indikator_renstra") &&
              gd.Targets.map((target) => {
                const rowKey = buildRowLabel(gd, target);
                const rowValues = watch(`rows.${rowKey}`) || {};
                const isRowActive = rowValues.enable;

                const fieldKlasifikasi = `rows.${rowKey}.klasifikasi`;
                const fieldPembagianTugas = `rows.${rowKey}.pembagian_tugas`;
                const fieldSatuan = `rows.${rowKey}.satuan`;
                const status = watch(`rows.${rowKey}.status`);
                const errorMessage = watch(`rows.${rowKey}.errormessage`);

                const errorKlasifikasiMessage = get(errors, fieldKlasifikasi)?.message;
                const errorPembagianTugasMessage = get(errors, fieldPembagianTugas)?.message;
                const errorSatuanMessage = get(errors, fieldSatuan)?.message;

                let targetInput;
                const tipeTarget = watch("indikator_renstra")?.TipeTarget;
                if (tipeTarget === "range") {
                  const fieldTargetMin = `rows.${rowKey}.target_min`;
                  const fieldTargetMax = `rows.${rowKey}.target_max`;
                  targetInput = (
                    <div className="flex flex-wrap justify-center gap-2">
                      <TextInput
                        label={null}
                        type="number"
                        step="0.001"
                        placeholder="Min"
                        {...register(fieldTargetMin)}
                        value={watch(fieldTargetMin) || ""}
                        onChange={(e) => {
                          setValue(fieldTargetMin, e.target.value, { shouldValidate: true });
                          markRowActive(rowKey);
                        }}
                        error={get(errors, fieldTargetMin)?.message}
                      />
                      hingga
                      <TextInput
                        label={null}
                        type="number"
                        step="0.001"
                        placeholder="Max"
                        {...register(fieldTargetMax)}
                        value={watch(fieldTargetMax) || ""}
                        onChange={(e) => {
                          setValue(fieldTargetMax, e.target.value, { shouldValidate: true });
                          markRowActive(rowKey);
                        }}
                        error={get(errors, fieldTargetMax)?.message}
                      />
                    </div>
                  );
                } else {
                  const fieldTarget = `rows.${rowKey}.target`;
                  targetInput = (
                    <TextInput
                      label={null}
                      type={tipeTarget === "numerik" ? "number" : "text"}
                      min={tipeTarget === "numerik" ? 0 : undefined}
                      {...register(fieldTarget)}
                      value={watch(fieldTarget) || ""}
                      onChange={(e) => {
                        setValue(fieldTarget, e.target.value, { shouldValidate: true });
                        markRowActive(rowKey);
                      }}
                      error={get(errors, fieldTarget)?.message}
                    />
                  );
                }

                return (
                  <tr key={target.ID} className="border-t text-center align-top">
                    <td className="px-3 py-3 text-sm">{target.Nama}</td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-4 justify-center">
                        <RadioButton
                          value="minor"
                          text="Minor"
                          {...register(fieldKlasifikasi)}
                          checked={rowValues.klasifikasi === "minor"}
                          onChange={() => {
                            setValue(fieldKlasifikasi, "minor", { shouldValidate: true });
                            markRowActive(rowKey);
                          }}
                        />
                        <RadioButton
                          value="major"
                          text="Major"
                          {...register(fieldKlasifikasi)}
                          checked={rowValues.klasifikasi === "major"}
                          onChange={() => {
                            setValue(fieldKlasifikasi, "major", { shouldValidate: true });
                            markRowActive(rowKey);
                          }}
                        />
                      </div>
                      {isRowActive && errorKlasifikasiMessage && (
                        <p className="text-sm text-red-500 mt-1">{errorKlasifikasiMessage}</p>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <TextInput
                        label={null}
                        {...register(fieldSatuan)}
                        value={watch(fieldSatuan) || ""}
                        onChange={(e) => {
                          setValue(fieldSatuan, e.target.value, { shouldValidate: true });
                          markRowActive(rowKey);
                        }}
                        error={errorSatuanMessage}
                      />
                    </td>

                    <td className="px-3 py-3">{targetInput}</td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-4 justify-center">
                        <RadioButton
                          value="auditor1"
                          text="Auditor1"
                          {...register(fieldPembagianTugas)}
                          checked={rowValues.pembagian_tugas === "auditor1"}
                          onChange={() => {
                            setValue(fieldPembagianTugas, "auditor1", { shouldValidate: true });
                            markRowActive(rowKey);
                          }}
                        />
                        <RadioButton
                          value="auditor2"
                          text="Auditor2"
                          {...register(fieldPembagianTugas)}
                          checked={rowValues.pembagian_tugas === "auditor2"}
                          onChange={() => {
                            setValue(fieldPembagianTugas, "auditor2", { shouldValidate: true });
                            markRowActive(rowKey);
                          }}
                        />
                      </div>
                      {isRowActive && errorPembagianTugasMessage && (
                        <p className="text-sm text-red-500 mt-1">{errorPembagianTugasMessage}</p>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <RowClearAction
                          status={status}
                          onClear={() =>
                            setValue(
                              `rows.${rowKey}`,
                              { enable: false, status: null },
                              { shouldValidate: true, shouldDirty: true }
                            )
                          }
                        />
                        {status && (
                          <RowStatusAction
                            status={status}
                            errorMessage={errorMessage}
                            onShowError={(message) =>
                              openModal({ title: "Pesan error", message })
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
  );
};

export const SubmitButtonWithLoading = ({ groupDatas, watch, loading, ...props }) => {
  const { totalRows, totalLoading } = groupDatas.reduce(
    (acc, gd) => {
      gd.Targets.forEach((target) => {
        const rowKey = `${gd.Type.toUpperCase()} - ${gd.Jenjang.toUpperCase()} - ${target.Nama.toUpperCase()}`;
        acc.totalRows += 1;
        if (watch(`rows.${rowKey}.status`) === "loading") {
          acc.totalLoading += 1;
        }
      });
      return acc;
    },
    { totalRows: 0, totalLoading: 0 }
  );

  return loading.indikator || loading.template || loading.fakultas || totalLoading > 0 ? (
    <Shimmer rows={1} />
  ) : (
    <button
      type="submit"
      className="px-3 py-1 my-3 bg-purple-500 text-sm hover:bg-purple-400 rounded text-white"
      {...props}
    >
      Simpan
    </button>
  );
};