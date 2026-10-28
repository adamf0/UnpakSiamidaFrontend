import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import { useToast } from "@/Providers/ToastProvider";
import SearchSelect from "@/Components/SearchSelect";
import { useAuth } from "@/Providers/AuthProvider";
import {
  isEmpty,
  throwIfResponseNotOk,
  formatFetchError,
} from "@/Common/Utils";
import { apiClient, API_BASE_URL } from "@/Common/api";

const TIPE_TARGET_OPTIONS = [
  { id: "numerik", value: "numerik", label: "Numerik" },
  { id: "range", value: "range", label: "Range" },
  { id: "kategori", value: "kategori", label: "Kategori" },
];

export default function IndikatorRenstraFormModal({
  open,
  mode,
  data,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();
  const [standarOptions, setStandarOptions] = useState([]);
  const [indikatorOptions, setIndikatorOptions] = useState([]);
  const [loadingStandar, setLoadingStandar] = useState(false);
  const [errorStandar, setErrorStandar] = useState(null);
  const [loadingIndikator, setLoadingIndikator] = useState(false);
  const [errorIndikator, setErrorIndikator] = useState(null);
  const { getValidToken } = useAuth();
  const abortIndikatorRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      standar_renstra: null,
      indikator: "",
      parent: null,
      tahun: "",
      tipe_target: null,
      operator: null,
    },
  });

  useEffect(() => {
    if (!open) {
      abortIndikatorRef.current?.abort();
      return;
    }

    if (mode === "edit" && data) {
      const standarSelected = standarOptions.find(
        (item) =>
          item.id === data.UuidStandar ||
          item.UUID === data.UuidStandar ||
          item.Uuid === data.UuidStandar
      );

      const targetSelected =
        TIPE_TARGET_OPTIONS.find(
          (item) =>
            item.id.toLowerCase() ===
              String(data.TipeTarget || "").toLowerCase().trim() ||
            item.label.toLowerCase() ===
              String(data.TipeTarget || "").toLowerCase().trim()
        ) || (data.TipeTarget ? { id: data.TipeTarget, label: data.TipeTarget } : null);

      reset({
        standar_renstra: standarSelected || null,
        indikator: data.Indikator || "",
        parent: null,
        tahun: data.Tahun ? String(data.Tahun) : "",
        tipe_target: targetSelected,
        operator: data.Operator || null,
      });

      if (data.Tahun) {
        fetchIndikatorRenstraOptions(String(data.Tahun).trim());
      }
    } else {
      reset({
        standar_renstra: null,
        indikator: "",
        parent: null,
        tahun: "",
        tipe_target: null,
        operator: null,
      });
      setIndikatorOptions([]);
    }
  }, [open, mode, data]);

  useEffect(() => {
    if (mode === "edit" && data?.UuidStandar && standarOptions.length > 0) {
      const foundStandar = standarOptions.find(
        (item) =>
          item.id === data.UuidStandar ||
          item.UUID === data.UuidStandar ||
          item.Uuid === data.UuidStandar
      );
      if (foundStandar) {
        setValue("standar_renstra", foundStandar);
      }
    }
  }, [standarOptions, mode, data]);

  useEffect(() => {
    if (mode === "edit" && data?.UuidParent && indikatorOptions.length > 0) {
      const foundParent = indikatorOptions.find(
        (item) =>
          item.id === data.UuidParent ||
          item.Uuid === data.UuidParent ||
          item.UUID === data.UuidParent ||
          item.uuid === data.UuidParent
      );
      if (foundParent) {
        setValue("parent", foundParent);
      }
    }
  }, [indikatorOptions, mode, data]);

  const fetchStandarRenstraOptions = async () => {
    if(isEmpty(getValidToken())) return;

    setLoadingStandar(true);
    setErrorStandar(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/standarrenstras?mode=sse`,
        {
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${getValidToken()}`
          },
        }
      );

      await throwIfResponseNotOk(res, "Gagal memuat standar renstra");

      if (!res.body) {
        throw new Error("[BE Golang] SSE not supported");
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

            result.push({
              id: parsed.UUID,
              nama: parsed.Nama,
              ...parsed,
            });
          } catch (err) {
            console.error("JSON parse error:", payload);
          }
        }
      }

      setStandarOptions(result);
    } catch (err) {
      console.error("Fetch standar renstra gagal:", err);
      setErrorStandar(formatFetchError(err, "Gagal memuat standar renstra"));
    } finally {
      setLoadingStandar(false);
    }
  };

  const fetchIndikatorRenstraOptions = async (targetTahun) => {
    if (isEmpty(getValidToken()) || !targetTahun) return;

    abortIndikatorRef.current?.abort();
    const controller = new AbortController();
    abortIndikatorRef.current = controller;

    setLoadingIndikator(true);
    setErrorIndikator(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/indikatorrenstras?mode=sse&filters=tahun:eq:${targetTahun}`,
        {
          signal: controller.signal,
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${getValidToken()}`,
          },
        }
      );

      await throwIfResponseNotOk(res, "Gagal memuat indikator renstra");

      if (!res.body) {
        throw new Error("[BE Golang] SSE not supported");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";
      const result = [];

      const processEvent = (eventStr) => {
        if (!eventStr.startsWith("data:")) return;
        const payload = eventStr.replace(/^data:\s*/, "").trim();
        if (!payload || payload === "start" || payload === "done") return;
        try {
          const parsed = JSON.parse(payload);
          const itemUuid = parsed.Uuid ?? parsed.UUID ?? parsed.uuid;
          const itemId = parsed.Id ?? parsed.id ?? itemUuid;
          const indikatorName = parsed.Indikator ?? parsed.indikator ?? "";
          const tahunVal = parsed.Tahun ?? parsed.tahun ?? targetTahun;

          // Jangan tampilkan item sendiri sebagai parent jika mode edit
          if (
            mode === "edit" &&
            data?.Uuid &&
            (itemUuid === data.Uuid || String(itemId) === String(data.Uuid))
          ) {
            return;
          }

          result.push({
            id: itemUuid || itemId,
            uuid: itemUuid,
            UUID: itemUuid,
            Uuid: itemUuid,
            Id: itemId,
            nama: indikatorName
              ? `${indikatorName} (${tahunVal})`
              : `Indikator ${itemId}`,
            ...parsed,
          });
        } catch (err) {
          console.error("JSON parse error:", payload);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let index;
        while ((index = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 2);
          processEvent(event);
        }
      }

      if (buffer.trim()) {
        const lines = buffer.split("\n");
        for (const line of lines) {
          processEvent(line.trim());
        }
      }

      setIndikatorOptions(result);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Fetch Indikator renstra gagal:", err);
        setErrorIndikator(
          formatFetchError(err, "Gagal memuat indikator renstra")
        );
      }
    } finally {
      setLoadingIndikator(false);
    }
  };

  useEffect(() => {
    fetchStandarRenstraOptions();
  }, []);

  const tahun = watch("tahun");

  useEffect(() => {
    const rawTahun = String(tahun || "").trim();
    if (!rawTahun || rawTahun.length < 4) {
      setIndikatorOptions([]);
      setLoadingIndikator(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchIndikatorRenstraOptions(rawTahun);
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [tahun]);

  const onSubmit = async (form) => {
    console.log("SUBMIT:", form);
    try {
      const fd = new FormData();
      const standarUuid =
        form.standar_renstra?.UUID ??
        form.standar_renstra?.Uuid ??
        form.standar_renstra?.uuid ??
        form.standar_renstra?.id ??
        "";
      const parentUuid =
        form.parent?.Uuid ??
        form.parent?.UUID ??
        form.parent?.uuid ??
        form.parent?.id ??
        "";

      const rawTipeTarget =
        form.tipe_target?.value ??
        form.tipe_target?.id ??
        (typeof form.tipe_target === "string" ? form.tipe_target : "");

      fd.append("standar_renstra", standarUuid);
      fd.append("indikator", form?.indikator ?? "");
      fd.append("parent", parentUuid);
      fd.append("tahun", form?.tahun ?? "");
      fd.append("tipe_target", rawTipeTarget);
      fd.append("operator", form?.operator ?? "");

      if (mode === "edit") {
        await apiClient.put(
          `/indikatorrenstra/${data?.Uuid ?? data?.uuid ?? data?.id}`,
          fd
        );
      } else {
        await apiClient.post("/indikatorrenstra", fd);
      }

      addToast("success", "Berhasil disimpan");
      onSuccess?.();
      onClose();
    } catch (err) {
      addToast("error", err?.message || "Server tidak dapat dihubungi");
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
          <div className="fixed inset-0 bg-black/40" />
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
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold mb-4">
                {mode === "edit" ? "Edit" : "Tambah"} Indikator Renstra
              </Dialog.Title>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <SearchSelect
                  label="Nama Standar Renstra"
                  required
                  options={standarOptions}
                  placeholder="Cari standar renstra"
                  loading={loadingStandar}
                  loadError={errorStandar}
                  onRetry={fetchStandarRenstraOptions}
                  value={watch("standar_renstra")}
                  error={errors.standar_renstra?.message}
                  onChange={(item) =>
                    setValue("standar_renstra", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("standar_renstra", {
                    required: "Standar renstra wajib dipilih",
                  })}
                />

                <TextInput
                  label="Nama Indikator Renstra"
                  required
                  error={errors.indikator?.message}
                  {...register("indikator", {
                    required: "Indikator Renstra wajib diisi",
                  })}
                />

                <TextInput
                  type="number"
                  label="Tahun Renstra"
                  min="0"
                  required
                  error={errors.tahun?.message}
                  {...register("tahun", {
                    required: "Tahun wajib diisi",
                    onChange: (e) => {
                      const val = e.target.value;
                      if (!val || String(val).trim().length < 4) {
                        setValue("parent", null);
                      }
                    },
                  })}
                />

                <SearchSelect
                  label="Tipe Target"
                  required
                  options={TIPE_TARGET_OPTIONS}
                  placeholder="Pilih tipe target"
                  value={watch("tipe_target")}
                  error={errors.tipe_target?.message}
                  onChange={(item) =>
                    setValue("tipe_target", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <input
                  type="hidden"
                  {...register("tipe_target", {
                    required: "Tipe Target wajib diisi",
                  })}
                />

                <TextInput //[pr] ini seharusnya select option
                  label="Operator"
                  error={errors.operator?.message}
                  {...register("operator", { required: false })}
                />

                <SearchSelect
                  label="Parent Renstra"
                  options={indikatorOptions}
                  placeholder={
                    tahun && String(tahun).trim().length >= 4
                      ? "Cari indikator renstra"
                      : "Isi tahun renstra terlebih dahulu"
                  }
                  loading={loadingIndikator}
                  loadError={errorIndikator}
                  disabled={!tahun || String(tahun).trim().length < 4}
                  onRetry={() => {
                    const rawT = String(tahun || "").trim();
                    if (rawT.length >= 4) {
                      fetchIndikatorRenstraOptions(rawT);
                    }
                  }}
                  value={watch("parent")}
                  onChange={(item) =>
                    setValue("parent", item, {
                      shouldValidate: true,
                    })
                  }
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded text-red-600"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="px-3 py-2 bg-purple-600 text-white rounded"
                  >
                    Simpan
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
