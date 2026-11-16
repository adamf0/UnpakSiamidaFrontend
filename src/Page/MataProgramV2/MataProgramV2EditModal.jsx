import React, { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import SearchSelect from "@/Components/SearchSelect";
import { useToast } from "@/Providers/ToastProvider";
import { apiClient } from "@/Common/api";
import { fetchFakultasUnits } from "@/Common/Utils";
import { Layers, X, Plus, AlertCircle } from "lucide-react";

export default function MataProgramV2EditModal({
  open,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const [tahunOptions, setTahunOptions] = useState([]);
  const [loadingTahun, setLoadingTahun] = useState(false);
  const [unitOptions, setUnitOptions] = useState([]);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [unitToAdd, setUnitToAdd] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      tahun: null,
      mataprogram: "",
    },
  });

  const fetchTahunOptions = async () => {
    setLoadingTahun(true);
    try {
      const res = await apiClient.get("/tahunprokers?mode=all");
      const json = res.data;
      const mapped = (Array.isArray(json) ? json : []).map((item) => ({
        id: item.UUID,
        UUID: item.UUID,
        nama: item.Tahun,
        Tahun: item.Tahun,
        ...item,
      }));
      setTahunOptions(mapped);
    } catch (err) {
      console.error("Fetch tahun gagal:", err);
    } finally {
      setLoadingTahun(false);
    }
  };

  const fetchUnitOptions = async () => {
    setLoadingUnit(true);
    try {
      const opts = await fetchFakultasUnits();
      setUnitOptions(opts || []);
    } catch (err) {
      console.error("Fetch unit gagal:", err);
    } finally {
      setLoadingUnit(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTahunOptions();
      fetchUnitOptions();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !data) return;

    const tObj =
      tahunOptions.find(
        (t) =>
          String(t.Tahun || t.nama) === String(data.Tahun) ||
          t.UUID === data.TahunUUID
      ) || (data.Tahun ? { id: data.TahunUUID || data.Tahun, nama: data.Tahun, Tahun: data.Tahun } : null);

    reset({
      tahun: tObj,
      mataprogram: data.MataProgram || data.mata_program || data.nama || "",
    });

    // Populate units from grouped row
    if (Array.isArray(data.Units)) {
      setSelectedUnits(data.Units);
    } else if (data.FakultasUnitId || data.FakultasUnit) {
      setSelectedUnits([
        {
          Id: data.Id,
          UUID: data.UUID,
          FakultasUnitId: data.FakultasUnitId,
          FakultasUnit: data.FakultasUnit,
          Type: data.Type,
          ProkerCount: data.ProkerCount || 0,
        },
      ]);
    } else {
      setSelectedUnits([]);
    }
    setUnitToAdd(null);
  }, [open, data, tahunOptions, reset]);

  const handleAddUnit = (u) => {
    if (!u) return;
    const targetId = u.rawId || u.id_numeric || u.ID || u.id;
    const exists = selectedUnits.some(
      (item) =>
        String(item.FakultasUnitId || item.rawId || item.id || item.Id) ===
        String(targetId)
    );
    if (exists) {
      addToast("warning", "Unit ini sudah ada di dalam daftar program kerja");
      return;
    }

    setSelectedUnits((prev) => [
      ...prev,
      {
        Id: null,
        UUID: null,
        FakultasUnitId: targetId,
        FakultasUnitUuid: u.UUID || u.uuid,
        FakultasUnit: u.nama || u.label || u.Nama,
        Type: u.type || u.Type || "unit",
        Jenjang: u.jenjang || u.Jenjang || "",
        ProkerCount: 0,
      },
    ]);
    setUnitToAdd(null);
  };

  const handleRemoveUnit = (idxToRemove) => {
    const item = selectedUnits[idxToRemove];
    if (item && item.ProkerCount > 0) {
      addToast(
        "warning",
        `Tidak dapat menghapus unit ini karena sudah terhubung ke ${item.ProkerCount} Matrix Proker`
      );
      return;
    }
    setSelectedUnits((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const onSubmit = async (form) => {
    if (!data?.UUID && !data?.uuid) return;
    if (selectedUnits.length === 0) {
      addToast("warning", "Minimal satu Fakultas / Prodi / Unit sasaran wajib dipilih");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("mata_program", form.mataprogram?.trim() || "");
      if (form.tahun) {
        fd.append("tahun", form.tahun.Tahun || form.tahun.nama || form.tahun.id || "");
      }

      // Append all units
      selectedUnits.forEach((u) => {
        const uId = u.FakultasUnitId || u.rawId || u.id_numeric || u.id || u.Id;
        if (uId) {
          fd.append("targets[]", String(uId));
        }
      });

      await apiClient.put(`/mataprogramv2/${data.UUID || data.uuid}?scope=group`, fd);
      addToast("success", "Berhasil memperbarui data Mata Program (soft delete tersinkronisasi)");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Update gagal:", err);
      addToast("error", err?.message || "Gagal memperbarui data");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-150"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-150 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-bold text-gray-900">
                      Edit Mata Program
                    </Dialog.Title>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Kelola kelompok master mata program kerja dan unit sasaran
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-5">
                    <SearchSelect
                      label="Tahun Periode"
                      required
                      options={tahunOptions}
                      placeholder="Pilih tahun"
                      loading={loadingTahun}
                      value={watch("tahun")}
                      error={errors.tahun?.message}
                      onChange={(item) => setValue("tahun", item, { shouldValidate: true })}
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <TextInput
                      label="Nama Program Kerja"
                      required
                      placeholder="Masukkan nama mata program"
                      error={errors.mataprogram?.message}
                      {...register("mataprogram", {
                        required: "Nama Program Kerja wajib diisi",
                      })}
                    />
                  </div>
                </div>

                {/* Assigned Units Badges Section */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700">
                      Fakultas / Prodi / Unit Sasaran ({selectedUnits.length} Unit)
                    </label>
                  </div>

                  {selectedUnits.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                      Belum ada unit yang dipilih. Silakan tambahkan unit sasaran di bawah.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-gray-50/80 border border-gray-200 max-h-48 overflow-y-auto">
                      {selectedUnits.map((u, idx) => {
                        const rawType = String(u.Type || "").toLowerCase().trim();
                        let badgeBg = "bg-purple-50 text-purple-700 border-purple-200";
                        if (rawType === "fakultas") {
                          badgeBg = "bg-indigo-50 text-indigo-700 border-indigo-200";
                        } else if (rawType === "unit" || rawType.includes("lembaga")) {
                          badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        }

                        const hasProker = (u.ProkerCount || 0) > 0;

                        return (
                          <span
                            key={u.UUID || u.Id || idx}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-2xs ${badgeBg}`}
                          >
                            <span>{u.FakultasUnit}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${
                                hasProker
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-gray-100 text-gray-500 border-gray-200"
                              }`}
                            >
                              {u.ProkerCount || 0} proker
                            </span>
                            <button
                              type="button"
                              disabled={hasProker}
                              title={
                                hasProker
                                  ? `Tidak dapat dihapus: terhubung ke ${u.ProkerCount} matrix proker`
                                  : "Hapus unit dari program ini"
                              }
                              onClick={() => handleRemoveUnit(idx)}
                              className={`p-0.5 rounded transition ${
                                hasProker
                                  ? "opacity-30 cursor-not-allowed text-gray-400"
                                  : "hover:bg-rose-100 hover:text-rose-700 text-gray-400 cursor-pointer"
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Unit Dropdown */}
                  <div className="pt-2">
                    <SearchSelect
                      label="Tambah Unit Sasaran Lainnya"
                      options={unitOptions}
                      placeholder="Ketik untuk mencari dan menambah unit..."
                      loading={loadingUnit}
                      value={unitToAdd}
                      onChange={(item) => {
                        handleAddUnit(item);
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2.5 pt-4 border-t border-gray-100 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
