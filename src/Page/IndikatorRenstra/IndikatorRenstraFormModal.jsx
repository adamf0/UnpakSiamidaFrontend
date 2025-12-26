import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextInput from "@/Components/TextInput";
import { useToast } from "@/Providers/ToastProvider";
import SearchSelect from "@/Components/SearchSelect";

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
        tipe_target: "",
        operator: null,
      },
  });

  useEffect(() => {
    if (mode === "edit" && data) {
      const standarSelected = standarOptions.find(item => item.id == data.UuidStandar)
      const indiaktorSelected = indikatorOptions.find(item => item.id == data.UuidParent)

      console.log(standarSelected, indiaktorSelected, data.UuidStandar, data.UuidParent)
      reset({ 
        standar_renstra: standarSelected,
        indikator: data.Indikator,
        parent: indiaktorSelected,
        tahun: data.Tahun,
        tipe_target: data.TipeTarget,
        operator: data.Operator, 
      });
    } else {
      reset({ 
        standar_renstra: null,
        indikator: "",
        parent: null,
        tahun: "",
        tipe_target: "",
        operator: null,
      });
    }
  }, [mode, data]);
  
    const fetchDetail = async () => {
        const res = await fetch(
          `http://localhost:3000/indikatorrenstra/${uuid}`
        );
        const data = await res.json();
        console.log(data)
        
        if (!res.ok) {
          addToast("error", data?.message || "Data tidak ditemukan");
        }
  
        const standarObj =
          standarOptions.find(o => o.UUID === data?.StandarRenstraUuid) ?? null;
  
        const indikatorObj =
          indikatorOptions.find(o => o.UUID === data?.ParentUuid) ?? null;
  
        reset({
          standar_renstra: standarObj,
          indikator: data.Indikator,
          parent: indikatorObj,
          tahun: data.Tahun,
          tipe_target: data.TipeTarget,
          operator: data.Operator,
        });
    };
  
    const fetchStandarRenstraOptions = async () => {
      try {
        const res = await fetch(
          "http://localhost:3000/standarrenstras?mode=sse",
          {
            headers: {
              Accept: "text/event-stream",
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
      }
    };
  
    const fetchIndikatorRenstraOptions = async (tahun) => {
      try {
        const res = await fetch(
          `http://localhost:3000/indikatorrenstras?mode=sse&filters=tahun:eq:${tahun}`,
          {
            headers: {
              Accept: "text/event-stream",
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
  
              result.push({
                id: parsed.UUID,
                nama: `${parsed.Indikator} (${parsed.Tahun})`,
                ...parsed,
              });
            } catch (err) {
              console.error("JSON parse error:", payload);
            }
          }
        }
  
        setIndikatorOptions(result);
      } catch (err) {
        console.error("Fetch Indikator renstra gagal:", err);
      }
    };
  
    useEffect(() => {
      fetchStandarRenstraOptions();
    }, []);
  
    useEffect(() => {
      fetchIndikatorRenstraOptions(watch("tahun"));
    }, [watch("tahun")]);
  
    useEffect(() => {
      if (mode === "new") return;
      if (!data.uuid) return;
      // if (standarOptions.length === 0) return;
      // if (indikatorOptions.length === 0) return;
  
      fetchDetail();
    }, [mode, data, standarOptions, indikatorOptions]);

  const onSubmit = async (form) => {
    console.log("SUBMIT:", form);
    try {
      const fd = new FormData();
      fd.append("standar_renstra", form.standar_renstra?.UUID ?? "");
      fd.append("indikator", form?.indikator ?? "");
      fd.append("parent", form?.parent?.UUID ?? "");
      fd.append("tahun", form?.tahun ?? "");
      fd.append("tipe_target", form?.tipe_target ?? "");
      fd.append("operator", form?.operator ?? "");

      const res = await fetch(
        mode === "edit"
          ? `http://localhost:3000/indikatorrenstra/${data.Uuid}`
          : "http://localhost:3000/indikatorrenstra",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: fd,
        }
      );

      const json = await res.json();

      if (!res.ok) {
        addToast("error", json.message || "Gagal menyimpan");
        return;
      }

      addToast("success", "Berhasil disimpan");
      onSuccess?.();
      onClose();
    } catch {
      addToast("error", "Server tidak dapat dihubungi");
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
            className="h-screen overflow-y-auto"
          >
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <Dialog.Title className="text-lg font-semibold mb-4">
                {mode === "edit" ? "Edit" : "Tambah"} Indikator Renstra
              </Dialog.Title>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <SearchSelect
                  label="Nama Standar Renstra"
                  required
                  options={standarOptions}
                  placeholder="Cari standar renstra"
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
                  {...register("tahun", { required: "Tahun wajib diisi", })}
                />

                <TextInput
                  label="Tipe Target"
                  required
                  error={errors.tipe_target?.message}
                  {...register("tipe_target", { required: "Tipe Target wajib diisi", })}
                />

                <TextInput
                  label="Operator"
                  error={errors.operator?.message}
                  {...register("operator", { required: false, })}
                />

                <SearchSelect
                  label="Parent Renstra"
                  options={indikatorOptions}
                  placeholder="Cari indikator renstra"
                  value={watch("parent")}
                  onChange={(item) => setValue("parent", item, {
                      shouldValidate: true,
                    })}
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
