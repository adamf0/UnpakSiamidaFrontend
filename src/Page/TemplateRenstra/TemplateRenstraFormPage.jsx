import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/Providers/ToastProvider";
import { useForm, useWatch } from "react-hook-form";
import SearchSelect from "@/Components/SearchSelect";
import TextInput from "@/Components/TextInput";
import RadioButton from "@/Components/RadioButton";
import { Sparkles } from "lucide-react";
import {
  delay,
  formatFetchError,
  isEmpty,
  isValidationError,
  normalizeValidationMessage,
  throwIfResponseNotOk,
} from "@/Common/Utils";
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
import Tooltip from "@/Components/Tooltip";
import { useContent } from "@/Providers/ContentProvider";
import Navbar from "@/Components/Navbar";
import ChangeLevelModal from "@/Components/ChangeLevelModal";
import { useAuth } from "@/Providers/AuthProvider";

export const buildRowLabel = (gd, target) =>
  `${(gd?.Type || "").toUpperCase()} - ${(gd?.Jenjang || "").toUpperCase()} - ${(target?.Nama || "").toUpperCase()}`;

const TemplateRenstraFormPage = () => {
  const navigate = useNavigate();
  const { tahun, uuidIndikator } = useParams();
  const { addToast } = useToast();
  const mode = !isEmpty(tahun) && !isEmpty(uuidIndikator) ? "edit" : "add";
  const { modal, openModal, closeModal } = useErrorModal();
  const { modalFill, openModalFill, closeModalFill, activeGroupFill } = useAutoFillModalFill();
  const {getValidToken} = useAuth();

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

  const markRowActive = async (rowKey, target, gd) => {
    const row = watch(`rows.${rowKey}`) || {};
    const hasValues = Boolean(
      row.klasifikasi ||
      (row.satuan !== undefined && row.satuan !== null && String(row.satuan).trim() !== "") ||
      row.pembagian_tugas ||
      (row.target !== undefined && row.target !== null && String(row.target).trim() !== "") ||
      (row.target_min !== undefined && row.target_min !== null && String(row.target_min).trim() !== "") ||
      (row.target_max !== undefined && row.target_max !== null && String(row.target_max).trim() !== "")
    );
    setValue(`rows.${rowKey}.enable`, hasValues, { shouldValidate: true });

    if (target?.UUID) {
      setValue(`rows.${rowKey}.targetUuid`, target.UUID);
      setValue(`rows.${rowKey}.targetId`, target.ID);
    }
    if (gd) {
      setValue(`rows.${rowKey}.targetType`, gd.Type);
      setValue(`rows.${rowKey}.targetJenjang`, gd.Jenjang);
    }

    if (hasValues) {
      await trigger([
        `rows.${rowKey}.klasifikasi`,
        `rows.${rowKey}.satuan`,
        `rows.${rowKey}.pembagian_tugas`,
        ...(watch("indikator_renstra")?.TipeTarget === "range"
          ? [`rows.${rowKey}.target_min`, `rows.${rowKey}.target_max`]
          : [`rows.${rowKey}.target`]),
      ]);
    }
  };

  const applyToGroup = (field, value) => {
    if (!activeGroupFill) return;
    activeGroupFill.Targets.forEach((t) => {
      const rowKey = buildRowLabel(activeGroupFill, t);
      setValue(`rows.${rowKey}.${field}`, value, {
        shouldDirty: true,
        shouldValidate: true,
      });
      markRowActive(rowKey, t, activeGroupFill);
    });
  };

  const fetchIndikatorRenstraOptions = async (tahun) => {
    const token = getValidToken();
    if (isEmpty(token)) return;

    setLoad("indikator", true);
    setErr("indikator", null);

    try {
      const res = await fetch(
        `http://localhost:3000/indikatorrenstras?mode=sse&filters=tahun:eq:${tahun}`,
        {
          headers: {
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      await throwIfResponseNotOk(res, "Gagal memuat indikator renstra");
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
      setErr("indikator", formatFetchError(err, "Gagal memuat indikator renstra"));
    } finally {
      setLoad("indikator", false);
    }
  };

  const fetchFakultasUnit = async () => {
    const token = getValidToken();
    if (!token) return;

    setLoad("fakultas", true);
    setErr("fakultas", null);

    try {
      const res = await fetch("http://localhost:3000/fakultasunits?mode=sse", {
        headers: {
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await throwIfResponseNotOk(res, "Gagal memuat fakultas/unit");
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
      setGroupDatas(groupDataAdapter(result));
    } catch (err) {
      console.error(err);
      setErr("fakultas", err.message || "Gagal memuat fakultas");
    } finally {
      setLoad("fakultas", false);
    }
  };

  const fetchTemplateRenstraEdit = async (indikatorUuid) => {
    const token = getValidToken();
    if (!token) return;

    setLoad("template", true);
    setErr("template", null);

    try {
      const res = await fetch(
        `http://localhost:3000/templaterenstras?mode=all&filters=indikatorrenstrauuid:eq:${indikatorUuid}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setErr("template", data.message || "Gagal memuat data");
        return;
      }

      const list = Array.isArray(data) ? data : (data?.data || []);

      if (list.length > 0 && !watch("indikator_renstra")) {
        setValue(
          "indikator_renstra",
          {
            id: list[0].IndikatorRenstraID,
            uuid: list[0].IndikatorRenstraUuid,
            Uuid: list[0].IndikatorRenstraUuid,
            nama: `${list[0].Indikator} (${list[0].Tahun})`,
            Indikator: list[0].Indikator,
            TipeTarget: list[0].TipeTarget,
            Operator: list[0].Operator,
          },
          { shouldDirty: false, shouldValidate: false }
        );
      }

      list.forEach((item) => {
        let foundGd = null;
        let foundTarget = null;

        for (const gd of groupDatas) {
          const t = gd.Targets.find(
            (target) =>
              (item.FakultasUnitID && Number(target.ID) === Number(item.FakultasUnitID)) ||
              (item.FakultasUnitUUID && target.UUID === item.FakultasUnitUUID) ||
              (item.FakultasUnit && target.Nama?.trim().toLowerCase() === item.FakultasUnit?.trim().toLowerCase())
          );
          if (t) {
            foundGd = gd;
            foundTarget = t;
            break;
          }
        }

        if (!foundGd || !foundTarget) {
          const kat = (item.Kategori || "").trim().toLowerCase();
          const [katType = "", katJenjang = ""] = kat.split("#");
          foundGd = groupDatas.find((g) => {
            const gType = (g.Type || "").toLowerCase();
            const gJenjang = (g.Jenjang || "").toLowerCase();
            if (gType !== katType) return false;
            if (katType === "unit" || katType === "fakultas") return true;
            return gJenjang === katJenjang;
          });
          if (foundGd) {
            foundTarget = foundGd.Targets.find(
              (t) =>
                (item.FakultasUnitID && Number(t.ID) === Number(item.FakultasUnitID)) ||
                (item.FakultasUnit && t.Nama?.trim().toLowerCase() === item.FakultasUnit?.trim().toLowerCase())
            );
          }
        }

        if (!foundGd || !foundTarget) {
          console.warn("Target not found for template item:", item);
          return;
        }

        const rowKey = buildRowLabel(foundGd, foundTarget);

        setValue(
          `rows.${rowKey}`,
          {
            enable: true,
            targetUuid: foundTarget.UUID,
            targetId: foundTarget.ID,
            targetType: foundGd.Type,
            targetJenjang: foundGd.Jenjang,
            targetNama: foundTarget.Nama,
            klasifikasi: item.Klasifikasi,
            satuan: item.Satuan || "",
            pembagian_tugas: item.Tugas,
            target: item.Target || "",
            target_min: item.TargetMin || "",
            target_max: item.TargetMax || "",
          },
          { shouldDirty: false, shouldValidate: false }
        );
      });
    } catch (err) {
      console.error(err);
      setErr("template", err.message || "Gagal memuat template");
    } finally {
      setLoad("template", false);
    }
  };

  useEffect(() => {
    fetchFakultasUnit();
  }, []);

  useEffect(() => {
    const indikator = watch("indikator_renstra");
    if (!indikator) return;

    if (
      mode !== "edit" &&
      prevIndikatorRef.current &&
      (prevIndikatorRef.current.Uuid || prevIndikatorRef.current.uuid) !==
        (indikator.Uuid || indikator.uuid)
    ) {
      setValue("rows", {}, { shouldValidate: false });
    }

    prevIndikatorRef.current = indikator;
  }, [watch("indikator_renstra"), mode]);

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
      (i) => i.Uuid === uuidIndikator || i.uuid === uuidIndikator
    );

    if (selected) {
      setValue("indikator_renstra", selected, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [uuidIndikator, indikatorOptions]);

  const onSubmit = async (data) => {
    console.log("kirim");
    const valid = await trigger(); // validate semua field
    if (!valid) {
      addToast("error", "Masih ada data yang belum lengkap");
      return;
    }

    const token = getValidToken();
    if (!token) {
      addToast(
        "error",
        "Sesi login tidak valid atau telah berakhir. Silakan login kembali."
      );
      return;
    }

    const activeEntries = Object.entries(data.rows || {}).filter(
      ([_, row]) => row?.enable
    );

    if (activeEntries.length === 0) {
      addToast(
        "warning",
        "Tidak ada baris data yang diisi atau diaktifkan untuk disimpan"
      );
      return;
    }

    const payloads = activeEntries.map(([key, row]) => {
      let targetAudit = null;
      if (row.targetUuid) {
        targetAudit = fakultasUnits.find(
          (item) => item.UUID === row.targetUuid
        );
      }
      if (!targetAudit && row.targetId) {
        targetAudit = fakultasUnits.find(
          (item) => Number(item.ID) === Number(row.targetId)
        );
      }
      if (!targetAudit) {
        const parts = key.split(" - ");
        const type = parts[0]?.trim().toLowerCase();
        const jenjang = parts[1]?.trim().toLowerCase();
        const nama = parts.slice(2).join(" - ").trim().toLowerCase();
        targetAudit =
          fakultasUnits.find(
            (item) =>
              item.Type?.toLowerCase() === type &&
              (item.Jenjang || "").toLowerCase() === jenjang &&
              item.Nama?.toLowerCase() === nama
          ) ||
          fakultasUnits.find((item) => item.Nama?.toLowerCase() === nama);
      }

      const targetType = (
        targetAudit?.Type ||
        row.targetType ||
        ""
      ).toLowerCase();
      const targetJenjang = (
        targetAudit?.Jenjang ||
        row.targetJenjang ||
        ""
      ).toLowerCase();

      let kategori = "";
      if (targetType === "fakultas") {
        kategori = "fakultas#all";
      } else if (targetType === "unit") {
        kategori = "unit";
      } else if (targetType === "prodi") {
        kategori = `prodi#${targetJenjang}`;
      } else if (targetType) {
        kategori = targetType;
      }

      const fakultasUnit = targetAudit?.UUID || row.targetUuid || "";

      const fd = new FormData();
      fd.append("tahun", data.tahun);
      fd.append(
        "indikator",
        data.indikator_renstra?.Uuid || data.indikator_renstra?.uuid || ""
      );
      fd.append("isPertanyaan", "1");
      fd.append("fakultasUnit", fakultasUnit);
      fd.append("kategori", kategori);
      fd.append("klasifikasi", row.klasifikasi || "");
      fd.append("satuan", row.satuan ?? "");

      const tipeTarget = data.indikator_renstra?.TipeTarget;
      if (tipeTarget === "range") {
        fd.append("target", "");
        fd.append("targetMin", row?.target_min ?? "");
        fd.append("targetMax", row?.target_max ?? "");
      } else {
        fd.append("target", row?.target ?? "");
        fd.append("targetMin", "");
        fd.append("targetMax", "");
      }

      fd.append("tugas", row.pembagian_tugas || "");

      return { key, fd, fakultasUnit };
    });

    const invalidRow = payloads.find((p) => !p.fakultasUnit);
    if (invalidRow) {
      addToast(
        "error",
        `Stakeholder tidak ditemukan untuk baris: ${invalidRow.key}`
      );
      return;
    }

    console.log("SUBMIT:", data, payloads);

    let successCount = 0;
    await Promise.all(
      payloads.map(async ({ key, fd }) => {
        try {
          setValue(`rows.${key}.status`, "loading");

          await delay(100);

          const res = await fetch("http://localhost:3000/templaterenstra", {
            method: "POST",
            body: fd,
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
          successCount++;
          if (successCount >= payloads.length) {
            addToast("success", "Data berhasil disimpan");
            if (mode === "add") {
              navigate(`/template_renstra`);
            }
          }
        } catch (err) {
          console.error(err);
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

      <div className="p-4 pb-16 bg-white w-full">
        <div className="mb-4 flex flex-col gap-4">
          <nav
            className="flex-1 text-sm text-gray-500 mb-1"
            aria-label="Breadcrumb"
          >
            <ol className="list-none p-0 inline-flex">
              <li className="flex items-center">
                <Link to="/template_renstra" className="hover:underline">
                  Template Renstra
                </Link>
                <span className="mx-2">/</span>
              </li>
              <li className="flex items-center text-gray-700 font-medium">
                Form {mode == "edit" ? "Edit" : "Add"}
              </li>
            </ol>
          </nav>

          <h2 className="flex-1 text-lg font-semibold">
            Form {mode == "edit" ? "Edit" : "Add"}
          </h2>
        </div>
        {error.fakultas || error.template ? (
          <ErrorSection />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6 p-6 space-y-4 border rounded-lg w-full">
              <TextInput
                type="number"
                label="Tahun Renstra"
                required
                error={errors.tahun?.message}
                {...register("tahun", { required: "Tahun wajib diisi" })}
              />

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
                loading={loading.indikator}
                loadError={error.indikator}
                onRetry={() =>
                  !isEmpty(watchedTahun) &&
                  fetchIndikatorRenstraOptions(watchedTahun)
                }
                onChange={(item) =>
                  setValue("indikator_renstra", item, {
                    shouldValidate: true,
                  })
                }
              />
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
                  clearErrors={clearErrors}
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
              isSubmitting={isSubmitting}
            />
          </form>
        )}
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
  clearErrors,
  markRowActive,
  errors,
  openModalFill,
  addToast,
  openModal,
}) => {
  return (
    <div
      key={gd.Type + gd.Jenjang}
      className="p-6 border rounded-lg w-full mt-2"
    >
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
          <h2 className="text-sm font-semibold text-gray-800 tracking-wide">
            {gd.Jenjang
              ? `${gd.Type.toUpperCase()} - ${gd.Jenjang.toUpperCase()}`
              : gd.Type.toUpperCase()}
          </h2>
        </div>
        <Tooltip content="Isi otomatis seluruh baris dalam kelompok ini">
          <button
            type="button"
            onClick={() => {
              if (watch("indikator_renstra")) openModalFill(gd);
              else addToast("error", "Pilih dulu indikator");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 border border-purple-200 rounded-lg transition-colors shadow-xs"
            aria-label="Isi otomatis seluruh baris dalam kelompok ini"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Isi Otomatis</span>
          </button>
        </Tooltip>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left w-[140px]">Stakeholder</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-[220px]">Klasifikasi Temuan</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left w-[140px]">Satuan</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left w-[180px]">Target</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-[220px]">Pembagian Tugas</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center w-[90px]">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {watch("indikator_renstra") &&
              gd.Targets.map((target) => {
                const rowKey = buildRowLabel(gd, target);
                const rowValues = watch(`rows.${rowKey}`) || {};
                const isRowActive = rowValues.enable;

                const onRowChange = () => markRowActive(rowKey, target, gd);

                const fieldKlasifikasi = `rows.${rowKey}.klasifikasi`;
                const fieldPembagianTugas = `rows.${rowKey}.pembagian_tugas`;
                const fieldSatuan = `rows.${rowKey}.satuan`;
                const status = watch(`rows.${rowKey}.status`);
                const errorMessage = watch(`rows.${rowKey}.errormessage`);

                const errorKlasifikasiMessage = get(
                  errors,
                  fieldKlasifikasi
                )?.message;
                const errorPembagianTugasMessage = get(
                  errors,
                  fieldPembagianTugas
                )?.message;
                const errorSatuanMessage = get(errors, fieldSatuan)?.message;

                const tipeTarget = watch("indikator_renstra")?.TipeTarget;
                const valKlasifikasi = watch(fieldKlasifikasi);
                const valSatuan = watch(fieldSatuan);
                const valPembagianTugas = watch(fieldPembagianTugas);

                const hasKlasifikasi = Boolean(valKlasifikasi);
                const hasSatuan = Boolean(valSatuan && String(valSatuan).trim() !== "");
                const hasTugas = Boolean(valPembagianTugas);
                const hasTarget = tipeTarget === "range"
                  ? Boolean(
                      (watch(`rows.${rowKey}.target_min`) !== undefined && watch(`rows.${rowKey}.target_min`) !== null && String(watch(`rows.${rowKey}.target_min`)).trim() !== "") ||
                      (watch(`rows.${rowKey}.target_max`) !== undefined && watch(`rows.${rowKey}.target_max`) !== null && String(watch(`rows.${rowKey}.target_max`)).trim() !== "")
                    )
                  : Boolean(
                      watch(`rows.${rowKey}.target`) !== undefined && watch(`rows.${rowKey}.target`) !== null && String(watch(`rows.${rowKey}.target`)).trim() !== ""
                    );

                const isRowEmpty = !hasKlasifikasi && !hasSatuan && !hasTugas && !hasTarget;

                let targetInput;
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
                          setValue(fieldTargetMin, e.target.value, {
                            shouldValidate: true,
                          });
                          onRowChange();
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
                          setValue(fieldTargetMax, e.target.value, {
                            shouldValidate: true,
                          });
                          onRowChange();
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
                        setValue(fieldTarget, e.target.value, {
                          shouldValidate: true,
                        });
                        onRowChange();
                      }}
                      error={get(errors, fieldTarget)?.message}
                    />
                  );
                }

                return (
                  <tr
                    key={target.ID}
                    className="border-t text-center align-top"
                  >
                    <td className="px-3 py-3 text-sm">{target.Nama}</td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-4 justify-center">
                        <RadioButton
                          value="minor"
                          text="Minor"
                          {...register(fieldKlasifikasi)}
                          checked={rowValues.klasifikasi === "minor"}
                          onChange={() => {
                            setValue(fieldKlasifikasi, "minor", {
                              shouldValidate: true,
                            });
                            onRowChange();
                          }}
                        />
                        <RadioButton
                          value="major"
                          text="Major"
                          {...register(fieldKlasifikasi)}
                          checked={rowValues.klasifikasi === "major"}
                          onChange={() => {
                            setValue(fieldKlasifikasi, "major", {
                              shouldValidate: true,
                            });
                            onRowChange();
                          }}
                        />
                        <RadioButton
                          value="observe"
                          text="Observe"
                          {...register(fieldKlasifikasi)}
                          checked={rowValues.klasifikasi === "observe"}
                          onChange={() => {
                            setValue(fieldKlasifikasi, "observe", {
                              shouldValidate: true,
                            });
                            onRowChange();
                          }}
                        />
                      </div>
                      {isRowActive && errorKlasifikasiMessage && (
                        <p className="text-sm text-red-500 mt-1">
                          {errorKlasifikasiMessage}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <TextInput
                        label={null}
                        {...register(fieldSatuan)}
                        value={watch(fieldSatuan) || ""}
                        onChange={(e) => {
                          setValue(fieldSatuan, e.target.value, {
                            shouldValidate: true,
                          });
                          onRowChange();
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
                            setValue(fieldPembagianTugas, "auditor1", {
                              shouldValidate: true,
                            });
                            onRowChange();
                          }}
                        />
                        <RadioButton
                          value="auditor2"
                          text="Auditor2"
                          {...register(fieldPembagianTugas)}
                          checked={rowValues.pembagian_tugas === "auditor2"}
                          onChange={() => {
                            setValue(fieldPembagianTugas, "auditor2", {
                              shouldValidate: true,
                            });
                            onRowChange();
                          }}
                        />
                      </div>
                      {isRowActive && errorPembagianTugasMessage && (
                        <p className="text-sm text-red-500 mt-1">
                          {errorPembagianTugasMessage}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-center align-middle">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <RowClearAction
                          status={status}
                          disabled={isRowEmpty}
                          onClear={() => {
                            setValue(
                              `rows.${rowKey}`,
                              {
                                enable: false,
                                status: null,
                                errormessage: null,
                                targetUuid: target.UUID,
                                targetId: target.ID,
                                targetType: gd.Type,
                                targetJenjang: gd.Jenjang,
                                targetNama: target.Nama,
                                klasifikasi: null,
                                satuan: "",
                                target: "",
                                target_min: "",
                                target_max: "",
                                pembagian_tugas: null,
                              },
                              { shouldValidate: true, shouldDirty: true }
                            );
                            if (typeof clearErrors === "function") {
                              clearErrors(`rows.${rowKey}`);
                            }
                          }}
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

export const SubmitButtonWithLoading = ({
  groupDatas,
  watch,
  loading,
  isSubmitting = false,
  ...props
}) => {
  const { totalRows, totalLoading } = groupDatas.reduce(
    (acc, gd) => {
      gd.Targets.forEach((target) => {
        const rowKey = buildRowLabel(gd, target);
        acc.totalRows += 1;
        if (watch(`rows.${rowKey}.status`) === "loading") {
          acc.totalLoading += 1;
        }
      });
      return acc;
    },
    { totalRows: 0, totalLoading: 0 }
  );

  const isSaving = isSubmitting || totalLoading > 0;
  const isDataLoading = Boolean(loading?.indikator || loading?.template || loading?.fakultas);
  const isLoading = isSaving || isDataLoading;

  return (
    <button
      type="submit"
      disabled={isLoading || props.disabled}
      className={`
        inline-flex items-center justify-center gap-2
        px-3 py-1.5 my-3 text-sm font-medium rounded text-white
        transition-colors shadow-xs
        ${
          isLoading || props.disabled
            ? "bg-purple-400 cursor-not-allowed opacity-90"
            : "bg-purple-500 hover:bg-purple-400 cursor-pointer"
        }
      `}
      {...props}
    >
      {isLoading && (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      <span>{isSaving ? "Menyimpan..." : isDataLoading ? "Memuat..." : "Simpan"}</span>
    </button>
  );
};
